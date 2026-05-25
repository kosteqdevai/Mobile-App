import { err, ok, type Result } from "../../../core/result/Result";
import {
  buildRecipeComponentImportSnapshot,
  createRecipeComponent,
  type RecipeComponent,
  type RecipeComponentImportSnapshot,
  type RecipeComponentInput,
} from "../domain/recipeComponent";
import type { RecipeComponentRepository } from "./RecipeComponentRepository";

export type RecipeComponentUseCaseErrorCode = "validation" | "not-found" | "repository";

export type RecipeComponentUseCaseError = {
  code: RecipeComponentUseCaseErrorCode;
  message: string;
  details?: unknown;
};

export type RecipeComponentUseCases = {
  createComponent(
    input: RecipeComponentInput,
  ): Promise<Result<RecipeComponent, RecipeComponentUseCaseError>>;
  updateComponent(
    input: RecipeComponentInput,
  ): Promise<Result<RecipeComponent, RecipeComponentUseCaseError>>;
  deleteComponent(componentId: string): Promise<Result<void, RecipeComponentUseCaseError>>;
  getComponent(componentId: string): Promise<Result<RecipeComponent, RecipeComponentUseCaseError>>;
  listComponents(): Promise<Result<ReadonlyArray<RecipeComponent>, RecipeComponentUseCaseError>>;
  buildImportSnapshot(
    componentId: string,
  ): Promise<Result<RecipeComponentImportSnapshot, RecipeComponentUseCaseError>>;
};

export function createRecipeComponentUseCases(
  repository: RecipeComponentRepository,
): RecipeComponentUseCases {
  return {
    async createComponent(input) {
      const componentResult = createRecipeComponent(input);

      if (!componentResult.ok) {
        return err({
          code: "validation",
          message: "Recipe component input is invalid.",
          details: componentResult.error,
        });
      }

      try {
        await repository.save(componentResult.value);
        return ok(componentResult.value);
      } catch (error) {
        return err(repositoryError(error));
      }
    },

    async updateComponent(input) {
      try {
        const existing = await repository.getById(input.id);

        if (!existing) {
          return err({
            code: "not-found",
            message: "Recipe component was not found.",
          });
        }

        const componentResult = createRecipeComponent(input);

        if (!componentResult.ok) {
          return err({
            code: "validation",
            message: "Recipe component input is invalid.",
            details: componentResult.error,
          });
        }

        await repository.save(componentResult.value);
        return ok(componentResult.value);
      } catch (error) {
        return err(repositoryError(error));
      }
    },

    async deleteComponent(componentId) {
      try {
        const existing = await repository.getById(componentId);

        if (!existing) {
          return err({
            code: "not-found",
            message: "Recipe component was not found.",
          });
        }

        await repository.delete(componentId);
        return ok(undefined);
      } catch (error) {
        return err(repositoryError(error));
      }
    },

    async getComponent(componentId) {
      try {
        const component = await repository.getById(componentId);

        if (!component) {
          return err({
            code: "not-found",
            message: "Recipe component was not found.",
          });
        }

        return ok(component);
      } catch (error) {
        return err(repositoryError(error));
      }
    },

    async listComponents() {
      try {
        const components = await repository.list();
        return ok([...components].sort((first, second) => first.name.localeCompare(second.name)));
      } catch (error) {
        return err(repositoryError(error));
      }
    },

    async buildImportSnapshot(componentId) {
      try {
        const component = await repository.getById(componentId);

        if (!component) {
          return err({
            code: "not-found",
            message: "Recipe component was not found.",
          });
        }

        return ok(buildRecipeComponentImportSnapshot(component));
      } catch (error) {
        return err(repositoryError(error));
      }
    },
  };
}

function repositoryError(error: unknown): RecipeComponentUseCaseError {
  return {
    code: "repository",
    message: "Recipe component storage is unavailable.",
    details: error,
  };
}
