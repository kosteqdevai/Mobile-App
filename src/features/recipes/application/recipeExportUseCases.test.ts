import { describe, expect, it, vi } from "vitest";

import { err, ok } from "../../../core/result/Result";
import type { RecipeUseCases } from "./recipeUseCases";
import {
  createMemoryRecipeSharePort,
  createRecipeExportUseCases,
  type RecipeSharePort,
} from "./recipeExportUseCases";

const recipeUseCases: RecipeUseCases = {
  createRecipe: vi.fn(),
  updateRecipe: vi.fn(),
  deleteRecipe: vi.fn(),
  listRecipes: vi.fn(),
  getRecipeDetails: vi.fn(async () =>
    ok({
      id: "recipe-1",
      title: "Lemon pasta",
      description: "Fast dinner",
      baseServings: 2,
      ingredients: [{ name: "Pasta", quantity: 100, unit: "g", group: "Main", note: "al dente" }],
      steps: [{ position: 1, text: "Boil pasta." }],
      cookbookId: "cookbook-default",
      categoryPath: ["Dinner"],
      tags: ["quick"],
      prepTimeMinutes: 10,
      cookTimeMinutes: 15,
      difficulty: "beginner",
      isFavorite: false,
      notes: "Finish with pepper.",
      guidance: {
        prepAhead: "Make sauce up to one day ahead.",
        refrigeratorStorage: "Store chilled in a sealed container.",
        reheating: "Reheat gently.",
        holding: "Hold warm briefly.",
        leftoverUse: "Pack with salad.",
      },
      createdAt: "2026-05-22T00:00:00.000Z",
      updatedAt: "2026-05-22T00:00:00.000Z",
    }),
  ),
  previewPortions: vi.fn(async () =>
    ok([
      {
        name: "Pasta",
        unit: "g",
        group: "Main",
        note: "al dente",
        scaleMode: "linear",
        scalingBehavior: "linear",
        originalQuantity: 100,
        scaledQuantity: 200,
      },
    ]),
  ),
};

describe("recipe export use cases", () => {
  it("formats private text exports without creating public links", async () => {
    const useCases = createRecipeExportUseCases(recipeUseCases, createMemoryRecipeSharePort());

    const result = await useCases.exportRecipeText("recipe-1", 4);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.text).toContain("Yield: 4 servings (base 2)");
      expect(result.value.text).toContain("Time: prep 10 min, cook 15 min, total 25 min");
      expect(result.value.text).toContain("Main:");
      expect(result.value.text).toContain("- 200 g Pasta, al dente (base 100 g)");
      expect(result.value.text).toContain("Storage and leftovers:");
      expect(result.value.text).toContain("- Prep ahead: Make sauce up to one day ahead.");
      expect(result.value.text).toContain("User-entered guidance");
      expect(result.value.text).toContain("Private LaCucina text export");
      expect(result.value.text).not.toContain("http");
    }
  });

  it("surfaces share adapter failures", async () => {
    const sharePort: RecipeSharePort = {
      shareText: vi.fn(async () =>
        err({ code: "share-unavailable", message: "Sharing is unavailable" }),
      ),
    };
    const useCases = createRecipeExportUseCases(recipeUseCases, sharePort);

    const result = await useCases.shareRecipe("recipe-1", 4);

    expect(result).toEqual({
      ok: false,
      error: { code: "share-unavailable", message: "Sharing is unavailable" },
    });
  });
});
