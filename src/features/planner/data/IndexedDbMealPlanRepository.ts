import type { LocalDatabase } from "../../../core/data/localDatabase";
import type { MealPlanRepository } from "../application/MealPlanRepository";
import type { MealPlan } from "../domain/mealPlan";
import { mealPlanFromRecord, mealPlanToRecord, type MealPlanRecord } from "./mealPlanMapper";

export class IndexedDbMealPlanRepository implements MealPlanRepository {
  constructor(private readonly database: LocalDatabase) {}

  async save(plan: MealPlan) {
    await this.database.put("mealPlans", mealPlanToRecord(plan));
  }

  async getById(planId: string) {
    const record = await this.database.get<MealPlanRecord>("mealPlans", planId);
    return record ? mealPlanFromRecord(record) : undefined;
  }

  async list() {
    const records = await this.database.list<MealPlanRecord>("mealPlans");
    return records.map(mealPlanFromRecord);
  }

  async delete(planId: string) {
    await this.database.delete("mealPlans", planId);
  }
}
