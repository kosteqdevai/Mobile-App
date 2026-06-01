import { useMemo, useState, type Dispatch, type SetStateAction } from "react";

import { EmptyView, ErrorView, LoadingView } from "../../../core/presentation/StateViews";
import type {
  RecipePackExport,
  RecipePackPreview,
  RecipePackUseCases,
} from "../application/recipePackUseCases";
import {
  initialRecipeTransferScreenState,
  type RecipeTransferScreenState,
} from "./RecipeTransferState";

type RecipeTransferScreenProps = {
  recipePackUseCases: RecipePackUseCases;
  onImported: () => void;
  transferState?: RecipeTransferScreenState;
  onTransferStateChange?: Dispatch<SetStateAction<RecipeTransferScreenState>>;
};

export function RecipeTransferScreen({
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

  function updateState(nextState: Partial<RecipeTransferScreenState>) {
    setState((currentState) => ({
      ...currentState,
      ...nextState,
    }));
  }

  async function exportPack() {
    updateState({ exportState: { status: "loading" } });
    const result = await recipePackUseCases.exportRecipePack();

    if (!result.ok) {
      updateState({ exportState: { status: "error", message: result.error.message } });
      return;
    }

    updateState({ exportState: { status: "ready", pack: result.value } });
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
    if (!navigator.clipboard) {
      updateState({ promptCopyMessage: "Prompt is ready below." });
      return;
    }

    await navigator.clipboard.writeText(aiPrompt);
    updateState({ promptCopyMessage: "Prompt copied." });
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
              <p className="muted-text">Creates a private LaCucina backup file.</p>
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
                  onClick={() => {
                    if (state.exportState.status === "ready") {
                      downloadRecipePack(state.exportState.pack);
                    }
                  }}
                >
                  Download file
                </button>
              </div>
              <label>
                <span>Backup JSON</span>
                <textarea
                  readOnly
                  aria-label="Exported recipe pack JSON"
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
            <textarea readOnly aria-label="AI recipe pack prompt" value={aiPrompt} />
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

function downloadRecipePack(pack: RecipePackExport) {
  const blob = new Blob([pack.json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = pack.fileName;
  link.click();
  URL.revokeObjectURL(url);
}
