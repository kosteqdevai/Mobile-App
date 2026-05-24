import type { LocalDatabase } from "../../../core/data/localDatabase";
import type { RecipeRepository } from "../application/RecipeRepository";
import type { Recipe } from "../domain/recipe";
import { recipeFromRecord, recipeToRecord, type RecipeRecord } from "./recipeMapper";

export class IndexedDbRecipeRepository implements RecipeRepository {
  constructor(private readonly database: LocalDatabase) {}

  async save(recipe: Recipe) {
    await this.database.put("recipes", recipeToRecord(recipe));
  }

  async getById(recipeId: string) {
    const record = await this.database.get<RecipeRecord>("recipes", recipeId);
    return record ? recipeFromRecord(record) : undefined;
  }

  async list() {
    const records = await this.database.list<RecipeRecord>("recipes");
    return records.map(recipeFromRecord);
  }

  async delete(recipeId: string) {
    await this.database.delete("recipes", recipeId);
  }
}
