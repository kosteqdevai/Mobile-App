import { describe, expect, it } from "vitest";

import { MemoryKeyValueStore } from "../../../core/data/localJsonCollection";
import { normalizeMealPlan, type MealPlan } from "../domain/mealPlan";
import { LocalMealPlanRepository } from "./LocalMealPlanRepository";

const plan: MealPlan = {
  id: "plan-1",
  name: "Training loop",
  loopDays: [{ id: "day-training", label: "Training Day", preset: "training", entries: [] }],
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

describe("LocalMealPlanRepository", () => {
  it("persists meal plans across repository restarts", async () => {
    const storage = new MemoryKeyValueStore();
    const firstRepository = new LocalMealPlanRepository(storage);

    await firstRepository.save(plan);
    const restartedRepository = new LocalMealPlanRepository(storage);

    await expect(restartedRepository.getById(plan.id)).resolves.toEqual(normalizeMealPlan(plan));
  });
});
