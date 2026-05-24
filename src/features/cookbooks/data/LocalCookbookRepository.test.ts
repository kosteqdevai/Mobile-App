import { describe, expect, it } from "vitest";

import { MemoryKeyValueStore } from "../../../core/data/localJsonCollection";
import type { Cookbook } from "../domain/cookbook";
import { LocalCookbookRepository } from "./LocalCookbookRepository";

const cookbook: Cookbook = {
  id: "cookbook-default",
  name: "Home cookbook",
  categories: [{ id: "category-dinner", name: "Dinner", recipeIds: ["recipe-1"], children: [] }],
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

describe("LocalCookbookRepository", () => {
  it("persists cookbooks across repository restarts", async () => {
    const storage = new MemoryKeyValueStore();
    const firstRepository = new LocalCookbookRepository(storage);

    await firstRepository.save(cookbook);
    const restartedRepository = new LocalCookbookRepository(storage);

    await expect(restartedRepository.getById(cookbook.id)).resolves.toEqual(cookbook);
  });
});
