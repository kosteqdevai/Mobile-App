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
  includeArchived?: boolean;
  archivedOnly?: boolean;
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
  deleteRecipes(recipeIds: ReadonlyArray<string>): Promise<Result<void, RecipeUseCaseError>>;
  archiveRecipe(recipeId: string): Promise<Result<Recipe, RecipeUseCaseError>>;
  archiveRecipes(
    recipeIds: ReadonlyArray<string>,
  ): Promise<Result<ReadonlyArray<Recipe>, RecipeUseCaseError>>;
  restoreRecipe(recipeId: string): Promise<Result<Recipe, RecipeUseCaseError>>;
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

    async deleteRecipes(recipeIds) {
      try {
        const recipesResult = await getExistingRecipes(repository, recipeIds);

        if (!recipesResult.ok) {
          return err(recipesResult.error);
        }

        await Promise.all(recipesResult.value.map((recipe) => repository.delete(recipe.id)));
        return ok(undefined);
      } catch (error) {
        return err(repositoryError(error));
      }
    },

    async archiveRecipe(recipeId) {
      try {
        const existing = await repository.getById(recipeId);

        if (!existing) {
          return err({
            code: "not-found",
            message: "Recipe was not found.",
          });
        }

        const archived = {
          ...existing,
          archivedAt: existing.archivedAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await repository.save(archived);
        return ok(archived);
      } catch (error) {
        return err(repositoryError(error));
      }
    },

    async archiveRecipes(recipeIds) {
      try {
        const recipesResult = await getExistingRecipes(repository, recipeIds);

        if (!recipesResult.ok) {
          return err(recipesResult.error);
        }

        const now = new Date().toISOString();
        const archivedRecipes = recipesResult.value.map((recipe) => ({
          ...recipe,
          archivedAt: recipe.archivedAt ?? now,
          updatedAt: now,
        }));

        await Promise.all(archivedRecipes.map((recipe) => repository.save(recipe)));
        return ok(archivedRecipes);
      } catch (error) {
        return err(repositoryError(error));
      }
    },

    async restoreRecipe(recipeId) {
      try {
        const existing = await repository.getById(recipeId);

        if (!existing) {
          return err({
            code: "not-found",
            message: "Recipe was not found.",
          });
        }

        const restoredRecipe = { ...existing };
        delete restoredRecipe.archivedAt;
        const restored = {
          ...restoredRecipe,
          updatedAt: new Date().toISOString(),
        };
        await repository.save(restored);
        return ok(restored);
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
    const isArchived = Boolean(recipe.archivedAt);

    if (filters.archivedOnly && !isArchived) {
      return false;
    }

    if (!filters.archivedOnly && !filters.includeArchived && isArchived) {
      return false;
    }

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

async function getExistingRecipes(
  repository: RecipeRepository,
  recipeIds: ReadonlyArray<string>,
): Promise<Result<ReadonlyArray<Recipe>, RecipeUseCaseError>> {
  const normalizedRecipeIds = Array.from(
    new Set(recipeIds.map((recipeId) => recipeId.trim()).filter((recipeId) => recipeId.length > 0)),
  );

  if (normalizedRecipeIds.length === 0) {
    return err({
      code: "validation",
      message: "At least one recipe must be selected.",
    });
  }

  const recipes = await Promise.all(
    normalizedRecipeIds.map((recipeId) => repository.getById(recipeId)),
  );
  const missingRecipeId = normalizedRecipeIds.find((_, index) => !recipes[index]);

  if (missingRecipeId) {
    return err({
      code: "not-found",
      message: `Recipe ${missingRecipeId} was not found.`,
    });
  }

  return ok(recipes.filter((recipe): recipe is Recipe => Boolean(recipe)));
}
