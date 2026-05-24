import { describe, expect, it } from "vitest";

import type { Cookbook } from "./cookbook";
import { flattenCategoryPathOptions } from "./categoryPathOptions";

const cookbook: Cookbook = {
  id: "cookbook-default",
  name: "Home cookbook",
  categories: [
    {
      id: "category-dinner",
      name: "Dinner",
      recipeIds: [],
      children: [
        {
          id: "category-quick",
          name: "Quick meals",
          recipeIds: [],
          children: [],
        },
      ],
    },
    {
      id: "category-breakfast",
      name: "Breakfast",
      recipeIds: [],
      children: [],
    },
  ],
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

describe("flattenCategoryPathOptions", () => {
  it("returns selectable nested category paths in cookbook order", () => {
    expect(flattenCategoryPathOptions([cookbook])).toEqual([
      {
        cookbookId: "cookbook-default",
        categoryId: "category-dinner",
        label: "Dinner",
        path: ["Dinner"],
      },
      {
        cookbookId: "cookbook-default",
        categoryId: "category-quick",
        label: "Dinner / Quick meals",
        path: ["Dinner", "Quick meals"],
      },
      {
        cookbookId: "cookbook-default",
        categoryId: "category-breakfast",
        label: "Breakfast",
        path: ["Breakfast"],
      },
    ]);
  });

  it("prefixes labels when more than one cookbook is available", () => {
    expect(
      flattenCategoryPathOptions([
        cookbook,
        {
          ...cookbook,
          id: "cookbook-shared",
          name: "Shared",
          categories: [{ ...cookbook.categories[1], id: "category-shared" }],
        },
      ]).map((option) => option.label),
    ).toContain("Shared / Breakfast");
  });
});
