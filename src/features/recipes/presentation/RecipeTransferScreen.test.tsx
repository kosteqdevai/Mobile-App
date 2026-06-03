import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { err, ok } from "../../../core/result/Result";
import type { RecipePackFileUseCases } from "../application/recipePackFileUseCases";
import type { RecipePackUseCases } from "../application/recipePackUseCases";
import { RecipeTransferScreen } from "./RecipeTransferScreen";
import { initialRecipeTransferScreenState } from "./RecipeTransferState";

const sampleJson = JSON.stringify({
  format: "lacucina.recipe-pack",
  version: 1,
  recipes: [
    {
      title: "Imported soup",
      baseServings: 2,
      ingredients: [{ name: "Stock", quantity: 500, unit: "ml" }],
      steps: ["Simmer."],
    },
  ],
});

function createRecipePackUseCases(overrides: Partial<RecipePackUseCases> = {}): RecipePackUseCases {
  return {
    exportRecipePack: vi.fn(async () =>
      ok({
        fileName: "comero-recipes-2026-05-24.json",
        json: sampleJson,
        recipeCount: 1,
      }),
    ),
    previewRecipePack: vi.fn(() =>
      ok({
        totalCount: 1,
        validRecipes: [
          {
            index: 0,
            title: "Imported soup",
            notices: [],
            recipeInput: {
              id: "recipe-import-1",
              title: "Imported soup",
              baseServings: 2,
              ingredients: [{ name: "Stock", quantity: 500, unit: "ml" }],
              steps: [{ position: 1, text: "Simmer." }],
              cookbookId: "cookbook-default",
              categoryPath: [],
              tags: [],
              difficulty: "beginner",
              createdAt: "2026-05-24T12:00:00.000Z",
              updatedAt: "2026-05-24T12:00:00.000Z",
            },
          },
        ],
        invalidRecipes: [],
      }),
    ),
    importRecipePack: vi.fn(async () =>
      ok({
        importedCount: 1,
        skippedCount: 0,
        importedTitles: ["Imported soup"],
      }),
    ),
    getAiPromptTemplate: vi.fn(() => "Return only valid JSON."),
    ...overrides,
  };
}

function createRecipePackFileUseCases(
  overrides: Partial<RecipePackFileUseCases> = {},
): RecipePackFileUseCases {
  return {
    saveRecipePackFile: vi.fn(async () =>
      ok({
        mode: "browser-download",
        message: "Backup download started.",
      }),
    ),
    ...overrides,
  };
}

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
const originalExecCommand = document.execCommand;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

afterEach(() => {
  vi.restoreAllMocks();
  restoreClipboard();
  restoreExecCommand();
  restoreObjectUrlApis();
});

