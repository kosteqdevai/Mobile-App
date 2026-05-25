import { describe, expect, it } from "vitest";

import type { Recipe } from "./recipe";
import {
  formatNutritionAmount,
  getPlannedNutritionSummary,
  getRecipeNutritionSummary,
} from "./nutrition";

const recipe: Recipe = {
  id: "recipe-1",
  title: "Rice bowl",
  description: "",
  baseServings: 2,
  ingredients: [{ name: "Rice", quantity: 200, unit: "g" }],
  steps: [{ position: 1, text: "Cook rice." }],
  cookbookId: "cookbook-default",
  categoryPath: ["Dinner"],
  tags: [],
  difficulty: "beginner",
  isFavorite: false,
  nutrition: {
    calories: {
      amount: 500,
      unit: "kcal",
    },
    protein: {
      amount: 20,
      unit: "g",
    },
  },
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

describe("nutrition summaries", () => {
  it("returns manual recipe and per-serving nutrition estimates", () => {
    const summary = getRecipeNutritionSummary(recipe);

    expect(summary).toEqual([
      expect.objectContaining({
        label: "Calories",
        recipeAmount: 500,
        perServingAmount: 250,
      }),
      expect.objectContaining({
        label: "Protein",
        recipeAmount: 20,
        perServingAmount: 10,
      }),
    ]);
  });

  it("scales planned nutrition by target servings without mutating recipe estimates", () => {
    const plannedSummary = getPlannedNutritionSummary(recipe, 3);

    expect(plannedSummary[0]).toMatchObject({
      label: "Calories",
      plannedAmount: 750,
      recipeAmount: 500,
      perServingAmount: 250,
    });
    expect(recipe.nutrition?.calories?.amount).toBe(500);
  });

  it("formats nutrition display values", () => {
    expect(formatNutritionAmount(10)).toBe("10");
    expect(formatNutritionAmount(10.25)).toBe("10.3");
  });
});
