import type { Recipe } from "../domain/recipe";

export type RecipeRecord = Recipe;

export function recipeToRecord(recipe: Recipe): RecipeRecord {
  return structuredClone(recipe);
}

export function recipeFromRecord(record: RecipeRecord): Recipe {
  return structuredClone(record);
}
