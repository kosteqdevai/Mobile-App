import { describe, expect, it } from "vitest";

import type { Recipe } from "../domain/recipe";
import { InMemoryRecipeRepository } from "./InMemoryRecipeRepository";
import { recipeFromRecord, recipeToRecord } from "./recipeMapper";

const recipe: Recipe = {
  id: "recipe-1",
  title: "Rice",
  description: "",
  baseServings: 2,
  ingredients: [{ name: "Rice", quantity: 200, unit: "g" }],
  steps: [{ position: 1, text: "Cook rice." }],
  cookbookId: "cookbook-1",
  categoryPath: ["Dinner"],
  tags: [],
  difficulty: "beginner",
  isFavorite: false,
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

describe("recipe data contracts", () => {
  it("round trips recipes through records", () => {
    expect(recipeFromRecord(recipeToRecord(recipe))).toEqual(recipe);
  });

  it("stores recipes through the in-memory repository contract", async () => {
    const repository = new InMemoryRecipeRepository();

    await repository.save(recipe);
    expect(await repository.getById("recipe-1")).toEqual(recipe);
    expect(await repository.list()).toEqual([recipe]);

    await repository.delete("recipe-1");
    expect(await repository.list()).toEqual([]);
  });
});
