import { describe, expect, it } from "vitest";

import type { Cookbook } from "../domain/cookbook";
import { InMemoryCookbookRepository } from "./InMemoryCookbookRepository";
import { cookbookFromRecord, cookbookToRecord } from "./cookbookMapper";

const cookbook: Cookbook = {
  id: "cookbook-1",
  name: "Home",
  categories: [{ id: "dinner", name: "Dinner", recipeIds: ["recipe-1"], children: [] }],
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

describe("cookbook data contracts", () => {
  it("round trips cookbooks through records", () => {
    expect(cookbookFromRecord(cookbookToRecord(cookbook))).toEqual(cookbook);
  });

  it("stores cookbooks through the in-memory repository contract", async () => {
    const repository = new InMemoryCookbookRepository();

    await repository.save(cookbook);
    expect(await repository.getById("cookbook-1")).toEqual(cookbook);
    expect(await repository.list()).toEqual([cookbook]);

    await repository.delete("cookbook-1");
    expect(await repository.list()).toEqual([]);
  });
});
