import { describe, expect, it } from "vitest";

import { createRecipe, type RecipeInput } from "./recipe";

const validRecipeInput: RecipeInput = {
  id: "recipe-1",
  title: "Tomato rice",
  description: "Simple pantry meal",
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
      text: "Cook the rice.",
    },
  ],
  cookbookId: "default-cookbook",
  categoryPath: ["Dinner", "Quick meals"],
  tags: ["Dinner", " quick ", "Dinner"],
  prepTimeMinutes: 5,
  cookTimeMinutes: 20,
  difficulty: "beginner",
  notes: "Works with leftover sauce.",
  guidance: {
    prepAhead: " Cook rice one day ahead. ",
    refrigeratorStorage: "Keep chilled in a sealed container.",
    freezerStorage: " ",
    reheating: "Reheat gently with a splash of water.",
    holding: "Hold warm briefly before serving.",
    leftoverUse: "Make fried rice.",
  },
  dietary: {
    allergens: [
      { allergen: "wheat", status: "estimated" },
      { allergen: "sesame", status: "userVerified" },
    ],
    dietaryTags: [
      { label: " Vegetarian ", status: "unverified" },
      { label: "vegetarian", status: "estimated" },
    ],
  },
  nutrition: {
    calories: {
      amount: 540,
      unit: "kcal",
      status: "estimated",
      source: " Manual estimate ",
    },
    sodium: {
      amount: 600,
      unit: "mg",
      status: "partiallyMapped",
      source: "Label review",
    },
  },
  isFavorite: true,
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

describe("createRecipe", () => {
  it("creates a valid recipe with normalized tags", () => {
    const result = createRecipe(validRecipeInput);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected a valid recipe.");
    }

    expect(result.value.title).toBe("Tomato rice");
    expect(result.value.baseServings).toBe(2);
    expect(result.value.ingredients[0]?.quantity).toBe(200);
    expect(result.value.categoryPath).toEqual(["Dinner", "Quick meals"]);
    expect(result.value.tags).toEqual(["dinner", "quick"]);
    expect(result.value.guidance).toEqual({
      prepAhead: "Cook rice one day ahead.",
      refrigeratorStorage: "Keep chilled in a sealed container.",
      freezerStorage: undefined,
      reheating: "Reheat gently with a splash of water.",
      holding: "Hold warm briefly before serving.",
      leftoverUse: "Make fried rice.",
    });
    expect(result.value.dietary).toEqual({
      allergens: [
        { allergen: "wheat", status: "estimated" },
        { allergen: "sesame", status: "userVerified" },
      ],
      dietaryTags: [{ label: "vegetarian", status: "estimated" }],
    });
    expect(result.value.nutrition).toEqual({
      calories: {
        amount: 540,
        unit: "kcal",
        status: "estimated",
        source: "Manual estimate",
      },
      sodium: {
        amount: 600,
        unit: "mg",
        status: "partiallyMapped",
        source: "Label review",
      },
    });
    expect(result.value.isFavorite).toBe(true);
  });

  it("rejects an empty recipe title", () => {
    const result = createRecipe({
      ...validRecipeInput,
      title: "   ",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected recipe validation to fail.");
    }

    expect(result.error).toContainEqual(
      expect.objectContaining({
        code: "recipe-title-required",
        path: "title",
      }),
    );
  });

  it("rejects invalid base servings", () => {
    const result = createRecipe({
      ...validRecipeInput,
      baseServings: 0,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected recipe validation to fail.");
    }

    expect(result.error).toContainEqual(
      expect.objectContaining({
        code: "recipe-base-servings-invalid",
        path: "baseServings",
      }),
    );
  });

  it("rejects invalid ingredient quantities", () => {
    const result = createRecipe({
      ...validRecipeInput,
      ingredients: [
        {
          name: "Rice",
          quantity: -100,
          unit: "g",
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected recipe validation to fail.");
    }

    expect(result.error).toContainEqual(
      expect.objectContaining({
        code: "ingredient-quantity-invalid",
        path: "ingredients.0.quantity",
      }),
    );
  });

  it("rejects invalid ingredient scale modes", () => {
    const result = createRecipe({
      ...validRecipeInput,
      ingredients: [
        {
          name: "Eggs",
          quantity: 2,
          unit: "pcs",
          scaleMode: "sometimes",
        },
      ],
    } as RecipeInput);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected recipe validation to fail.");
    }

    expect(result.error).toContainEqual(
      expect.objectContaining({
        code: "ingredient-scale-mode-invalid",
        path: "ingredients.0.scaleMode",
      }),
    );
  });

  it("rejects invalid allergen and dietary metadata", () => {
    const result = createRecipe({
      ...validRecipeInput,
      dietary: {
        allergens: [{ allergen: "mustard", status: "estimated" }],
        dietaryTags: [{ label: "  ", status: "unchecked" }],
      },
    } as RecipeInput);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected recipe validation to fail.");
    }

    expect(result.error).toContainEqual(
      expect.objectContaining({
        code: "recipe-allergen-invalid",
        path: "dietary.allergens.0.allergen",
      }),
    );
    expect(result.error).toContainEqual(
      expect.objectContaining({
        code: "recipe-dietary-flag-invalid",
        path: "dietary.dietaryTags.0.label",
      }),
    );
  });

  it("rejects invalid nutrition estimates", () => {
    const result = createRecipe({
      ...validRecipeInput,
      nutrition: {
        calories: {
          amount: -1,
          unit: "g",
          status: "estimated",
          source: "",
        },
      },
    } as RecipeInput);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected recipe validation to fail.");
    }

    expect(result.error).toContainEqual(
      expect.objectContaining({
        code: "recipe-nutrition-invalid",
        path: "nutrition.calories.amount",
      }),
    );
    expect(result.error).toContainEqual(
      expect.objectContaining({
        code: "recipe-nutrition-invalid",
        path: "nutrition.calories.unit",
      }),
    );
    expect(result.error).toContainEqual(
      expect.objectContaining({
        code: "recipe-nutrition-invalid",
        path: "nutrition.calories.source",
      }),
    );
  });
});
