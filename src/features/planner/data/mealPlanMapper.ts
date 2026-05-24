import { normalizeMealPlan, type MealPlan } from "../domain/mealPlan";

export type MealPlanRecord = MealPlan;

export function mealPlanToRecord(plan: MealPlan): MealPlanRecord {
  return structuredClone(normalizeMealPlan(plan));
}

export function mealPlanFromRecord(record: MealPlanRecord): MealPlan {
  return normalizeMealPlan(structuredClone(record));
}
