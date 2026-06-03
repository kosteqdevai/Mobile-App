import { err, ok, type Result } from "../../../core/result/Result";
import type { RecipePackExport } from "./recipePackUseCases";

export type RecipePackFileSaveMode = "native-share" | "browser-download" | "clipboard";

export type RecipePackFileSaveResult = {
  mode: RecipePackFileSaveMode;
  message: string;
};

export type RecipePackFileError = {
  code: "save-unavailable";
  message: string;
  details?: unknown;
};

export type RecipePackFileSaveInput = {
  pack: RecipePackExport;
  downloadUrl: string;
};

export type RecipePackFilePort = {
  saveRecipePackFile(
    input: RecipePackFileSaveInput,
  ): Promise<Result<RecipePackFileSaveResult, RecipePackFileError>>;
};

export type RecipePackFileUseCases = {
  saveRecipePackFile(
    input: RecipePackFileSaveInput,
  ): Promise<Result<RecipePackFileSaveResult, RecipePackFileError>>;
};

export function createRecipePackFileUseCases(filePort: RecipePackFilePort): RecipePackFileUseCases {
  return {
    async saveRecipePackFile(input) {
      return filePort.saveRecipePackFile(input);
    },
  };
}

export function createMemoryRecipePackFilePort(): RecipePackFilePort {
  return {
    async saveRecipePackFile() {
      return ok({
        mode: "browser-download",
        message: "Backup download started.",
      });
    },
  };
}

export function createUnavailableRecipePackFilePort(message: string): RecipePackFilePort {
  return {
    async saveRecipePackFile() {
      return err({
        code: "save-unavailable",
        message,
      });
    },
  };
}