describe("RecipeTransferScreen", () => {
  it("exports a recipe pack and shows the generated JSON", async () => {
    const recipePackUseCases = createRecipePackUseCases();
    setObjectUrlApis();

    render(<RecipeTransferScreen recipePackUseCases={recipePackUseCases} onImported={vi.fn()} />);

    fireEvent.click(screen.getByRole("tab", { name: "Export" }));
    fireEvent.click(screen.getByRole("button", { name: "Export" }));

    expect(await screen.findByText(/1 recipes ready/)).toBeInTheDocument();
    expect(screen.getByLabelText("Exported recipe pack JSON")).toHaveValue(sampleJson);
  });

  it("saves exported packs through the file save port", async () => {
    const recipePackUseCases = createRecipePackUseCases();
    const recipePackFileUseCases = createRecipePackFileUseCases();
    const createObjectURL = vi.fn((object: Blob | MediaSource) => {
      expect(object).toBeInstanceOf(Blob);
      return "blob:lacucina-recipes";
    });
    const revokeObjectURL = vi.fn((url: string) => {
      expect(url).toBe("blob:lacucina-recipes");
    });
    setObjectUrlApis({ createObjectURL, revokeObjectURL });

    const { unmount } = render(
      <RecipeTransferScreen
        recipePackFileUseCases={recipePackFileUseCases}
        recipePackUseCases={recipePackUseCases}
        onImported={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Export" }));
    fireEvent.click(screen.getByRole("button", { name: "Export" }));

    fireEvent.click(await screen.findByRole("button", { name: "Download file" }));

    await waitFor(() => {
      expect(recipePackFileUseCases.saveRecipePackFile).toHaveBeenCalledWith({
        pack: {
          fileName: "comero-recipes-2026-05-24.json",
          json: sampleJson,
          recipeCount: 1,
        },
        downloadUrl: "blob:lacucina-recipes",
      });
    });
    expect(screen.getByRole("status")).toHaveTextContent("Backup download started.");
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));

    unmount();

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:lacucina-recipes");
  });

  it("keeps a ready export downloadable after remounting controlled state", async () => {
    const recipePackFileUseCases = createRecipePackFileUseCases();

    render(
      <RecipeTransferScreen
        recipePackFileUseCases={recipePackFileUseCases}
        recipePackUseCases={createRecipePackUseCases()}
        transferState={{
          ...initialRecipeTransferScreenState,
          activeTab: "export",
          exportState: {
            status: "ready",
            pack: {
              fileName: "comero-recipes-2026-05-24.json",
              json: sampleJson,
              recipeCount: 1,
            },
          },
        }}
        onImported={vi.fn()}
        onTransferStateChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Download file" }));

    await waitFor(() => {
      expect(recipePackFileUseCases.saveRecipePackFile).toHaveBeenCalledWith(
        expect.objectContaining({
          downloadUrl: expect.stringContaining("data:application/json"),
        }),
      );
    });
  });

  it("selects backup JSON when file saving is unavailable", async () => {
    const recipePackFileUseCases = createRecipePackFileUseCases({
      saveRecipePackFile: vi.fn(async () =>
        err({
          code: "save-unavailable",
          message: "Android could not open the backup file action.",
        }),
      ),
    });

    render(
      <RecipeTransferScreen
        recipePackFileUseCases={recipePackFileUseCases}
        recipePackUseCases={createRecipePackUseCases()}
        onImported={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Export" }));
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    fireEvent.click(await screen.findByRole("button", { name: "Download file" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Android could not open the backup file action. Backup JSON selected below.",
    );

    const backupJson = screen.getByLabelText("Exported recipe pack JSON") as HTMLTextAreaElement;
    expect(document.activeElement).toBe(backupJson);
    expect(backupJson.selectionStart).toBe(0);
    expect(backupJson.selectionEnd).toBe(backupJson.value.length);
  });

  it("previews and imports valid pasted recipes", async () => {
    const onImported = vi.fn();
    const recipePackUseCases = createRecipePackUseCases();

    render(
      <RecipeTransferScreen recipePackUseCases={recipePackUseCases} onImported={onImported} />,
    );

    fireEvent.change(screen.getByLabelText("Recipe pack JSON"), {
      target: { value: sampleJson },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview import" }));

    expect(await screen.findByText("1 valid, 0 invalid, 1 total.")).toBeInTheDocument();
    expect(screen.getByText("Imported soup")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview again" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Import valid recipes" }));

    await waitFor(() => {
      expect(onImported).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Imported 1 recipes. Skipped 0.");
    expect(recipePackUseCases.importRecipePack).toHaveBeenCalledWith(sampleJson);
  });

  it("shows invalid JSON preview errors without importing", async () => {
    const recipePackUseCases = createRecipePackUseCases({
      previewRecipePack: vi.fn(() =>
        err({ code: "invalid-json", message: "Recipe pack JSON could not be read." }),
      ),
    });

    render(<RecipeTransferScreen recipePackUseCases={recipePackUseCases} onImported={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Recipe pack JSON"), {
      target: { value: "{bad" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview import" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Recipe pack JSON could not be read.",
    );
    expect(screen.queryByRole("button", { name: "Import valid recipes" })).not.toBeInTheDocument();
  });

  it("exposes the AI prompt template", () => {
    render(
      <RecipeTransferScreen recipePackUseCases={createRecipePackUseCases()} onImported={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "AI template" }));
    expect(screen.getByLabelText("AI recipe pack prompt")).toHaveValue("Return only valid JSON.");
  });

  it("copies the AI prompt through the Clipboard API", async () => {
    const writeText = vi.fn(async () => undefined);
    setClipboard({ writeText });

    render(
      <RecipeTransferScreen recipePackUseCases={createRecipePackUseCases()} onImported={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "AI template" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy prompt" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("Return only valid JSON.");
    });
    expect(screen.getByRole("status")).toHaveTextContent("Prompt copied.");
  });

  it("falls back to legacy copy when the Clipboard API rejects", async () => {
    const writeText = vi.fn(async () => {
      throw new Error("Clipboard permission denied");
    });
    const execCommand = vi.fn(() => true);
    setClipboard({ writeText });
    setExecCommand(execCommand);

    render(
      <RecipeTransferScreen recipePackUseCases={createRecipePackUseCases()} onImported={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "AI template" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy prompt" }));

    await waitFor(() => {
      expect(execCommand).toHaveBeenCalledWith("copy");
    });
    expect(screen.getByRole("status")).toHaveTextContent("Prompt copied.");
  });

  it("selects the visible prompt when clipboard copy is unavailable", async () => {
    const writeText = vi.fn(async () => {
      throw new Error("Clipboard permission denied");
    });
    setClipboard({ writeText });
    setExecCommand(vi.fn(() => false));

    render(
      <RecipeTransferScreen recipePackUseCases={createRecipePackUseCases()} onImported={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "AI template" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy prompt" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Prompt selected below. Copy it manually.",
    );

    const prompt = screen.getByLabelText("AI recipe pack prompt") as HTMLTextAreaElement;
    expect(document.activeElement).toBe(prompt);
    expect(prompt.selectionStart).toBe(0);
    expect(prompt.selectionEnd).toBe(prompt.value.length);
  });

  it("preserves controlled import status while switching backup tabs", async () => {
    const recipePackUseCases = createRecipePackUseCases({
      previewRecipePack: vi.fn(() =>
        ok({
          totalCount: 1,
          validRecipes: [
            {
              index: 0,
              title: "Salt pasta",
              notices: ['Salt was imported as "to taste" because quantity or unit was missing.'],
              recipeInput: {
                id: "recipe-import-1",
                title: "Salt pasta",
                baseServings: 2,
                ingredients: [
                  { name: "Salt", quantity: 1, unit: "to taste", scaleMode: "toTaste" },
                ],
                steps: [{ position: 1, text: "Season." }],
                cookbookId: "cookbook-default",
                categoryPath: [],
                tags: [],
                difficulty: "beginner",
                createdAt: "2026-05-24T12:00:00.000Z",
                updatedAt: "2026-05-24T12:00:00.000Z",
              },
            },
          ],
          invalidRecipes: [],
        }),
      ),
    });

    function ControlledTransferFixture() {
      const [state, setState] = useState(initialRecipeTransferScreenState);

      return (
        <RecipeTransferScreen
          recipePackUseCases={recipePackUseCases}
          transferState={state}
          onImported={vi.fn()}
          onTransferStateChange={setState}
        />
      );
    }

    render(<ControlledTransferFixture />);

    fireEvent.change(screen.getByLabelText("Recipe pack JSON"), {
      target: { value: sampleJson },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview import" }));
    expect(await screen.findByText("1 import cleanup notes were applied.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Export" }));
    fireEvent.click(screen.getByRole("tab", { name: "Import" }));

    expect(screen.getByText("Salt pasta")).toBeInTheDocument();
    expect(screen.getByText(/Salt was imported as/)).toBeInTheDocument();
  });
});

function setClipboard(clipboard: { writeText: (text: string) => Promise<void> }) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: clipboard,
  });
}

function restoreClipboard() {
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, "clipboard", originalClipboardDescriptor);
    return;
  }

  delete (navigator as Navigator & { clipboard?: Clipboard }).clipboard;
}

function setExecCommand(execCommand: (commandId: string) => boolean) {
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: execCommand,
  });
}

function restoreExecCommand() {
  if (originalExecCommand) {
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: originalExecCommand,
    });
    return;
  }

  delete (document as Document & { execCommand?: (commandId: string) => boolean }).execCommand;
}

function setObjectUrlApis(overrides: Partial<ObjectUrlApiMocks> = {}) {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: overrides.createObjectURL ?? vi.fn(() => "blob:lacucina-recipes"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: overrides.revokeObjectURL ?? vi.fn(),
  });
}

function restoreObjectUrlApis() {
  if (originalCreateObjectURL) {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: originalCreateObjectURL,
    });
  } else {
    delete (URL as typeof URL & { createObjectURL?: typeof URL.createObjectURL }).createObjectURL;
  }

  if (originalRevokeObjectURL) {
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevokeObjectURL,
    });
  } else {
    delete (URL as typeof URL & { revokeObjectURL?: typeof URL.revokeObjectURL }).revokeObjectURL;
  }
}

type ObjectUrlApiMocks = {
  createObjectURL: (object: Blob | MediaSource) => string;
  revokeObjectURL: (url: string) => void;
};
