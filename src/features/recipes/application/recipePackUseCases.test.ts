import { describe, expect, it, vi } from "vitest";

import { err, ok } from "../../../core/result/Result";
import type { CookbookUseCases } from "../../cookbooks/application/cookbookUseCases";
import type { CookbookInput } from "../../cookbooks/domain/cookbook";
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
    deleteRecipes: vi.fn(),
    archiveRecipe: vi.fn(),
    archiveRecipes: vi.fn(),
    restoreRecipe: vi.fn(),
    getRecipeDetails: vi.fn(),
    listRecipes: vi.fn(async () => ok([sampleRecipe])),
    previewPortions: vi.fn(),
    ...overrides,
  };
}

const fixedNow = () => new Date("2026-05-24T12:00:00.000Z");
const fixedId = ({ index }: { index: number }) => `recipe-import-${index + 1}`;
const fixedCookbookId = () => "cookbook-import-reduction";

describe("recipe pack use cases", () => {
  it("exports all recipes as a Comero recipe pack", async () => {
    const useCases = createRecipePackUseCases(createRecipeUseCases(), {
      now: fixedNow,
      createId: fixedId,
    });

    const result = await useCases.exportRecipePack();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.fileName).toBe("comero-recipes-2026-05-24.json");
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
        destinationLabel: "existing cookbook assignments",
      },
    });
    expect(createRecipe).toHaveBeenCalledWith(expect.objectContaining({ id: "recipe-import-1" }));
  });

  it("imports valid recipes into a new cookbook with category assignments", async () => {
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
    const createCookbook = vi.fn(async (input: CookbookInput) =>
      ok({
        ...input,
        categories: input.categories ?? [],
      }),
    );
    const useCases = createRecipePackUseCases(createRecipeUseCases({ createRecipe }), {
      cookbookUseCases: createCookbookUseCases({ createCookbook }),
      createCookbookId: fixedCookbookId,
      createId: fixedId,
      now: fixedNow,
    });
    const pack = JSON.stringify({
      recipes: [
        {
          title: "Lean oats",
          baseServings: 1,
          ingredients: [{ name: "Oats", quantity: 60, unit: "g" }],
          steps: ["Cook oats."],
          categoryPath: ["Breakfast"],
        },
        {
          title: "Chicken bowl",
          baseServings: 2,
          ingredients: [{ name: "Chicken", quantity: 200, unit: "g" }],
          steps: ["Assemble bowl."],
          categoryPath: ["Lunch", "High protein"],
        },
        {
          title: "Greek yogurt",
          baseServings: 1,
          ingredients: [{ name: "Yogurt", quantity: 200, unit: "g" }],
          steps: ["Serve chilled."],
        },
      ],
    });

    const result = await useCases.importRecipePack(pack, {
      destination: { type: "new-cookbook", cookbookName: "Reduction diet" },
    });

    expect(result).toEqual({
      ok: true,
      value: {
        importedCount: 3,
        skippedCount: 0,
        importedTitles: ["Lean oats", "Chicken bowl", "Greek yogurt"],
        destinationLabel: "Reduction diet",
        targetCookbookId: "cookbook-import-reduction",
        targetCookbookName: "Reduction diet",
      },
    });
    expect(createCookbook).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "cookbook-import-reduction",
        name: "Reduction diet",
        categories: [
          expect.objectContaining({
            name: "Breakfast",
            recipeIds: ["recipe-import-1"],
          }),
          expect.objectContaining({
            name: "Lunch",
            recipeIds: [],
            children: [
              expect.objectContaining({
                name: "High protein",
                recipeIds: ["recipe-import-2"],
              }),
            ],
          }),
          expect.objectContaining({
            name: "General",
            recipeIds: ["recipe-import-3"],
          }),
        ],
      }),
    );
    expect(createRecipe).toHaveBeenCalledWith(
      expect.objectContaining({
        cookbookId: "cookbook-import-reduction",
        title: "Lean oats",
        categoryPath: ["Breakfast"],
      }),
    );
    expect(createRecipe).toHaveBeenCalledWith(
      expect.objectContaining({
        cookbookId: "cookbook-import-reduction",
        title: "Greek yogurt",
        categoryPath: ["General"],
      }),
    );
  });

  it("validates new cookbook destination before importing recipes", async () => {
    const createRecipe = vi.fn();
    const createCookbook = vi.fn();
    const useCases = createRecipePackUseCases(createRecipeUseCases({ createRecipe }), {
      cookbookUseCases: createCookbookUseCases({ createCookbook }),
      createId: fixedId,
      now: fixedNow,
    });
    const pack = JSON.stringify({
      recipes: [
        {
          title: "Imported soup",
          baseServings: 2,
          ingredients: [{ name: "Stock", quantity: 500, unit: "ml" }],
          steps: ["Simmer."],
        },
      ],
    });

    const result = await useCases.importRecipePack(pack, {
      destination: { type: "new-cookbook", cookbookName: " " },
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "validation",
        message: "Cookbook name is required.",
      },
    });
    expect(createCookbook).not.toHaveBeenCalled();
    expect(createRecipe).not.toHaveBeenCalled();
  });

  it("surfaces cookbook repository failures before importing recipes", async () => {
    const createRecipe = vi.fn();
    const createCookbook = vi.fn(async () =>
      err({ code: "repository" as const, message: "Cookbook storage is unavailable." }),
    );
    const useCases = createRecipePackUseCases(createRecipeUseCases({ createRecipe }), {
      cookbookUseCases: createCookbookUseCases({ createCookbook }),
      createCookbookId: fixedCookbookId,
      createId: fixedId,
      now: fixedNow,
    });
    const pack = JSON.stringify({
      recipes: [
        {
          title: "Imported soup",
          baseServings: 2,
          ingredients: [{ name: "Stock", quantity: 500, unit: "ml" }],
          steps: ["Simmer."],
        },
      ],
    });

    const result = await useCases.importRecipePack(pack, {
      destination: { type: "new-cookbook", cookbookName: "Reduction diet" },
    });

    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: "repository",
        message: "Cookbook storage is unavailable.",
      }),
    });
    expect(createRecipe).not.toHaveBeenCalled();
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

function createCookbookUseCases(overrides: Partial<CookbookUseCases> = {}): CookbookUseCases {
  return {
    createCookbook: vi.fn(async (input) =>
      ok({
        ...input,
        categories: input.categories ?? [],
      }),
    ),
    listCookbooks: vi.fn(async () => ok([])),
    createCategory: vi.fn(),
    renameCategory: vi.fn(),
    deleteCategory: vi.fn(),
    assignRecipe: vi.fn(),
    unassignRecipe: vi.fn(),
    ...overrides,
  };
}
