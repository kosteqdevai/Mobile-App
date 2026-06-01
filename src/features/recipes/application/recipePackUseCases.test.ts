import { describe, expect, it, vi } from "vitest";

import { err, ok } from "../../../core/result/Result";
import type { Recipe } from "../domain/recipe";
import {
  createRecipePackUseCases,
  RECIPE_PACK_FORMAT,
  RECIPE_PACK_VERSION,
} from "./recipePackUseCases";
import type { RecipeUseCases } from "./recipeUseCases";

const sampleRecipe: Recipe = {
  id: "recipe-1",
  title: "Lemon pasta",
  description: "Fast dinner",
  baseServings: 2,
  ingredients: [{ name: "Pasta", quantity: 100, unit: "g", group: "Main" }],
  steps: [{ position: 1, text: "Boil pasta." }],
  cookbookId: "cookbook-default",
  categoryPath: ["Dinner"],
  tags: ["quick"],
  difficulty: "beginner",
  isFavorite: false,
  isTemplate: true,
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

function createRecipeUseCases(overrides: Partial<RecipeUseCases> = {}): RecipeUseCases {
  return {
    createRecipe: vi.fn(async (input) =>
      ok({
        ...sampleRecipe,
        ...input,
        description: input.description ?? "",
        categoryPath: input.categoryPath ?? [],
        tags: input.tags ?? [],
        isFavorite: input.isFavorite ?? false,
        isTemplate: input.isTemplate ?? false,
      }),
    ),
    updateRecipe: vi.fn(),
    deleteRecipe: vi.fn(),
    getRecipeDetails: vi.fn(),
    listRecipes: vi.fn(async () => ok([sampleRecipe])),
    previewPortions: vi.fn(),
    ...overrides,
  };
}

const fixedNow = () => new Date("2026-05-24T12:00:00.000Z");
const fixedId = ({ index }: { index: number }) => `recipe-import-${index + 1}`;

describe("recipe pack use cases", () => {
  it("exports all recipes as a LaCucina recipe pack", async () => {
    const useCases = createRecipePackUseCases(createRecipeUseCases(), {
      now: fixedNow,
      createId: fixedId,
    });

    const result = await useCases.exportRecipePack();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.fileName).toBe("lacucina-recipes-2026-05-24.json");
      expect(result.value.recipeCount).toBe(1);

      const parsed = JSON.parse(result.value.json);

      expect(parsed.format).toBe(RECIPE_PACK_FORMAT);
      expect(parsed.version).toBe(RECIPE_PACK_VERSION);
      expect(parsed.recipes[0].title).toBe("Lemon pasta");
      expect(parsed.recipes[0].isTemplate).toBe(true);
    }
  });

  it("previews valid AI-friendly recipe pack JSON", () => {
    const useCases = createRecipePackUseCases(createRecipeUseCases(), {
      now: fixedNow,
      createId: fixedId,
    });
    const pack = JSON.stringify({
      format: RECIPE_PACK_FORMAT,
      version: RECIPE_PACK_VERSION,
      recipes: [
        {
          title: "Bulk oats",
          baseServings: 4,
          ingredients: [{ name: "Oats", quantity: 200, unit: "g" }],
          steps: ["Mix oats.", "Cook gently."],
          tags: ["breakfast"],
          nutrition: { calories: 800, protein: { amount: 30, unit: "g" } },
        },
      ],
    });

    const result = useCases.previewRecipePack(pack);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.validRecipes).toHaveLength(1);
      expect(result.value.invalidRecipes).toHaveLength(0);
      expect(result.value.validRecipes[0]?.recipeInput).toMatchObject({
        id: "recipe-import-1",
        title: "Bulk oats",
        cookbookId: "cookbook-default",
        steps: [
          { position: 1, text: "Mix oats." },
          { position: 2, text: "Cook gently." },
        ],
        nutrition: {
          calories: { amount: 800, unit: "kcal" },
          protein: { amount: 30, unit: "g" },
        },
      });
    }
  });

  it("normalizes to-taste ingredients and string dietary tags from AI packs", () => {
    const useCases = createRecipePackUseCases(createRecipeUseCases(), {
      now: fixedNow,
      createId: fixedId,
    });
    const pack = JSON.stringify({
      recipes: [
        {
          title: "Tomato pasta",
          baseServings: 2,
          ingredients: [
            { name: "Pasta", quantity: 180, unit: "g" },
            { name: "Salt", quantity: 0, unit: "", note: "do smaku", scaleMode: "toTaste" },
          ],
          steps: ["Cook pasta."],
          dietary: {
            allergens: [{ allergen: "wheat", status: "contains" }],
            dietaryTags: ["vegetarian"],
          },
        },
      ],
    });

    const result = useCases.previewRecipePack(pack);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.invalidRecipes).toHaveLength(0);
      expect(result.value.validRecipes[0]?.recipeInput.ingredients[1]).toMatchObject({
        name: "Salt",
        quantity: 1,
        unit: "to taste",
        scaleMode: "toTaste",
      });
      expect(result.value.validRecipes[0]?.recipeInput.dietary?.dietaryTags).toEqual([
        { label: "vegetarian", status: "unverified" },
      ]);
      expect(result.value.validRecipes[0]?.notices[0]).toContain("Salt");
    }
  });

  it("reports invalid JSON and per-recipe validation errors", () => {
    const useCases = createRecipePackUseCases(createRecipeUseCases(), {
      now: fixedNow,
      createId: fixedId,
    });

    expect(useCases.previewRecipePack("{bad").ok).toBe(false);

    const result = useCases.previewRecipePack(
      JSON.stringify({
        recipes: [{ title: "", baseServings: 0, ingredients: [], steps: [] }],
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.validRecipes).toHaveLength(0);
      expect(result.value.invalidRecipes[0]?.errors.join(" ")).toContain("title");
      expect(result.value.invalidRecipes[0]?.errors.join(" ")).toContain("baseServings");
    }
  });

  it("imports valid recipes as new copies without preserving source ids", async () => {
    const createRecipe = vi.fn(async (input) =>
      ok({
        ...sampleRecipe,
        ...input,
        description: input.description ?? "",
        categoryPath: input.categoryPath ?? [],
        tags: input.tags ?? [],
        isFavorite: input.isFavorite ?? false,
        isTemplate: input.isTemplate ?? false,
      }),
    );
    const useCases = createRecipePackUseCases(createRecipeUseCases({ createRecipe }), {
      now: fixedNow,
      createId: fixedId,
    });
    const pack = JSON.stringify({
      recipes: [
        {
          id: "source-recipe",
          title: "Imported soup",
          baseServings: 2,
          ingredients: [{ name: "Stock", quantity: 500, unit: "ml" }],
          steps: ["Simmer."],
        },
      ],
    });

    const result = await useCases.importRecipePack(pack);

    expect(result).toEqual({
      ok: true,
      value: {
        importedCount: 1,
        skippedCount: 0,
        importedTitles: ["Imported soup"],
      },
    });
    expect(createRecipe).toHaveBeenCalledWith(expect.objectContaining({ id: "recipe-import-1" }));
  });

  it("surfaces repository failures during export", async () => {
    const useCases = createRecipePackUseCases(
      createRecipeUseCases({
        listRecipes: vi.fn(async () => err({ code: "repository", message: "Storage down" })),
      }),
    );

    const result = await useCases.exportRecipePack();

    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "repository" }),
    });
  });
});
