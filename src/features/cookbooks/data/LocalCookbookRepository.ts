import type { KeyValueStore } from "../../../core/data/localJsonCollection";
import { LocalJsonCollection } from "../../../core/data/localJsonCollection";
import type { CookbookRepository } from "../application/CookbookRepository";
import type { Cookbook } from "../domain/cookbook";
import { cookbookFromRecord, cookbookToRecord, type CookbookRecord } from "./cookbookMapper";

export class LocalCookbookRepository implements CookbookRepository {
  private readonly collection: LocalJsonCollection<CookbookRecord>;

  constructor(storage: KeyValueStore, initialCookbooks: ReadonlyArray<Cookbook> = []) {
    this.collection = new LocalJsonCollection({
      storage,
      versionKey: "lacucina:schema-version",
      collectionKey: "lacucina:cookbooks",
      schemaVersion: 1,
      initialRecords: initialCookbooks.map(cookbookToRecord),
    });
  }

  async save(cookbook: Cookbook) {
    this.collection.save(cookbookToRecord(cookbook));
  }

  async getById(cookbookId: string) {
    const record = this.collection.getById(cookbookId);
    return record ? cookbookFromRecord(record) : undefined;
  }

  async list() {
    return this.collection.list().map(cookbookFromRecord);
  }

  async delete(cookbookId: string) {
    this.collection.delete(cookbookId);
  }
}
