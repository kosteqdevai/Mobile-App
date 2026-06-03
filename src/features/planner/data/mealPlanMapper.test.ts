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

  it("preserves schedule date states through repository reload", async () => {
    const repository = new InMemoryMealPlanRepository();
    const scheduledPlan: MealPlan = {
      ...plan,
      schedule: {
        mode: "weekly",
        startDate: "2026-05-25",
        days: [
          {
            id: "schedule-day-monday-1",
            label: "Monday",
            targets: { calories: 1000 },
            entries: [
              {
                id: "schedule-entry-1",
                recipeId: "recipe-1",
                servings: 2,
                slotLabel: "Lunch",
                context: "eat",
              },
            ],
          },
        ],
      },
      dateStates: [
        {
          date: "2026-05-25",
          eatenEntryIds: ["schedule-entry-1"],
          servingOverrides: [{ entryId: "schedule-entry-1", servings: 3 }],
        },
      ],
    };

    await repository.save(scheduledPlan);

    expect(await repository.getById("plan-1")).toEqual(normalizeMealPlan(scheduledPlan));
  });

  it("maps legacy board-only records into schedules", () => {
    const record = mealPlanToRecord({
      ...plan,
      board: {
        preset: "weekly",
        startDate: "2026-05-25",
        slotTemplates: [{ id: "slot-dinner", label: "Dinner" }],
        days: [
          {
            id: "board-day-monday-1",
            label: "Monday",
            date: "2026-05-25",
            entries: [
              {
                id: "board-entry-1",
                recipeId: "recipe-1",
                servings: 2,
                slotId: "slot-dinner",
              },
            ],
          },
        ],
      },
    });
    const legacyRecord = { ...record, schedule: undefined };

    const restored = mealPlanFromRecord(legacyRecord);

    expect(restored.schedule).toMatchObject({
      mode: "weekly",
      days: [{ id: "board-day-monday-1", entries: [{ id: "board-entry-1" }] }],
    });
  });
});
