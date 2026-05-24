import type { LocalDatabase } from "../../../core/data/localDatabase";
import type { CookbookRepository } from "../application/CookbookRepository";
import type { Cookbook } from "../domain/cookbook";
import { cookbookFromRecord, cookbookToRecord, type CookbookRecord } from "./cookbookMapper";

export class IndexedDbCookbookRepository implements CookbookRepository {
  constructor(private readonly database: LocalDatabase) {}

  async save(cookbook: Cookbook) {
    await this.database.put("cookbooks", cookbookToRecord(cookbook));
  }

  async getById(cookbookId: string) {
    const record = await this.database.get<CookbookRecord>("cookbooks", cookbookId);
    return record ? cookbookFromRecord(record) : undefined;
  }

  async list() {
    const records = await this.database.list<CookbookRecord>("cookbooks");
    return records.map(cookbookFromRecord);
  }

  async delete(cookbookId: string) {
    await this.database.delete("cookbooks", cookbookId);
  }
}
