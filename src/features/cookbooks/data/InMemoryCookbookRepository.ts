import type { CookbookRepository } from "../application/CookbookRepository";
import type { Cookbook } from "../domain/cookbook";
import { cookbookFromRecord, cookbookToRecord, type CookbookRecord } from "./cookbookMapper";

export class InMemoryCookbookRepository implements CookbookRepository {
  private readonly records = new Map<string, CookbookRecord>();

  constructor(initialCookbooks: ReadonlyArray<Cookbook> = []) {
    initialCookbooks.forEach((cookbook) => {
      this.records.set(cookbook.id, cookbookToRecord(cookbook));
    });
  }

  async save(cookbook: Cookbook) {
    this.records.set(cookbook.id, cookbookToRecord(cookbook));
  }

  async getById(cookbookId: string) {
    const record = this.records.get(cookbookId);
    return record ? cookbookFromRecord(record) : undefined;
  }

  async list() {
    return Array.from(this.records.values()).map(cookbookFromRecord);
  }

  async delete(cookbookId: string) {
    this.records.delete(cookbookId);
  }
}
