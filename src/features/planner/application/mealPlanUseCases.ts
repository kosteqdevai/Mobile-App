import { err, ok, type Result } from "../../../core/result/Result";
import type { RecipeRepository } from "../../recipes/application/RecipeRepository";
import {
  addLoopDay,
  addMealPlanEntry,
  addMealPlanScheduleEntry,
  addPlannerBoardEntry,
  changeMealPlanEntryServings,
  changeMealPlanScheduleEntryServings,
  changePlannerBoardEntryServings,
  configureMealPlanSchedule,
  configurePlannerBoard,
  createMealPlan,
  getEmptyLoopDays,
  getEmptyPlannerBoardDays,
  moveMealPlanEntry,
  movePlannerBoardEntry,
  normalizeMealPlan,
  removeMealPlanEntry,
  removeMealPlanScheduleEntry,
  removePlannerBoardEntry,
  resolveMealPlanCalendarDay,
  resolveMealPlanCalendarRange,
  setMealPlanDateEntryEaten,
  setMealPlanDateEntryServings,
  updateMealPlanDayTargets,
  type LoopDay,
  type LoopDayInput,
  type MealPlanCalendarDaySummary,
  type MealPlan,
  type MealPlanEntryInput,
  type MealPlanInput,
  type MealPlanScheduledEntryInput,
  type MealPlanScheduleConfigurationInput,
  type PlannerBoardConfigurationInput,
  type PlannerBoardEntryInput,
  type PlannerBoardMoveInput,
  type PlannerDayBucket,
  type PlannerNutritionTargets,
} from "../domain/mealPlan";
import type { MealPlanRepository } from "./MealPlanRepository";

export type MealPlanUseCaseErrorCode = "validation" | "not-found" | "repository";

export type MealPlanUseCaseError = {
  code: MealPlanUseCaseErrorCode;
  message: string;
  details?: unknown;
};

export type MealPlanUseCases = {
  createPlan(input: MealPlanInput): Promise<Result<MealPlan, MealPlanUseCaseError>>;
  loadPlan(planId: string): Promise<Result<MealPlan, MealPlanUseCaseError>>;
  listPlans(): Promise<Result<ReadonlyArray<MealPlan>, MealPlanUseCaseError>>;
  configureSchedule(
    planId: string,
    input: MealPlanScheduleConfigurationInput,
  ): Promise<Result<MealPlan, MealPlanUseCaseError>>;
  updateScheduleDayTargets(
    planId: string,
    dayId: string,
    targets: PlannerNutritionTargets,
  ): Promise<Result<MealPlan, MealPlanUseCaseError>>;
  addScheduleEntry(
    planId: string,
    dayId: string,
    input: MealPlanScheduledEntryInput,
  ): Promise<Result<MealPlan, MealPlanUseCaseError>>;
  changeScheduleEntryServings(
    planId: string,
    entryId: string,
    servings: number,
  ): Promise<Result<MealPlan, MealPlanUseCaseError>>;
  removeScheduleEntry(
    planId: string,
    entryId: string,
  ): Promise<Result<MealPlan, MealPlanUseCaseError>>;
  setDateEntryEaten(
    planId: string,
    date: string,
    entryId: string,
    eaten: boolean,
  ): Promise<Result<MealPlan, MealPlanUseCaseError>>;
  setDateEntryServings(
    planId: string,
    date: string,
    entryId: string,
    servings: number,
  ): Promise<Result<MealPlan, MealPlanUseCaseError>>;
  resolveCalendarDay(
    planId: string,
    date: string,
  ): Promise<Result<MealPlanCalendarDaySummary, MealPlanUseCaseError>>;
  resolveCalendarRange(
    planId: string,
    startDate: string,
    dayCount: number,
  ): Promise<Result<ReadonlyArray<MealPlanCalendarDaySummary>, MealPlanUseCaseError>>;
  configureBoard(
    planId: string,
    input: PlannerBoardConfigurationInput,
  ): Promise<Result<MealPlan, MealPlanUseCaseError>>;
  addBoardEntry(
    planId: string,
    dayId: string,
    input: PlannerBoardEntryInput,
  ): Promise<Result<MealPlan, MealPlanUseCaseError>>;
  changeBoardEntryServings(
    planId: string,
    entryId: string,
    servings: number,
  ): Promise<Result<MealPlan, MealPlanUseCaseError>>;
  moveBoardEntry(
    planId: string,
    entryId: string,
    input: PlannerBoardMoveInput,
  ): Promise<Result<MealPlan, MealPlanUseCaseError>>;
  removeBoardEntry(
    planId: string,
    entryId: string,
  ): Promise<Result<MealPlan, MealPlanUseCaseError>>;
  addDay(planId: string, input: LoopDayInput): Promise<Result<MealPlan, MealPlanUseCaseError>>;
  addSavedRecipeToDay(
    planId: string,
    dayId: string,
    input: MealPlanEntryInput,
  ): Promise<Result<MealPlan, MealPlanUseCaseError>>;
  changeServings(
    planId: string,
    entryId: string,
    servings: number,
  ): Promise<Result<MealPlan, MealPlanUseCaseError>>;
  moveEntry(
    planId: string,
    entryId: string,
    targetDayId: string,
  ): Promise<Result<MealPlan, MealPlanUseCaseError>>;
  removeEntry(planId: string, entryId: string): Promise<Result<MealPlan, MealPlanUseCaseError>>;
  getEmptyDays(planId: string): Promise<Result<ReadonlyArray<LoopDay>, MealPlanUseCaseError>>;
  getEmptyBoardDays(
    planId: string,
  ): Promise<Result<ReadonlyArray<PlannerDayBucket>, MealPlanUseCaseError>>;
};

