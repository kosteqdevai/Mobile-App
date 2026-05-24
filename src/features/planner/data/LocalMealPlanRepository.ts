import type { KeyValueStore } from "../../../core/data/localJsonCollection";
import { LocalJsonCollection } from "../../../core/data/localJsonCollection";
import type { MealPlanRepository } from "../application/MealPlanRepository";
import type { MealPlan } from "../domain/mealPlan";
import { mealPlanFromRecord, mealPlanToRecord, type MealPlanRecord } from "./mealPlanMapper";

export class LocalMealPlanRepository implements MealPlanRepository {
  private readonly collection: LocalJsonCollection<MealPlanRecord>;

  constructor(storage: KeyValueStore, initialPlans: ReadonlyArray<MealPlan> = []) {
    this.collection = new LocalJsonCollection({
      storage,
      versionKey: "lacucina:schema-version",
      collectionKey: "lacucina:meal-plans",
      schemaVersion: 1,
      initialRecords: initialPlans.map(mealPlanToRecord),
    });
  }

  async save(plan: MealPlan) {
    this.collection.save(mealPlanToRecord(plan));
  }

  async getById(planId: string) {
    const record = this.collection.getById(planId);
    return record ? mealPlanFromRecord(record) : undefined;
  }

  async list() {
    return this.collection.list().map(mealPlanFromRecord);
  }

  async delete(planId: string) {
    this.collection.delete(planId);
  }
}
