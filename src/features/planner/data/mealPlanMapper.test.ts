import { describe, expect, it } from "vitest";

import { normalizeMealPlan, type MealPlan } from "../domain/mealPlan";
import { InMemoryMealPlanRepository } from "./InMemoryMealPlanRepository";
import { mealPlanFromRecord, mealPlanToRecord } from "./mealPlanMapper";

const plan: MealPlan = {
  id: "plan-1",
  name: "Loop",
  loopDays: [
    {
      id: "day-1",
      label: "Training",
      preset: "training",
      entries: [{ id: "entry-1", recipeId: "recipe-1", servings: 2 }],
    },
  ],
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

describe("meal plan data contracts", () => {
  it("round trips plans through records", () => {
    expect(mealPlanFromRecord(mealPlanToRecord(plan))).toEqual(normalizeMealPlan(plan));
  });

  it("stores plans through the in-memory repository contract", async () => {
    const repository = new InMemoryMealPlanRepository();

    await repository.save(plan);
    expect(await repository.getById("plan-1")).toEqual(normalizeMealPlan(plan));
    expect(await repository.list()).toEqual([normalizeMealPlan(plan)]);

    await repository.delete("plan-1");
    expect(await repository.list()).toEqual([]);
  });
});
