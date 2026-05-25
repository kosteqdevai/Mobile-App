import type { LocalDatabase } from "../../../core/data/localDatabase";
import type { RecipeComponentRepository } from "../application/RecipeComponentRepository";
import type { RecipeComponent } from "../domain/recipeComponent";
import {
  recipeComponentFromRecord,
  recipeComponentToRecord,
  type RecipeComponentRecord,
} from "./recipeComponentMapper";

export class IndexedDbRecipeComponentRepository implements RecipeComponentRepository {
  constructor(private readonly database: LocalDatabase) {}

  async save(component: RecipeComponent) {
    await this.database.put("recipeComponents", recipeComponentToRecord(component));
  }

  async getById(componentId: string) {
    const record = await this.database.get<RecipeComponentRecord>("recipeComponents", componentId);
    return record ? recipeComponentFromRecord(record) : undefined;
  }

  async list() {
    const records = await this.database.list<RecipeComponentRecord>("recipeComponents");
    return records.map(recipeComponentFromRecord);
  }

  async delete(componentId: string) {
    await this.database.delete("recipeComponents", componentId);
  }
}
