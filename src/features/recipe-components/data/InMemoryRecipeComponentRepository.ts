import type { RecipeComponentRepository } from "../application/RecipeComponentRepository";
import type { RecipeComponent } from "../domain/recipeComponent";
import {
  recipeComponentFromRecord,
  recipeComponentToRecord,
  type RecipeComponentRecord,
} from "./recipeComponentMapper";

export class InMemoryRecipeComponentRepository implements RecipeComponentRepository {
  private readonly records = new Map<string, RecipeComponentRecord>();

  constructor(initialComponents: ReadonlyArray<RecipeComponent> = []) {
    initialComponents.forEach((component) => {
      this.records.set(component.id, recipeComponentToRecord(component));
    });
  }

  async save(component: RecipeComponent) {
    this.records.set(component.id, recipeComponentToRecord(component));
  }

  async getById(componentId: string) {
    const record = this.records.get(componentId);
    return record ? recipeComponentFromRecord(record) : undefined;
  }

  async list() {
    return Array.from(this.records.values()).map(recipeComponentFromRecord);
  }

  async delete(componentId: string) {
    this.records.delete(componentId);
  }
}
