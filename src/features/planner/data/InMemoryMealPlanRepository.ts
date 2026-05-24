import type { MealPlanRepository } from "../application/MealPlanRepository";
import type { MealPlan } from "../domain/mealPlan";
import { mealPlanFromRecord, mealPlanToRecord, type MealPlanRecord } from "./mealPlanMapper";

export class InMemoryMealPlanRepository implements MealPlanRepository {
  private readonly records = new Map<string, MealPlanRecord>();

  constructor(initialPlans: ReadonlyArray<MealPlan> = []) {
    initialPlans.forEach((plan) => {
      this.records.set(plan.id, mealPlanToRecord(plan));
    });
  }

  async save(plan: MealPlan) {
    this.records.set(plan.id, mealPlanToRecord(plan));
  }

  async getById(planId: string) {
    const record = this.records.get(planId);
    return record ? mealPlanFromRecord(record) : undefined;
  }

  async list() {
    return Array.from(this.records.values()).map(mealPlanFromRecord);
  }

  async delete(planId: string) {
    this.records.delete(planId);
  }
}
