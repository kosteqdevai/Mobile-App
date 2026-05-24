import { describe, expect, it } from "vitest";

import type { Recipe } from "../../recipes/domain/recipe";
import type { RecipeRepository } from "../../recipes/application/RecipeRepository";
import type { MealPlan } from "../domain/mealPlan";
import { createMealPlanUseCases } from "./mealPlanUseCases";
import type { MealPlanRepository } from "./MealPlanRepository";

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

const plan: MealPlan = {
  id: "plan-1",
  name: "Training loop",
  loopDays: [
    {
      id: "day-1",
      label: "Training Day",
      preset: "training",
      entries: [],
    },
    {
      id: "day-2",
      label: "Non-training Day",
      preset: "nonTraining",
      entries: [],
    },
  ],
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

describe("meal plan use cases", () => {
  it("loads plans and adds saved recipes", async () => {
    const useCases = createMealPlanUseCases(
      new FakeMealPlanRepository([plan]),
      new FakeRecipeRepository([recipe]),
    );

    const loaded = await useCases.loadPlan("plan-1");
    expect(loaded.ok).toBe(true);

    const added = await useCases.addSavedRecipeToDay("plan-1", "day-1", {
      id: "entry-1",
      recipeId: "recipe-1",
      servings: 2,
    });

    expect(added.ok).toBe(true);
    if (!added.ok) {
      throw new Error("Expected plan entry.");
    }
    expect(added.value.loopDays[0]?.entries[0]?.recipeId).toBe("recipe-1");
  });

  it("changes servings, moves entries, removes entries, and reports empty days", async () => {
    const planRepository = new FakeMealPlanRepository([plan]);
    const useCases = createMealPlanUseCases(planRepository, new FakeRecipeRepository([recipe]));

    await useCases.addSavedRecipeToDay("plan-1", "day-1", {
      id: "entry-1",
      recipeId: "recipe-1",
      servings: 2,
    });

    const servings = await useCases.changeServings("plan-1", "entry-1", 4);
    expect(servings.ok).toBe(true);

    const moved = await useCases.moveEntry("plan-1", "entry-1", "day-2");
    expect(moved.ok).toBe(true);

    const removed = await useCases.removeEntry("plan-1", "entry-1");
    expect(removed.ok).toBe(true);

    const empty = await useCases.getEmptyDays("plan-1");
    expect(empty.ok).toBe(true);
    if (!empty.ok) {
      throw new Error("Expected empty days.");
    }
    expect(empty.value).toHaveLength(2);
  });

  it("configures board entries, moves them, and reports empty board days", async () => {
    const planRepository = new FakeMealPlanRepository([plan]);
    const useCases = createMealPlanUseCases(planRepository, new FakeRecipeRepository([recipe]));

    const configured = await useCases.configureBoard("plan-1", {
      preset: "customLoop",
      customDayLabels: ["Training Day", "Cardio Day"],
      slotTemplates: [{ id: "slot-dinner", label: "Dinner" }],
    });

    expect(configured.ok).toBe(true);

    const added = await useCases.addBoardEntry("plan-1", "board-day-training-day-1", {
      id: "board-entry-1",
      recipeId: "recipe-1",
      servings: 2,
      customSlotLabel: "Post workout",
      context: "cook",
    });

    expect(added.ok).toBe(true);
    if (!added.ok) {
      throw new Error("Expected board entry.");
    }
    expect(added.value.board?.days[0]?.entries[0]?.customSlotLabel).toBe("Post workout");

    const servings = await useCases.changeBoardEntryServings("plan-1", "board-entry-1", 3);
    expect(servings.ok).toBe(true);

    const moved = await useCases.moveBoardEntry("plan-1", "board-entry-1", {
      targetDayId: "board-day-cardio-day-2",
      targetSlotId: "slot-dinner",
    });

    expect(moved.ok).toBe(true);
    if (!moved.ok) {
      throw new Error("Expected board move.");
    }
    expect(moved.value.board?.days[1]?.entries[0]).toMatchObject({
      id: "board-entry-1",
      servings: 3,
      slotId: "slot-dinner",
    });

    const empty = await useCases.getEmptyBoardDays("plan-1");
    expect(empty.ok).toBe(true);
    if (!empty.ok) {
      throw new Error("Expected empty board days.");
    }
    expect(empty.value).toHaveLength(1);
  });

  it("normalizes legacy plans when listing", async () => {
    const useCases = createMealPlanUseCases(
      new FakeMealPlanRepository([plan]),
      new FakeRecipeRepository([recipe]),
    );

    const listed = await useCases.listPlans();

    expect(listed.ok).toBe(true);
    if (!listed.ok) {
      throw new Error("Expected plans.");
    }
    expect(listed.value[0]?.board?.preset).toBe("customLoop");
  });

  it("returns not found for missing recipes and plans", async () => {
    const useCases = createMealPlanUseCases(
      new FakeMealPlanRepository([plan]),
      new FakeRecipeRepository(),
    );

    const missingRecipe = await useCases.addSavedRecipeToDay("plan-1", "day-1", {
      id: "entry-1",
      recipeId: "recipe-1",
      servings: 2,
    });

    expect(missingRecipe.ok).toBe(false);
    if (missingRecipe.ok) {
      throw new Error("Expected missing recipe failure.");
    }
    expect(missingRecipe.error.code).toBe("not-found");

    const missingPlan = await useCases.loadPlan("missing");
    expect(missingPlan.ok).toBe(false);
  });

  it("returns repository errors for planner board storage failures", async () => {
    const useCases = createMealPlanUseCases(
      new FailingMealPlanRepository(),
      new FakeRecipeRepository([recipe]),
    );

    const result = await useCases.configureBoard("plan-1", {
      preset: "weekly",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected repository failure.");
    }
    expect(result.error.code).toBe("repository");
  });
});

class FakeMealPlanRepository implements MealPlanRepository {
  private readonly plans = new Map<string, MealPlan>();

  constructor(initialPlans: ReadonlyArray<MealPlan> = []) {
    initialPlans.forEach((initialPlan) => {
      this.plans.set(initialPlan.id, initialPlan);
    });
  }

  async save(nextPlan: MealPlan) {
    this.plans.set(nextPlan.id, nextPlan);
  }

  async getById(planId: string) {
    return this.plans.get(planId);
  }

  async list() {
    return Array.from(this.plans.values());
  }

  async delete(planId: string) {
    this.plans.delete(planId);
  }
}

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

class FailingMealPlanRepository implements MealPlanRepository {
  async save() {
    throw new Error("write failed");
  }

  async getById() {
    throw new Error("read failed");
  }

  async list() {
    throw new Error("read failed");
  }

  async delete() {
    throw new Error("delete failed");
  }
}
