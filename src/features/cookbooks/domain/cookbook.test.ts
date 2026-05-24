import { describe, expect, it } from "vitest";

import {
  addCategory,
  assignRecipeToCategory,
  createCookbook,
  findCategory,
  renameCategory,
  type Cookbook,
} from "./cookbook";

const baseCookbook: Cookbook = {
  id: "cookbook-1",
  name: "Home",
  categories: [],
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

describe("cookbook domain", () => {
  it("creates a cookbook with nested categories", () => {
    const result = createCookbook({
      ...baseCookbook,
      categories: [
        {
          id: "dinner",
          name: "Dinner",
          recipeIds: [],
          children: [
            {
              id: "quick",
              name: "Quick",
              recipeIds: ["recipe-1"],
              children: [],
            },
          ],
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected cookbook creation to succeed.");
    }

    expect(findCategory(result.value.categories, "quick")?.recipeIds).toEqual(["recipe-1"]);
  });

  it("adds root and nested categories", () => {
    const rootResult = addCategory(baseCookbook, {
      id: "dinner",
      name: "Dinner",
    });

    expect(rootResult.ok).toBe(true);
    if (!rootResult.ok) {
      throw new Error("Expected root category creation to succeed.");
    }

    const nestedResult = addCategory(rootResult.value, {
      id: "quick",
      name: "Quick meals",
      parentCategoryId: "dinner",
    });

    expect(nestedResult.ok).toBe(true);
    if (!nestedResult.ok) {
      throw new Error("Expected nested category creation to succeed.");
    }

    expect(findCategory(nestedResult.value.categories, "quick")?.name).toBe("Quick meals");
  });

  it("rejects duplicate category names among siblings", () => {
    const firstResult = addCategory(baseCookbook, {
      id: "dinner",
      name: "Dinner",
    });

    expect(firstResult.ok).toBe(true);
    if (!firstResult.ok) {
      throw new Error("Expected root category creation to succeed.");
    }

    const duplicateResult = addCategory(firstResult.value, {
      id: "dinner-2",
      name: " dinner ",
    });

    expect(duplicateResult.ok).toBe(false);
    if (duplicateResult.ok) {
      throw new Error("Expected duplicate category creation to fail.");
    }

    expect(duplicateResult.error.code).toBe("category-duplicate-name");
  });

  it("renames categories and assigns recipes", () => {
    const categoryResult = addCategory(baseCookbook, {
      id: "dinner",
      name: "Dinner",
    });

    expect(categoryResult.ok).toBe(true);
    if (!categoryResult.ok) {
      throw new Error("Expected category creation to succeed.");
    }

    const renamedResult = renameCategory(categoryResult.value, "dinner", "Weeknight");

    expect(renamedResult.ok).toBe(true);
    if (!renamedResult.ok) {
      throw new Error("Expected category rename to succeed.");
    }

    const assignedResult = assignRecipeToCategory(renamedResult.value, "dinner", "recipe-1");

    expect(assignedResult.ok).toBe(true);
    if (!assignedResult.ok) {
      throw new Error("Expected recipe assignment to succeed.");
    }

    expect(findCategory(assignedResult.value.categories, "dinner")).toEqual(
      expect.objectContaining({
        name: "Weeknight",
        recipeIds: ["recipe-1"],
      }),
    );
  });
});