export function createMealPlanUseCases(
  planRepository: MealPlanRepository,
  recipeRepository: RecipeRepository,
): MealPlanUseCases {
  return {
    async createPlan(input) {
      const result = createMealPlan(input);

      if (!result.ok) {
        return err({
          code: "validation",
          message: "Meal plan input is invalid.",
          details: result.error,
        });
      }

      try {
        await planRepository.save(result.value);
        return ok(result.value);
      } catch (error) {
        return err(repositoryError(error));
      }
    },

    async loadPlan(planId) {
      return loadPlan(planRepository, planId);
    },

    async listPlans() {
      try {
        return ok((await planRepository.list()).map(normalizeMealPlan));
      } catch (error) {
        return err(repositoryError(error));
      }
    },

    async configureSchedule(planId, input) {
      return updatePlan(planRepository, planId, (plan) => configureMealPlanSchedule(plan, input));
    },

    async updateScheduleDayTargets(planId, dayId, targets) {
      return updatePlan(planRepository, planId, (plan) =>
        updateMealPlanDayTargets(plan, dayId, targets),
      );
    },

    async addScheduleEntry(planId, dayId, input) {
      try {
        const recipe = await recipeRepository.getById(input.recipeId);

        if (!recipe) {
          return err({
            code: "not-found",
            message: "Recipe was not found.",
          });
        }

        return updatePlan(planRepository, planId, (plan) =>
          addMealPlanScheduleEntry(plan, dayId, input),
        );
      } catch (error) {
        return err(repositoryError(error));
      }
    },

    async changeScheduleEntryServings(planId, entryId, servings) {
      return updatePlan(planRepository, planId, (plan) =>
        changeMealPlanScheduleEntryServings(plan, entryId, servings),
      );
    },

    async removeScheduleEntry(planId, entryId) {
      return updatePlan(planRepository, planId, (plan) =>
        removeMealPlanScheduleEntry(plan, entryId),
      );
    },

    async setDateEntryEaten(planId, date, entryId, eaten) {
      return updatePlan(planRepository, planId, (plan) =>
        setMealPlanDateEntryEaten(plan, date, entryId, eaten),
      );
    },

    async setDateEntryServings(planId, date, entryId, servings) {
      return updatePlan(planRepository, planId, (plan) =>
        setMealPlanDateEntryServings(plan, date, entryId, servings),
      );
    },

    async resolveCalendarDay(planId, date) {
      const plan = await loadPlan(planRepository, planId);

      if (!plan.ok) {
        return err(plan.error);
      }

      try {
        return ok(resolveMealPlanCalendarDay(plan.value, await recipeRepository.list(), date));
      } catch (error) {
        return err(repositoryError(error));
      }
    },

    async resolveCalendarRange(planId, startDate, dayCount) {
      const plan = await loadPlan(planRepository, planId);

      if (!plan.ok) {
        return err(plan.error);
      }

      try {
        return ok(
          resolveMealPlanCalendarRange(
            plan.value,
            await recipeRepository.list(),
            startDate,
            dayCount,
          ),
        );
      } catch (error) {
        return err(repositoryError(error));
      }
    },

    async configureBoard(planId, input) {
      return updatePlan(planRepository, planId, (plan) => configurePlannerBoard(plan, input));
    },

    async addBoardEntry(planId, dayId, input) {
      try {
        const recipe = await recipeRepository.getById(input.recipeId);

        if (!recipe) {
          return err({
            code: "not-found",
            message: "Recipe was not found.",
          });
        }

        return updatePlan(planRepository, planId, (plan) =>
          addPlannerBoardEntry(plan, dayId, input),
        );
      } catch (error) {
        return err(repositoryError(error));
      }
    },

    async changeBoardEntryServings(planId, entryId, servings) {
      return updatePlan(planRepository, planId, (plan) =>
        changePlannerBoardEntryServings(plan, entryId, servings),
      );
    },

    async moveBoardEntry(planId, entryId, input) {
      return updatePlan(planRepository, planId, (plan) =>
        movePlannerBoardEntry(plan, entryId, input),
      );
    },

    async removeBoardEntry(planId, entryId) {
      return updatePlan(planRepository, planId, (plan) => removePlannerBoardEntry(plan, entryId));
    },

    async addDay(planId, input) {
      return updatePlan(planRepository, planId, (plan) => addLoopDay(plan, input));
    },

    async addSavedRecipeToDay(planId, dayId, input) {
      try {
        const recipe = await recipeRepository.getById(input.recipeId);

        if (!recipe) {
          return err({
            code: "not-found",
            message: "Recipe was not found.",
          });
        }

        return updatePlan(planRepository, planId, (plan) => addMealPlanEntry(plan, dayId, input));
      } catch (error) {
        return err(repositoryError(error));
      }
    },

    async changeServings(planId, entryId, servings) {
      return updatePlan(planRepository, planId, (plan) =>
        changeMealPlanEntryServings(plan, entryId, servings),
      );
    },

    async moveEntry(planId, entryId, targetDayId) {
      return updatePlan(planRepository, planId, (plan) =>
        moveMealPlanEntry(plan, entryId, targetDayId),
      );
    },

    async removeEntry(planId, entryId) {
      return updatePlan(planRepository, planId, (plan) => removeMealPlanEntry(plan, entryId));
    },

    async getEmptyDays(planId) {
      const plan = await loadPlan(planRepository, planId);

      if (!plan.ok) {
        return plan;
      }

      return ok(getEmptyLoopDays(plan.value));
    },

    async getEmptyBoardDays(planId) {
      const plan = await loadPlan(planRepository, planId);

      if (!plan.ok) {
        return plan;
      }

      return ok(getEmptyPlannerBoardDays(plan.value));
    },
  };
}

