import type { Recipe } from "../domain/recipe";

export type RecipeRepository = {
  save(recipe: Recipe): Promise<void>;
  getById(recipeId: string): Promise<Recipe | undefined>;
  list(): Promise<ReadonlyArray<Recipe>>;
  delete(recipeId: string): Promise<void>;
};
