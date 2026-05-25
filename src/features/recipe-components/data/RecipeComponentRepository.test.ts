import { describe, expect, it } from "vitest";

import { MemoryLocalDatabase } from "../../../core/data/localDatabase";
import { IndexedDbRecipeComponentRepository } from "./IndexedDbRecipeComponentRepository";
import { InMemoryRecipeComponentRepository } from "./InMemoryRecipeComponentRepository";
import {
  recipeComponentFromRecord,
  recipeComponentToRecord,
  type RecipeComponentRecord,
} from "./recipeComponentMapper";

const component = {
  id: "component-filling",
  name: "Cheese filling",
  baseServings: 4,
  ingredients: [{ name: "Cheese", quantity: 250, unit: "g" }],
  steps: [{ position: 1, text: "Mix until smooth." }],
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

describe("recipe component data", () => {
  it("round-trips through the mapper", () => {
    expect(recipeComponentFromRecord(recipeComponentToRecord(component))).toEqual(component);
  });

  it("fails safely for corrupt component records", () => {
    expect(() =>
      recipeComponentFromRecord({
        ...component,
        name: "",
      } as RecipeComponentRecord),
    ).toThrow("Recipe component record component-filling is invalid.");
  });

  it("uses the same contract for in-memory and IndexedDB repositories", async () => {
    const repositories = [
      new InMemoryRecipeComponentRepository(),
      new IndexedDbRecipeComponentRepository(new MemoryLocalDatabase()),
    ];

    for (const repository of repositories) {
      await repository.save(component);
      await expect(repository.getById(component.id)).resolves.toEqual(component);
      await expect(repository.list()).resolves.toEqual([component]);
      await repository.delete(component.id);
      await expect(repository.list()).resolves.toEqual([]);
    }
  });
});
