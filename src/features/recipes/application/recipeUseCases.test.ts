import { describe, expect, it } from "vitest";

import type { Recipe } from "../domain/recipe";
import { createRecipeUseCases } from "./recipeUseCases";
import type { RecipeRepository } from "./RecipeRepository";

const recipe: Recipe = {
  id: "recipe-1",
  title: "Tomato rice",
  description: "Fast dinner",
  baseServings: 2,
  ingredients: [{ name: "Rice", quantity: 200, unit: "g" }],
  steps: [{ position: 1, text: "Cook rice." }],
  cookbookId: "cookbook-1",
  categoryPath: ["Dinner"],
  tags: ["quick"],
  prepTimeMinutes: 5,
  cookTimeMinutes: 20,
  difficulty: "beginner",
  isFavorite: true,
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

describe("recipe use cases", () => {
  it("creates, reads, updates, and deletes recipes", async () => {
    const repository = new FakeRecipeRepository();
    const useCases = createRecipeUseCases(repository);

    const created = await useCases.createRecipe(recipe);
    expect(created.ok).toBe(true);

    const details = await useCases.getRecipeDetails("recipe-1");
    expect(details.ok).toBe(true);
    if (!details.ok) {
      throw new Error("Expected recipe details.");
    }
    expect(details.value.title).toBe("Tomato rice");

    const updated = await useCases.updateRecipe({ ...recipe, title: "Rice bowl" });
    expect(updated.ok).toBe(true);

    const deleted = await useCases.deleteRecipe("recipe-1");
    expect(deleted.ok).toBe(true);

    const missing = await useCases.getRecipeDetails("recipe-1");
    expect(missing.ok).toBe(false);
  });

  it("returns validation failures for invalid input", async () => {
    const useCases = createRecipeUseCases(new FakeRecipeRepository());
    const result = await useCases.createRecipe({ ...recipe, title: "" });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected validation failure.");
    }
    expect(result.error.code).toBe("validation");
  });

  it("searches, filters, and previews portions", async () => {
    const repository = new FakeRecipeRepository([recipe]);
    const useCases = createRecipeUseCases(repository);

    const list = await useCases.listRecipes({
      searchTerm: "tomato",
      categoryPath: ["Dinner"],
      tag: "quick",
      favoriteOnly: true,
    });

    expect(list.ok).toBe(true);
    if (!list.ok) {
      throw new Error("Expected recipes list.");
    }
    expect(list.value).toHaveLength(1);

    const scaled = await useCases.previewPortions("recipe-1", 6);
    expect(scaled.ok).toBe(true);
    if (!scaled.ok) {
      throw new Error("Expected scaled ingredients.");
    }
    expect(scaled.value[0]?.scaledQuantity).toBe(600);
  });

  it("returns empty list and not found errors predictably", async () => {
    const useCases = createRecipeUseCases(new FakeRecipeRepository());

    const list = await useCases.listRecipes({ searchTerm: "none" });
    expect(list.ok).toBe(true);
    if (!list.ok) {
      throw new Error("Expected recipes list.");
    }
    expect(list.value).toEqual([]);

    const missing = await useCases.deleteRecipe("missing");
    expect(missing.ok).toBe(false);
    if (missing.ok) {
      throw new Error("Expected missing recipe.");
    }
    expect(missing.error.code).toBe("not-found");
  });

  it("archives, restores, and filters archived recipes", async () => {
    const repository = new FakeRecipeRepository([recipe]);
    const useCases = createRecipeUseCases(repository);

    const archived = await useCases.archiveRecipe("recipe-1");
    expect(archived.ok).toBe(true);
    if (!archived.ok) {
      throw new Error("Expected recipe to archive.");
    }
    expect(archived.value.archivedAt).toBeDefined();

    const activeList = await useCases.listRecipes();
    expect(activeList.ok).toBe(true);
    if (!activeList.ok) {
      throw new Error("Expected active list.");
    }
    expect(activeList.value).toEqual([]);

    const archivedList = await useCases.listRecipes({ archivedOnly: true });
    expect(archivedList.ok).toBe(true);
    if (!archivedList.ok) {
      throw new Error("Expected archived list.");
    }
    expect(archivedList.value.map((listedRecipe) => listedRecipe.id)).toEqual(["recipe-1"]);

    const restored = await useCases.restoreRecipe("recipe-1");
    expect(restored.ok).toBe(true);
    if (!restored.ok) {
      throw new Error("Expected recipe to restore.");
    }
    expect(restored.value.archivedAt).toBeUndefined();
  });

  it("archives and deletes selected recipes in bulk", async () => {
    const secondRecipe: Recipe = { ...recipe, id: "recipe-2", title: "Soup" };
    const repository = new FakeRecipeRepository([recipe, secondRecipe]);
    const useCases = createRecipeUseCases(repository);

    const archived = await useCases.archiveRecipes(["recipe-1", "recipe-2"]);
    expect(archived.ok).toBe(true);
    if (!archived.ok) {
      throw new Error("Expected recipes to archive.");
    }
    expect(archived.value.every((listedRecipe) => listedRecipe.archivedAt)).toBe(true);

    const deleted = await useCases.deleteRecipes(["recipe-1", "recipe-2"]);
    expect(deleted.ok).toBe(true);

    const list = await useCases.listRecipes({ includeArchived: true });
    expect(list.ok).toBe(true);
    if (!list.ok) {
      throw new Error("Expected recipes list.");
    }
    expect(list.value).toEqual([]);
  });
});

class FakeRecipeRepository implements RecipeRepository {
  private readonly recipes = new Map<string, Recipe>();

  constructor(initialRecipes: ReadonlyArray<Recipe> = []) {
    initialRecipes.forEach((initialRecipe) => {
      this.recipes.set(initialRecipe.id, initialRecipe);
    });
  }

  async save(nextRecipe: Recipe) {
    this.recipes.set(nextRecipe.id, nextRecipe);
  }

  async getById(recipeId: string) {
    return this.recipes.get(recipeId);
  }

  async list() {
    return Array.from(this.recipes.values());
  }

  async delete(recipeId: string) {
    this.recipes.delete(recipeId);
  }
}
