import { err, ok, type Result } from "../../../core/result/Result";
import {
  addCategory,
  assignRecipeToCategory,
  createCookbook,
  deleteCategory as deleteCategoryFromCookbook,
  findCategory,
  removeRecipeFromCategory,
  renameCategory as renameCookbookCategory,
  type CategoryInput,
  type Cookbook,
  type CookbookInput,
} from "../domain/cookbook";
import type { CookbookRepository } from "./CookbookRepository";

export type CookbookUseCaseErrorCode = "validation" | "not-found" | "repository";

export type CookbookUseCaseError = {
  code: CookbookUseCaseErrorCode;
  message: string;
  details?: unknown;
};

export type CookbookUseCases = {
  createCookbook(input: CookbookInput): Promise<Result<Cookbook, CookbookUseCaseError>>;
  listCookbooks(): Promise<Result<ReadonlyArray<Cookbook>, CookbookUseCaseError>>;
  createCategory(
    cookbookId: string,
    input: CategoryInput,
  ): Promise<Result<Cookbook, CookbookUseCaseError>>;
  renameCategory(
    cookbookId: string,
    categoryId: string,
    nextName: string,
  ): Promise<Result<Cookbook, CookbookUseCaseError>>;
  deleteCategory(
    cookbookId: string,
    categoryId: string,
  ): Promise<Result<Cookbook, CookbookUseCaseError>>;
  assignRecipe(
    cookbookId: string,
    categoryId: string,
    recipeId: string,
  ): Promise<Result<Cookbook, CookbookUseCaseError>>;
  unassignRecipe(
    cookbookId: string,
    categoryId: string,
    recipeId: string,
  ): Promise<Result<Cookbook, CookbookUseCaseError>>;
};

export function createCookbookUseCases(repository: CookbookRepository): CookbookUseCases {
  return {
    async createCookbook(input) {
      const cookbookResult = createCookbook(input);

      if (!cookbookResult.ok) {
        return err({
          code: "validation",
          message: "Cookbook input is invalid.",
          details: cookbookResult.error,
        });
      }

      try {
        await repository.save(cookbookResult.value);
        return ok(cookbookResult.value);
      } catch (error) {
        return err(repositoryError(error));
      }
    },

    async listCookbooks() {
      try {
        return ok(await repository.list());
      } catch (error) {
        return err(repositoryError(error));
      }
    },

    async createCategory(cookbookId, input) {
      return updateCookbook(repository, cookbookId, (cookbook) => addCategory(cookbook, input));
    },

    async renameCategory(cookbookId, categoryId, nextName) {
      return updateCookbook(repository, cookbookId, (cookbook) =>
        renameCookbookCategory(cookbook, categoryId, nextName),
      );
    },

    async deleteCategory(cookbookId, categoryId) {
      return updateCookbook(repository, cookbookId, (cookbook) =>
        deleteCategoryFromCookbook(cookbook, categoryId),
      );
    },

    async assignRecipe(cookbookId, categoryId, recipeId) {
      return updateCookbook(repository, cookbookId, (cookbook) =>
        assignRecipeToCategory(cookbook, categoryId, recipeId),
      );
    },

    async unassignRecipe(cookbookId, categoryId, recipeId) {
      try {
        const cookbook = await repository.getById(cookbookId);

        if (!cookbook) {
          return err({
            code: "not-found",
            message: "Cookbook was not found.",
          });
        }

        if (!findCategory(cookbook.categories, categoryId)) {
          return err({
            code: "not-found",
            message: "Category was not found.",
          });
        }

        const updated = removeRecipeFromCategory(cookbook, categoryId, recipeId);
        await repository.save(updated);
        return ok(updated);
      } catch (error) {
        return err(repositoryError(error));
      }
    },
  };
}

async function updateCookbook(
  repository: CookbookRepository,
  cookbookId: string,
  update: (cookbook: Cookbook) => Result<Cookbook, unknown>,
): Promise<Result<Cookbook, CookbookUseCaseError>> {
  try {
    const cookbook = await repository.getById(cookbookId);

    if (!cookbook) {
      return err({
        code: "not-found",
        message: "Cookbook was not found.",
      });
    }

    const result = update(cookbook);

    if (!result.ok) {
      return err({
        code: "validation",
        message: "Cookbook update is invalid.",
        details: result.error,
      });
    }

    await repository.save(result.value);
    return ok(result.value);
  } catch (error) {
    return err(repositoryError(error));
  }
}

function repositoryError(error: unknown): CookbookUseCaseError {
  return {
    code: "repository",
    message: "Cookbook storage is unavailable.",
    details: error,
  };
}
