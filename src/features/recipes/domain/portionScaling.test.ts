import { describe, expect, it } from "vitest";

import { createRecipe, type RecipeInput } from "./recipe";
import { formatScaledQuantity, scaleQuantity, scaleRecipeIngredients } from "./portionScaling";

const recipeInput: RecipeInput = {
  id: "rice-recipe",
  title: "Rice",
  baseServings: 2,
  ingredients: [
    {
      name: "Rice",
      quantity: 200,
      unit: "g",
    },
  ],
  steps: [
    {
      position: 1,
      text: "Cook rice.",
    },
  ],
  cookbookId: "default",
  difficulty: "beginner",
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

describe("portion scaling", () => {
  it("scales the 2 to 6 servings example", () => {
    const result = scaleQuantity(200, 2, 6);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected quantity scaling to succeed.");
    }

    expect(result.value).toBe(600);
  });

  it("keeps fractional quantities precise and formats them consistently", () => {
    const result = scaleQuantity(1.5, 4, 3);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected quantity scaling to succeed.");
    }

    expect(result.value).toBe(1.125);
    expect(formatScaledQuantity(result.value)).toBe("1.13");
  });

  it("does not mutate the base recipe ingredient quantities", () => {
    const recipeResult = createRecipe(recipeInput);

    expect(recipeResult.ok).toBe(true);
    if (!recipeResult.ok) {
      throw new Error("Expected recipe creation to succeed.");
    }

    const scaledResult = scaleRecipeIngredients(recipeResult.value, 6);

    expect(scaledResult.ok).toBe(true);
    if (!scaledResult.ok) {
      throw new Error("Expected ingredient scaling to succeed.");
    }

    expect(recipeResult.value.ingredients[0]?.quantity).toBe(200);
    expect(scaledResult.value[0]?.originalQuantity).toBe(200);
    expect(scaledResult.value[0]?.scaledQuantity).toBe(600);
  });

  it("applies explicit kitchen scale modes", () => {
    const recipeResult = createRecipe({
      ...recipeInput,
      ingredients: [
        { name: "Rice", quantity: 200, unit: "g" },
        { name: "Eggs", quantity: 1, unit: "pcs", scaleMode: "integer" },
        { name: "Bay leaf", quantity: 1, unit: "pcs", scaleMode: "fixed" },
        { name: "Salt", quantity: 0.5, unit: "tsp", scaleMode: "toTaste" },
        { name: "Cake batter", quantity: 100, unit: "g", scaleMode: "panDependent" },
      ],
    });

    expect(recipeResult.ok).toBe(true);
    if (!recipeResult.ok) {
      throw new Error("Expected recipe creation to succeed.");
    }

    const scaledResult = scaleRecipeIngredients(recipeResult.value, 5);

    expect(scaledResult.ok).toBe(true);
    if (!scaledResult.ok) {
      throw new Error("Expected ingredient scaling to succeed.");
    }

    expect(scaledResult.value).toEqual([
      expect.objectContaining({
        name: "Rice",
        scaleMode: "linear",
        scalingBehavior: "linear",
        scaledQuantity: 500,
      }),
      expect.objectContaining({
        name: "Eggs",
        scaleMode: "integer",
        scalingBehavior: "rounded",
        scaledQuantity: 3,
        guidance: "Rounded to a whole usable unit.",
      }),
      expect.objectContaining({
        name: "Bay leaf",
        scaleMode: "fixed",
        scalingBehavior: "fixed",
        scaledQuantity: 1,
        guidance: "Kept fixed when servings change.",
      }),
      expect.objectContaining({
        name: "Salt",
        scaleMode: "toTaste",
        scalingBehavior: "toTaste",
        scaledQuantity: 1.25,
        guidance: "Start with this estimate, then adjust to taste.",
      }),
      expect.objectContaining({
        name: "Cake batter",
        scaleMode: "panDependent",
        scalingBehavior: "panDependent",
        scaledQuantity: 250,
        warning: "Review pan size and cook time when scaling this ingredient.",
      }),
    ]);
  });

  it("rejects invalid target servings", () => {
    const result = scaleQuantity(200, 2, 0);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected quantity scaling to fail.");
    }

    expect(result.error).toEqual(
      expect.objectContaining({
        code: "target-servings-invalid",
        path: "targetServings",
      }),
    );
  });
});
