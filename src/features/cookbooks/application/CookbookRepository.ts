import type { Cookbook } from "../domain/cookbook";

export type CookbookRepository = {
  save(cookbook: Cookbook): Promise<void>;
  getById(cookbookId: string): Promise<Cookbook | undefined>;
  list(): Promise<ReadonlyArray<Cookbook>>;
  delete(cookbookId: string): Promise<void>;
};
