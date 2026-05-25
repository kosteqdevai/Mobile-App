import { describe, expect, it } from "vitest";

import {
  buildRecipeComponentImportSnapshot,
  createRecipeComponent,
  type RecipeComponentInput,
} from "./recipeComponent";

const validInput: RecipeComponentInput = {
  id: "component-dough",
  name: "Pierogi dough",
  baseServings: 4,
  ingredients: [{ name: " Flour ", quantity: 300, unit: " g " }],
  steps: [{ position: 2, text: " Rest the dough. " }],
  prepTimeMinutes: 20,
  cookTimeMinutes: 0,
  notes: " Keep covered. ",
  sourceRecipeId: " recipe-pierogi ",
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

describe("recipe components", () => {
  it("creates a normalized reusable component", () => {
    const result = createRecipeComponent(validInput);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value).toMatchObject({
      id: "component-dough",
      name: "Pierogi dough",
      ingredients: [{ name: "Flour", quantity: 300, unit: "g" }],
      steps: [{ position: 1, text: "Rest the dough." }],
      notes: "Keep covered.",
      sourceRecipeId: "recipe-pierogi",
    });
  });

  it("allows ingredient-only components for extraction without steps", () => {
    const result = createRecipeComponent({
      ...validInput,
      steps: [],
    });

    expect(result.ok).toBe(true);
  });

  it("rejects invalid component input", () => {
    const result = createRecipeComponent({
      ...validInput,
      name: "",
      baseServings: 0,
      ingredients: [{ name: "", quantity: 0, unit: "" }],
      createdAt: "",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        "component-name-required",
        "component-base-servings-invalid",
        "component-ingredient-name-required",
        "component-ingredient-quantity-invalid",
        "component-ingredient-unit-required",
        "component-date-required",
      ]),
    );
  });

  it("builds an independent import snapshot with the component name as default group", () => {
    const result = createRecipeComponent(validInput);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const snapshot = buildRecipeComponentImportSnapshot(result.value);

    expect(snapshot).toMatchObject({
      sourceComponentId: "component-dough",
      sourceRecipeId: "recipe-pierogi",
      name: "Pierogi dough",
      ingredients: [{ name: "Flour", group: "Pierogi dough" }],
      steps: [{ position: 1, text: "Rest the dough." }],
    });
    expect(snapshot.ingredients[0]).not.toBe(result.value.ingredients[0]);
  });
});
