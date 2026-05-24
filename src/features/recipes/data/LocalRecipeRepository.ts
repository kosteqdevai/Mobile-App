import type { KeyValueStore } from "../../../core/data/localJsonCollection";
import { LocalJsonCollection } from "../../../core/data/localJsonCollection";
import type { RecipeRepository } from "../application/RecipeRepository";
import type { Recipe } from "../domain/recipe";
import { recipeFromRecord, recipeToRecord, type RecipeRecord } from "./recipeMapper";

export class LocalRecipeRepository implements RecipeRepository {
  private readonly collection: LocalJsonCollection<RecipeRecord>;

  constructor(storage: KeyValueStore, initialRecipes: ReadonlyArray<Recipe> = []) {
    this.collection = new LocalJsonCollection({
      storage,
      versionKey: "lacucina:schema-version",
      collectionKey: "lacucina:recipes",
      schemaVersion: 1,
      initialRecords: initialRecipes.map(recipeToRecord),
    });
  }

  async save(recipe: Recipe) {
    this.collection.save(recipeToRecord(recipe));
  }

  async getById(recipeId: string) {
    const record = this.collection.getById(recipeId);
    return record ? recipeFromRecord(record) : undefined;
  }

  async list() {
    return this.collection.list().map(recipeFromRecord);
  }

  async delete(recipeId: string) {
    this.collection.delete(recipeId);
  }
}
