import { describe, expect, it } from "vitest";

import { MemoryLocalDatabase } from "../../core/data/localDatabase";
import { IndexedDbCookbookRepository } from "../../features/cookbooks/data/IndexedDbCookbookRepository";
import type { Cookbook } from "../../features/cookbooks/domain/cookbook";
import { IndexedDbMealPlanRepository } from "../../features/planner/data/IndexedDbMealPlanRepository";
import { normalizeMealPlan, type MealPlan } from "../../features/planner/domain/mealPlan";
import { IndexedDbRecipeRepository } from "../../features/recipes/data/IndexedDbRecipeRepository";
import type { Recipe } from "../../features/recipes/domain/recipe";

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

const cookbook: Cookbook = {
  id: "cookbook-default",
  name: "Home cookbook",
  categories: [{ id: "category-dinner", name: "Dinner", recipeIds: ["recipe-1"], children: [] }],
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

const plan: MealPlan = {
  id: "plan-1",
  name: "Training loop",
  loopDays: [
    {
      id: "day-training",
      label: "Training Day",
      preset: "training",
      entries: [{ id: "entry-1", recipeId: "recipe-1", servings: 2 }],
    },
  ],
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

describe("IndexedDB repositories", () => {
  it("persists recipes, cookbooks, and meal plans across repository restarts", async () => {
    const database = new MemoryLocalDatabase();
    const firstRecipeRepository = new IndexedDbRecipeRepository(database);
    const firstCookbookRepository = new IndexedDbCookbookRepository(database);
    const firstMealPlanRepository = new IndexedDbMealPlanRepository(database);

    await firstRecipeRepository.save(recipe);
    await firstCookbookRepository.save(cookbook);
    await firstMealPlanRepository.save(plan);

    const restartedRecipeRepository = new IndexedDbRecipeRepository(database);
    const restartedCookbookRepository = new IndexedDbCookbookRepository(database);
    const restartedMealPlanRepository = new IndexedDbMealPlanRepository(database);

    await expect(restartedRecipeRepository.getById(recipe.id)).resolves.toEqual(recipe);
    await expect(restartedCookbookRepository.getById(cookbook.id)).resolves.toEqual(cookbook);
    await expect(restartedMealPlanRepository.getById(plan.id)).resolves.toEqual(
      normalizeMealPlan(plan),
    );
  });
});
