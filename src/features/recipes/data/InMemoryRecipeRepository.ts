import type { RecipeRepository } from "../application/RecipeRepository";
import type { Recipe } from "../domain/recipe";
import { recipeFromRecord, recipeToRecord, type RecipeRecord } from "./recipeMapper";

export class InMemoryRecipeRepository implements RecipeRepository {
  private readonly records = new Map<string, RecipeRecord>();

  constructor(initialRecipes: ReadonlyArray<Recipe> = []) {
    initialRecipes.forEach((recipe) => {
      this.records.set(recipe.id, recipeToRecord(recipe));
    });
  }

  async save(recipe: Recipe) {
    this.records.set(recipe.id, recipeToRecord(recipe));
  }

  async getById(recipeId: string) {
    const record = this.records.get(recipeId);
    return record ? recipeFromRecord(record) : undefined;
  }

  async list() {
    return Array.from(this.records.values()).map(recipeFromRecord);
  }

  async delete(recipeId: string) {
    this.records.delete(recipeId);
  }
}
