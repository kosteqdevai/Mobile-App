import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";

import { EmptyView, ErrorView, LoadingView } from "../../../core/presentation/StateViews";
import type { RecipePackFileUseCases } from "../application/recipePackFileUseCases";
import type { RecipePackPreview, RecipePackUseCases } from "../application/recipePackUseCases";
import {
  initialRecipeTransferScreenState,
  type RecipeTransferScreenState,
} from "./RecipeTransferState";

type RecipeTransferScreenProps = {
  recipePackFileUseCases?: RecipePackFileUseCases;
  recipePackUseCases: RecipePackUseCases;
  onImported: () => void;
  transferState?: RecipeTransferScreenState;
  onTransferStateChange?: Dispatch<SetStateAction<RecipeTransferScreenState>>;
};

export function RecipeTransferScreen({
  recipePackFileUseCases,
  recipePackUseCases,
  onImported,
  transferState,
  onTransferStateChange,
}: RecipeTransferScreenProps) {
  const [internalState, setInternalState] = useState<RecipeTransferScreenState>(
    initialRecipeTransferScreenState,
  );
  const state = transferState ?? internalState;
  const setState = onTransferStateChange ?? setInternalState;
  const aiPrompt = useMemo(() => recipePackUseCases.getAiPromptTemplate(), [recipePackUseCases]);
  const aiPromptTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const exportJsonTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const [exportDownloadUrl, setExportDownloadUrl] = useState<string | null>(null);
  const exportDownloadUrlRef = useRef<string | null>(null);
  const [exportDownloadMessage, setExportDownloadMessage] = useState("");

  useEffect(() => {
    return () => {
      revokeRecipePackDownloadUrl(exportDownloadUrlRef.current);
    };
  }, []);

  function updateState(nextState: Partial<RecipeTransferScreenState>) {
    setState((currentState) => ({
      ...currentState,
      ...nextState,
    }));
  }

  function replaceExportDownloadUrl(nextUrl: string | null) {
    revokeRecipePackDownloadUrl(exportDownloadUrlRef.current);
    exportDownloadUrlRef.current = nextUrl;
    setExportDownloadUrl(nextUrl);
  }

  async function exportPack() {
    replaceExportDownloadUrl(null);
    setExportDownloadMessage("");
    updateState({ exportState: { status: "loading" } });
    const result = await recipePackUseCases.exportRecipePack();

    if (!result.ok) {
      updateState({ exportState: { status: "error", message: result.error.message } });
      return;
    }

    replaceExportDownloadUrl(createRecipePackDownloadUrl(result.value.json));
    updateState({ exportState: { status: "ready", pack: result.value } });
  }

  async function downloadExportPack() {
    if (state.exportState.status !== "ready") {
      return;
    }

    setExportDownloadMessage("");
    const pack = state.exportState.pack;

    if (!recipePackFileUseCases) {
      exportJsonTextAreaRef.current?.focus();
      exportJsonTextAreaRef.current?.select();
      setExportDownloadMessage("Backup download is unavailable here. Backup JSON selected below.");
      return;
    }

    const result = await recipePackFileUseCases.saveRecipePackFile({
      pack,
      downloadUrl: exportDownloadUrl ?? createRecipePackDataUrl(pack.json),
    });

    if (result.ok) {
      setExportDownloadMessage(result.value.message);
      return;
    }

    exportJsonTextAreaRef.current?.focus();
    exportJsonTextAreaRef.current?.select();
    setExportDownloadMessage(`${result.error.message} Backup JSON selected below.`);
  }

  function previewPack() {
    const result = recipePackUseCases.previewRecipePack(state.packText);

    if (!result.ok) {
      updateState({
        previewState: { status: "error", message: result.error.message },
        importState: { status: "idle" },
      });
      return;
    }

    updateState({
      previewState: { status: "ready", preview: result.value },
      importState: { status: "idle" },
    });
  }

  async function importPack() {
    updateState({ importState: { status: "loading" } });
    const result = await recipePackUseCases.importRecipePack(state.packText);

    if (!result.ok) {
      updateState({ importState: { status: "error", message: result.error.message } });
      return;
    }

    updateState({
      importState: {
        status: "ready",
        message: `Imported ${result.value.importedCount} recipes. Skipped ${result.value.skippedCount}.`,
      },
    });
    onImported();
  }

  async function readSelectedFile(file: File | undefined) {
    if (!file) {
      return;
    }

    const text = await file.text();
    updateState({
      packText: text,
      previewState: { status: "idle" },
      importState: { status: "idle" },
    });
  }

  async function copyAiPrompt() {
    const copied = await copyTextToClipboard(aiPrompt);

    if (copied) {
      updateState({ promptCopyMessage: "Prompt copied." });
      return;
    }

    aiPromptTextAreaRef.current?.focus();
    aiPromptTextAreaRef.current?.select();
    updateState({ promptCopyMessage: "Prompt selected below. Copy it manually." });
  }

  return (
    <section className="screen-stack" aria-labelledby="recipe-transfer-title">
      <div className="screen-header">
        <div>
          <p className="section-kicker">Private data</p>
          <h2 id="recipe-transfer-title">Backup</h2>
        </div>
      </div>

      <div className="planner-mode-tabs" role="tablist" aria-label="Backup sections">
        <button
          type="button"
          role="tab"
          aria-selected={state.activeTab === "import"}
          onClick={() => updateState({ activeTab: "import" })}
        >
          Import
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={state.activeTab === "export"}
          onClick={() => updateState({ activeTab: "export" })}
        >
          Export
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={state.activeTab === "ai"}
          onClick={() => updateState({ activeTab: "ai" })}
        >
          AI template
        </button>
      </div>

      {state.activeTab === "export" ? (
        <section className="collection-editor" aria-labelledby="export-pack-title">
          <div className="collection-editor__header">
            <div>
              <h3 id="export-pack-title">Export recipe pack</h3>
              <p className="muted-text">Creates a private Comero backup file.</p>
            </div>
            <button className="primary-button" type="button" onClick={exportPack}>
              Export
            </button>
          </div>

          {state.exportState.status === "loading" ? (
            <LoadingView title="Exporting recipes" />
          ) : null}
          {state.exportState.status === "error" ? (
            <ErrorView title="Export failed" message={state.exportState.message} />
          ) : null}
          {state.exportState.status === "ready" ? (
            <div className="collection-row">
              <p className="state-view__title">
                {state.exportState.pack.recipeCount} recipes ready in{" "}
                {state.exportState.pack.fileName}
              </p>
              <div className="action-row">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => void downloadExportPack()}
                >
                  Download file
                </button>
              </div>
              {exportDownloadMessage ? (
                <div className="state-view" role="status">
                  <p className="state-view__title">{exportDownloadMessage}</p>
                </div>
              ) : null}
              <label>
                <span>Backup JSON</span>
                <textarea
                  readOnly
                  aria-label="Exported recipe pack JSON"
                  ref={exportJsonTextAreaRef}
                  value={state.exportState.pack.json}
                />
              </label>
            </div>
          ) : null}
        </section>
      ) : null}

      {state.activeTab === "import" ? (
        <section className="collection-editor" aria-labelledby="import-pack-title">
          <div className="collection-editor__header">
            <div>
              <h3 id="import-pack-title">Import recipe pack</h3>
              <p className="muted-text">
                First preview the file. Then import valid recipes as new private copies.
              </p>
            </div>
          </div>

          <label>
            <span>Choose JSON file</span>
            <input
              accept="application/json,.json"
              aria-label="Choose recipe pack JSON file"
              type="file"
              onChange={(event) => void readSelectedFile(event.currentTarget.files?.[0])}
            />
          </label>

          <label>
            <span>Paste JSON</span>
            <textarea
              aria-label="Recipe pack JSON"
              value={state.packText}
              onChange={(event) => {
                updateState({
                  packText: event.target.value,
                  previewState: { status: "idle" },
                  importState: { status: "idle" },
                });
              }}
              placeholder='{"format":"lacucina.recipe-pack","version":1,"recipes":[]}'
            />
          </label>

          <div className="action-row">
            {state.previewState.status === "ready" &&
            state.previewState.preview.validRecipes.length > 0 ? (
              <>
                <button className="primary-button" type="button" onClick={() => void importPack()}>
                  Import valid recipes
                </button>
                <button className="secondary-button" type="button" onClick={previewPack}>
                  Preview again
                </button>
              </>
            ) : (
              <button className="primary-button" type="button" onClick={previewPack}>
                Preview import
              </button>
            )}
          </div>

          {state.previewState.status === "idle" ? (
            <EmptyView title="No preview yet" message="Paste or choose a recipe pack." />
          ) : null}
          {state.previewState.status === "error" ? (
            <ErrorView title="Import preview failed" message={state.previewState.message} />
          ) : null}
          {state.previewState.status === "ready" ? (
            <ImportPreview preview={state.previewState.preview} />
          ) : null}

          {state.importState.status === "loading" ? (
            <LoadingView title="Importing recipes" />
          ) : null}
          {state.importState.status === "error" ? (
            <ErrorView title="Import failed" message={state.importState.message} />
          ) : null}
          {state.importState.status === "ready" ? (
            <div className="state-view" role="status">
              <p className="state-view__title">{state.importState.message}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {state.activeTab === "ai" ? (
        <section className="collection-editor" aria-labelledby="ai-prompt-title">
          <div className="collection-editor__header">
            <div>
              <h3 id="ai-prompt-title">AI bulk template</h3>
              <p className="muted-text">Use this with ChatGPT or another assistant.</p>
            </div>
            <button className="secondary-button" type="button" onClick={() => void copyAiPrompt()}>
              Copy prompt
            </button>
          </div>
          {state.promptCopyMessage ? (
            <div className="state-view" role="status">
              <p className="state-view__title">{state.promptCopyMessage}</p>
            </div>
          ) : null}
          <label>
            <span>Prompt</span>
            <textarea
              readOnly
              aria-label="AI recipe pack prompt"
              ref={aiPromptTextAreaRef}
              value={aiPrompt}
            />
          </label>
        </section>
      ) : null}
    </section>
  );
}

function ImportPreview({ preview }: { preview: RecipePackPreview }) {
  return (
    <div className="collection-row">
      <p className="state-view__title">
        {preview.validRecipes.length} valid, {preview.invalidRecipes.length} invalid,{" "}
        {preview.totalCount} total.
      </p>
      {preview.validRecipes.some((recipe) => recipe.notices.length > 0) ? (
        <p className="muted-text">
          {preview.validRecipes.reduce((count, recipe) => count + recipe.notices.length, 0)} import
          cleanup notes were applied.
        </p>
      ) : null}

      {preview.validRecipes.length > 0 ? (
        <div>
          <h3>Ready to import</h3>
          <ul className="compact-list" aria-label="Valid recipes">
            {preview.validRecipes.map((recipe) => (
              <li key={`${recipe.index}-${recipe.title}`}>
                <span>{recipe.title}</span>
                {recipe.notices.length > 0 ? (
                  <span className="muted-text">{recipe.notices.join(" ")}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {preview.invalidRecipes.length > 0 ? (
        <div>
          <h3>Needs fixing</h3>
          <ul className="compact-list" aria-label="Invalid recipes">
            {preview.invalidRecipes.map((recipe) => (
              <li key={`${recipe.index}-${recipe.title}`}>
                <span>
                  {recipe.title}: {recipe.errors.join("; ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Some mobile webviews expose Clipboard API but reject writes without a clear permission UI.
    }
  }

  return copyTextWithLegacySelection(text);
}

function copyTextWithLegacySelection(text: string) {
  const textArea = document.createElement("textarea");
  const activeElement =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;

  textArea.value = text;
  textArea.readOnly = true;
  textArea.style.position = "fixed";
  textArea.style.insetBlockStart = "0";
  textArea.style.insetInlineStart = "-9999px";

  try {
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textArea.remove();
    activeElement?.focus();
  }
}

function createRecipePackDownloadUrl(json: string) {
  if (typeof URL.createObjectURL === "function") {
    const blob = new Blob([json], { type: "application/json" });
    return URL.createObjectURL(blob);
  }

  return createRecipePackDataUrl(json);
}

function createRecipePackDataUrl(json: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;
}

function revokeRecipePackDownloadUrl(url: string | null) {
  if (url?.startsWith("blob:") && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(url);
  }
}
