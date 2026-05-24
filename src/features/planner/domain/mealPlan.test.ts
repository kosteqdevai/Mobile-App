import { describe, expect, it } from "vitest";

import {
  addLoopDay,
  addMealPlanEntry,
  addPlannerBoardEntry,
  changeMealPlanEntryServings,
  changePlannerBoardEntryServings,
  configurePlannerBoard,
  createMealPlan,
  getEmptyLoopDays,
  getEmptyPlannerBoardDays,
  moveMealPlanEntry,
  movePlannerBoardEntry,
  removeMealPlanEntry,
  removePlannerBoardEntry,
  type MealPlan,
} from "./mealPlan";

const basePlan: MealPlan = {
  id: "plan-1",
  name: "Training loop",
  loopDays: [],
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

describe("meal plan domain", () => {
  it("creates a custom recurring loop plan", () => {
    const result = createMealPlan({
      ...basePlan,
      loopDays: [
        {
          id: "day-1",
          label: "Training Day",
          preset: "training",
          entries: [],
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected meal plan creation to succeed.");
    }

    expect(result.value.loopDays[0]?.preset).toBe("training");
    expect(getEmptyLoopDays(result.value)).toHaveLength(1);
  });

  it("adds recipe entries and changes servings", () => {
    const dayResult = addLoopDay(basePlan, {
      id: "day-1",
      label: "Training Day",
      preset: "training",
    });

    expect(dayResult.ok).toBe(true);
    if (!dayResult.ok) {
      throw new Error("Expected loop day creation to succeed.");
    }

    const entryResult = addMealPlanEntry(dayResult.value, "day-1", {
      id: "entry-1",
      recipeId: "recipe-1",
      servings: 2,
    });

    expect(entryResult.ok).toBe(true);
    if (!entryResult.ok) {
      throw new Error("Expected entry creation to succeed.");
    }

    const servingsResult = changeMealPlanEntryServings(entryResult.value, "entry-1", 4);

    expect(servingsResult.ok).toBe(true);
    if (!servingsResult.ok) {
      throw new Error("Expected servings update to succeed.");
    }

    expect(servingsResult.value.loopDays[0]?.entries[0]?.servings).toBe(4);
  });

  it("moves and removes entries", () => {
    const plan: MealPlan = {
      ...basePlan,
      loopDays: [
        {
          id: "day-1",
          label: "Training Day",
          preset: "training",
          entries: [
            {
              id: "entry-1",
              recipeId: "recipe-1",
              servings: 2,
            },
          ],
        },
        {
          id: "day-2",
          label: "Non-training Day",
          preset: "nonTraining",
          entries: [],
        },
      ],
    };

    const movedResult = moveMealPlanEntry(plan, "entry-1", "day-2");

    expect(movedResult.ok).toBe(true);
    if (!movedResult.ok) {
      throw new Error("Expected entry move to succeed.");
    }

    expect(movedResult.value.loopDays[0]?.entries).toEqual([]);
    expect(movedResult.value.loopDays[1]?.entries[0]?.id).toBe("entry-1");

    const removedResult = removeMealPlanEntry(movedResult.value, "entry-1");

    expect(removedResult.ok).toBe(true);
    if (!removedResult.ok) {
      throw new Error("Expected entry removal to succeed.");
    }

    expect(getEmptyLoopDays(removedResult.value)).toHaveLength(2);
  });

  it("rejects invalid servings", () => {
    const result = addMealPlanEntry(
      {
        ...basePlan,
        loopDays: [
          {
            id: "day-1",
            label: "Training Day",
            preset: "training",
            entries: [],
          },
        ],
      },
      "day-1",
      {
        id: "entry-1",
        recipeId: "recipe-1",
        servings: 0,
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected entry creation to fail.");
    }

    expect(result.error.code).toBe("servings-invalid");
  });

  it("configures a dated weekly board with custom slot templates", () => {
    const result = configurePlannerBoard(basePlan, {
      preset: "weekly",
      startDate: "2026-05-25",
      slotTemplates: [
        { id: "slot-prep", label: "Prep" },
        { id: "slot-dinner", label: "Dinner" },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected board configuration to succeed.");
    }

    expect(result.value.board?.preset).toBe("weekly");
    expect(result.value.board?.days).toHaveLength(7);
    expect(result.value.board?.days[0]).toMatchObject({
      id: "board-day-monday-1",
      label: "Monday",
      date: "2026-05-25",
    });
    expect(result.value.board?.slotTemplates).toEqual([
      { id: "slot-prep", label: "Prep" },
      { id: "slot-dinner", label: "Dinner" },
    ]);
  });

  it("supports custom loop board entries, custom slots, context, and move between buckets", () => {
    const configured = configurePlannerBoard(basePlan, {
      preset: "customLoop",
      customDayLabels: ["Training Day", "Cardio Day"],
      slotTemplates: [{ id: "slot-dinner", label: "Dinner" }],
    });

    expect(configured.ok).toBe(true);
    if (!configured.ok) {
      throw new Error("Expected custom loop board.");
    }

    const added = addPlannerBoardEntry(configured.value, "board-day-training-day-1", {
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

    const servings = changePlannerBoardEntryServings(added.value, "board-entry-1", 3);
    expect(servings.ok).toBe(true);
    if (!servings.ok) {
      throw new Error("Expected board servings update.");
    }

    const moved = movePlannerBoardEntry(servings.value, "board-entry-1", {
      targetDayId: "board-day-cardio-day-2",
      targetSlotId: "slot-dinner",
    });

    expect(moved.ok).toBe(true);
    if (!moved.ok) {
      throw new Error("Expected board entry move.");
    }

    expect(moved.value.board?.days[0]?.entries).toEqual([]);
    expect(moved.value.board?.days[1]?.entries[0]).toMatchObject({
      id: "board-entry-1",
      servings: 3,
      slotId: "slot-dinner",
      context: "cook",
    });

    const removed = removePlannerBoardEntry(moved.value, "board-entry-1");
    expect(removed.ok).toBe(true);
    if (!removed.ok) {
      throw new Error("Expected board entry removal.");
    }
    expect(getEmptyPlannerBoardDays(removed.value)).toHaveLength(2);
  });

  it("normalizes legacy loop plans into a custom board", () => {
    const legacyPlan: MealPlan = {
      ...basePlan,
      loopDays: [
        {
          id: "day-training",
          label: "Training Day",
          preset: "training",
          entries: [{ id: "entry-1", recipeId: "recipe-1", servings: 2 }],
        },
      ],
    };

    const result = createMealPlan(legacyPlan);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected legacy plan normalization.");
    }

    expect(result.value.board?.preset).toBe("customLoop");
    expect(result.value.board?.days[0]?.entries[0]).toMatchObject({
      id: "entry-1",
      recipeId: "recipe-1",
      context: "eat",
    });
  });

  it("rejects invalid board dates, slots, and targets", () => {
    const invalidDate = configurePlannerBoard(basePlan, {
      preset: "weekly",
      startDate: "2026-02-31",
    });

    expect(invalidDate.ok).toBe(false);
    if (invalidDate.ok) {
      throw new Error("Expected invalid date.");
    }
    expect(invalidDate.error.code).toBe("board-date-invalid");

    const configured = configurePlannerBoard(basePlan, {
      preset: "weekly",
      slotTemplates: [{ id: "slot-dinner", label: "Dinner" }],
    });

    expect(configured.ok).toBe(true);
    if (!configured.ok) {
      throw new Error("Expected board configuration.");
    }

    const invalidSlot = addPlannerBoardEntry(configured.value, "board-day-monday-1", {
      id: "board-entry-1",
      recipeId: "recipe-1",
      servings: 2,
      slotId: "missing-slot",
    });

    expect(invalidSlot.ok).toBe(false);
    if (invalidSlot.ok) {
      throw new Error("Expected invalid slot.");
    }
    expect(invalidSlot.error.code).toBe("board-slot-not-found");

    const invalidMove = movePlannerBoardEntry(configured.value, "missing-entry", {
      targetDayId: "missing-day",
    });

    expect(invalidMove.ok).toBe(false);
    if (invalidMove.ok) {
      throw new Error("Expected invalid move.");
    }
    expect(invalidMove.error.code).toBe("board-entry-not-found");
  });
});
