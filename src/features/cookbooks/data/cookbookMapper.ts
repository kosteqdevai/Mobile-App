import type { Cookbook } from "../domain/cookbook";

export type CookbookRecord = Cookbook;

export function cookbookToRecord(cookbook: Cookbook): CookbookRecord {
  return structuredClone(cookbook);
}

export function cookbookFromRecord(record: CookbookRecord): Cookbook {
  return structuredClone(record);
}
