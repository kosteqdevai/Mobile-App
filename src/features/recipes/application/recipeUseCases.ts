import { err, ok, type Result } from "../../../core/result/Result";
import { scaleRecipeIngredients, type ScaledIngredient } from "../domain/portionScaling";
import { createRecipe, type Recipe, type RecipeInput } from "../domain/recipe";
import type { RecipeRepository } from "./RecipeRepository";

export type RecipeFilters = {
  searchTerm?: string;
  cookbookId?: string;
  categoryPath?: ReadonlyArray<string>;
  tag?: string;
  favoriteOnly?: boolean;
};

export type RecipeUseCaseErrorCode = "validation" | "not-found" | "repository";

export type RecipeUseCaseError = {
  code: RecipeUseCaseErrorCode;
  message: string;
  details?: unknown;
};

export type RecipeUseCases = {
  createRecipe(input: RecipeInput): Promise<Result<Recipe, RecipeUseCaseError>>;
  updateRecipe(input: RecipeInput): Promise<Result<Recipe, RecipeUseCaseError>>;
  deleteRecipe(recipeId: string): Promise<Result<void, RecipeUseCaseError>>;
  getRecipeDetails(recipeId: string): Promise<Result<Recipe, RecipeUseCaseError>>;
  listRecipes(filters?: RecipeFilters): Promise<Result<ReadonlyArray<Recipe>, RecipeUseCaseError>>;
  previewPortions(
    recipeId: string,
    targetServings: number,
  ): Promise<Result<ReadonlyArray<ScaledIngredient>, RecipeUseCaseError>>;
};

export function createRecipeUseCases(repository: RecipeRepository): RecipeUseCases {
  return {
    async createRecipe(input) {
      const recipeResult = createRecipe(input);

      if (!recipeResult.ok) {
        return err({
          code: "validation",
          message: "Recipe input is invalid.",
          details: recipeResult.error,
        });
      }

      try {
        await repository.save(recipeResult.value);
        return ok(recipeResult.value);
      } catch (error) {
        return err(repositoryError(error));
      }
    },

    async updateRecipe(input) {
      try {
        const existing = await repository.getById(input.id);

        if (!existing) {
          return err({
            code: "not-found",
            message: "Recipe was not found.",
          });
        }

        const recipeResult = createRecipe(input);

        if (!recipeResult.ok) {
          return err({
            code: "validation",
            message: "Recipe input is invalid.",
            details: recipeResult.error,
          });
        }

        await repository.save(recipeResult.value);
        return ok(recipeResult.value);
      } catch (error) {
        return err(repositoryError(error));
      }
    },

    async deleteRecipe(recipeId) {
      try {
        const existing = await repository.getById(recipeId);

        if (!existing) {
          return err({
            code: "not-found",
            message: "Recipe was not found.",
          });
        }

        await repository.delete(recipeId);
        return ok(undefined);
      } catch (error) {
        return err(repositoryError(error));
      }
    },

    async getRecipeDetails(recipeId) {
      try {
        const recipe = await repository.getById(recipeId);

        if (!recipe) {
          return err({
            code: "not-found",
            message: "Recipe was not found.",
          });
        }

        return ok(recipe);
      } catch (error) {
        return err(repositoryError(error));
      }
    },

    async listRecipes(filters = {}) {
      try {
        const recipes = await repository.list();
        return ok(filterRecipes(recipes, filters));
      } catch (error) {
        return err(repositoryError(error));
      }
    },

    async previewPortions(recipeId, targetServings) {
      try {
        const recipe = await repository.getById(recipeId);

        if (!recipe) {
          return err({
            code: "not-found",
            message: "Recipe was not found.",
          });
        }

        const scaledResult = scaleRecipeIngredients(recipe, targetServings);

        if (!scaledResult.ok) {
          return err({
            code: "validation",
            message: "Target servings are invalid.",
            details: scaledResult.error,
          });
        }

        return ok(scaledResult.value);
      } catch (error) {
        return err(repositoryError(error));
      }
    },
  };
}

function repositoryError(error: unknown): RecipeUseCaseError {
  return {
    code: "repository",
    message: "Recipe storage is unavailable.",
    details: error,
  };
}

function filterRecipes(recipes: ReadonlyArray<Recipe>, filters: RecipeFilters) {
  return recipes.filter((recipe) => {
    const searchTerm = filters.searchTerm?.trim().toLowerCase();

    if (
      searchTerm &&
      !recipe.title.toLowerCase().includes(searchTerm) &&
      !recipe.description.toLowerCase().includes(searchTerm)
    ) {
      return false;
    }

    if (filters.cookbookId && recipe.cookbookId !== filters.cookbookId) {
      return false;
    }

    if (filters.categoryPath && !matchesCategoryPath(recipe.categoryPath, filters.categoryPath)) {
      return false;
    }

    if (filters.tag && !recipe.tags.includes(filters.tag.trim().toLowerCase())) {
      return false;
    }

    if (filters.favoriteOnly && !recipe.isFavorite) {
      return false;
    }

    return true;
  });
}

function matchesCategoryPath(recipePath: ReadonlyArray<string>, filterPath: ReadonlyArray<string>) {
  return filterPath.every((segment, index) => recipePath[index] === segment);
}
