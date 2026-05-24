import { describe, expect, it } from "vitest";

import type { Cookbook } from "../domain/cookbook";
import { createCookbookUseCases } from "./cookbookUseCases";
import type { CookbookRepository } from "./CookbookRepository";

const cookbook: Cookbook = {
  id: "cookbook-1",
  name: "Home",
  categories: [],
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

describe("cookbook use cases", () => {
  it("creates and lists cookbooks", async () => {
    const repository = new FakeCookbookRepository();
    const useCases = createCookbookUseCases(repository);

    const created = await useCases.createCookbook(cookbook);
    expect(created.ok).toBe(true);

    const list = await useCases.listCookbooks();
    expect(list.ok).toBe(true);
    if (!list.ok) {
      throw new Error("Expected cookbook list.");
    }
    expect(list.value).toHaveLength(1);
  });

  it("manages category lifecycle and recipe assignment", async () => {
    const repository = new FakeCookbookRepository([cookbook]);
    const useCases = createCookbookUseCases(repository);

    const category = await useCases.createCategory("cookbook-1", {
      id: "dinner",
      name: "Dinner",
    });

    expect(category.ok).toBe(true);

    const renamed = await useCases.renameCategory("cookbook-1", "dinner", "Weeknight");
    expect(renamed.ok).toBe(true);

    const assigned = await useCases.assignRecipe("cookbook-1", "dinner", "recipe-1");
    expect(assigned.ok).toBe(true);
    if (!assigned.ok) {
      throw new Error("Expected recipe assignment.");
    }
    expect(assigned.value.categories[0]?.recipeIds).toEqual(["recipe-1"]);

    const unassigned = await useCases.unassignRecipe("cookbook-1", "dinner", "recipe-1");
    expect(unassigned.ok).toBe(true);
    if (!unassigned.ok) {
      throw new Error("Expected recipe unassignment.");
    }
    expect(unassigned.value.categories[0]?.recipeIds).toEqual([]);

    const deleted = await useCases.deleteCategory("cookbook-1", "dinner");
    expect(deleted.ok).toBe(true);
  });

  it("returns duplicate name and not found errors", async () => {
    const repository = new FakeCookbookRepository([cookbook]);
    const useCases = createCookbookUseCases(repository);

    await useCases.createCategory("cookbook-1", {
      id: "dinner",
      name: "Dinner",
    });

    const duplicate = await useCases.createCategory("cookbook-1", {
      id: "dinner-2",
      name: "dinner",
    });

    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) {
      throw new Error("Expected duplicate category failure.");
    }
    expect(duplicate.error.code).toBe("validation");

    const missing = await useCases.renameCategory("missing", "dinner", "Lunch");
    expect(missing.ok).toBe(false);
    if (missing.ok) {
      throw new Error("Expected missing cookbook failure.");
    }
    expect(missing.error.code).toBe("not-found");
  });
});

class FakeCookbookRepository implements CookbookRepository {
  private readonly cookbooks = new Map<string, Cookbook>();

  constructor(initialCookbooks: ReadonlyArray<Cookbook> = []) {
    initialCookbooks.forEach((initialCookbook) => {
      this.cookbooks.set(initialCookbook.id, initialCookbook);
    });
  }

  async save(nextCookbook: Cookbook) {
    this.cookbooks.set(nextCookbook.id, nextCookbook);
  }

  async getById(cookbookId: string) {
    return this.cookbooks.get(cookbookId);
  }

  async list() {
    return Array.from(this.cookbooks.values());
  }

  async delete(cookbookId: string) {
    this.cookbooks.delete(cookbookId);
  }
}
