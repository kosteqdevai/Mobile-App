import type { MealPlan } from "../domain/mealPlan";

export type MealPlanRepository = {
  save(plan: MealPlan): Promise<void>;
  getById(planId: string): Promise<MealPlan | undefined>;
  list(): Promise<ReadonlyArray<MealPlan>>;
  delete(planId: string): Promise<void>;
};
