import { describe, expect, it } from "vitest";

import { MemoryKeyValueStore } from "../../../core/data/localJsonCollection";
import type { Recipe } from "../domain/recipe";
import { LocalRecipeRepository } from "./LocalRecipeRepository";

const recipe: Recipe = {
  id: "recipe-1",
  title: "Lemon pasta",
  description: "Fast dinner",
  baseServings: 2,
  ingredients: [{ name: "Pasta", quantity: 100, unit: "g" }],
  steps: [{ position: 1, text: "Boil pasta." }],
  cookbookId: "cookbook-default",
  categoryPath: ["Dinner"],
  tags: ["quick"],
  difficulty: "beginner",
  isFavorite: false,
  isTemplate: false,
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

describe("LocalRecipeRepository", () => {
  it("persists recipes across repository restarts", async () => {
    const storage = new MemoryKeyValueStore();
    const firstRepository = new LocalRecipeRepository(storage);

    await firstRepository.save(recipe);
    const restartedRepository = new LocalRecipeRepository(storage);

    await expect(restartedRepository.getById(recipe.id)).resolves.toEqual(recipe);
  });

  it("deletes recipes from local storage", async () => {
    const storage = new MemoryKeyValueStore();
    const repository = new LocalRecipeRepository(storage, [recipe]);

    await repository.delete(recipe.id);

    await expect(repository.list()).resolves.toEqual([]);
  });
});