async function loadPlan(
  repository: MealPlanRepository,
  planId: string,
): Promise<Result<MealPlan, MealPlanUseCaseError>> {
  try {
    const plan = await repository.getById(planId);

    if (!plan) {
      return err({
        code: "not-found",
        message: "Meal plan was not found.",
      });
    }

    return ok(normalizeMealPlan(plan));
  } catch (error) {
    return err(repositoryError(error));
  }
}

async function updatePlan(
  repository: MealPlanRepository,
  planId: string,
  update: (plan: MealPlan) => Result<MealPlan, unknown>,
): Promise<Result<MealPlan, MealPlanUseCaseError>> {
  try {
    const plan = await repository.getById(planId);

    if (!plan) {
      return err({
        code: "not-found",
        message: "Meal plan was not found.",
      });
    }

    const result = update(normalizeMealPlan(plan));

    if (!result.ok) {
      return err({
        code: "validation",
        message: "Meal plan update is invalid.",
        details: result.error,
      });
    }

    await repository.save(result.value);
    return ok(result.value);
  } catch (error) {
    return err(repositoryError(error));
  }
}

function repositoryError(error: unknown): MealPlanUseCaseError {
  return {
    code: "repository",
    message: "Meal plan storage is unavailable.",
    details: error,
  };
}
