import { describe, expect, it } from "vitest";

import {
  getIngredientUnitDefinition,
  ingredientUnitDefinitions,
  ingredientUnitOptions,
} from "./ingredientUnits";

describe("ingredient unit catalog", () => {
  it("includes metric, US, and practical recipe units with unit types", () => {
    expect(ingredientUnitOptions).toEqual(
      expect.arrayContaining([
        "g",
        "ml",
        "tsp",
        "tbsp",
        "cup",
        "fl oz",
        "pt",
        "qt",
        "gal",
        "oz",
        "lb",
        "stick of butter",
        "can",
        "package",
        "pkg",
        "pinch",
        "dash",
        "clove",
        "slice",
        "piece",
        "bunch",
      ]),
    );
    expect(ingredientUnitDefinitions.every((unit) => unit.type.length > 0)).toBe(true);
  });

  it("finds definitions without converting between unit systems", () => {
    expect(getIngredientUnitDefinition("CUP")).toMatchObject({ value: "cup", type: "volume" });
    expect(getIngredientUnitDefinition("custom scoop")).toBeUndefined();
  });
});
