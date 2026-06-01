import type { RecipePackExport, RecipePackPreview } from "../application/recipePackUseCases";

export type RecipeTransferTab = "export" | "import" | "ai";

export type RecipeTransferExportState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; pack: RecipePackExport }
  | { status: "error"; message: string };

export type RecipeTransferPreviewState =
  | { status: "idle" }
  | { status: "ready"; preview: RecipePackPreview }
  | { status: "error"; message: string };

export type RecipeTransferImportState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; message: string }
  | { status: "error"; message: string };

export type RecipeTransferScreenState = {
  activeTab: RecipeTransferTab;
  exportState: RecipeTransferExportState;
  packText: string;
  previewState: RecipeTransferPreviewState;
  importState: RecipeTransferImportState;
  promptCopyMessage: string;
};

export const initialRecipeTransferScreenState: RecipeTransferScreenState = {
  activeTab: "import",
  exportState: { status: "idle" },
  packText: "",
  previewState: { status: "idle" },
  importState: { status: "idle" },
  promptCopyMessage: "",
};
