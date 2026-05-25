import { describe, expect, it } from "vitest";

import { InMemoryRecipeComponentRepository } from "../data/InMemoryRecipeComponentRepository";
import type { RecipeComponentInput } from "../domain/recipeComponent";
import { createRecipeComponentUseCases } from "./recipeComponentUseCases";

const input: RecipeComponentInput = {
  id: "component-sauce",
  name: "Tomato sauce",
  baseServings: 2,
  ingredients: [{ name: "Tomato", quantity: 400, unit: "g" }],
  steps: [{ position: 1, text: "Simmer until thick." }],
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

describe("recipe component use cases", () => {
  it("covers create, list, get, update, import snapshot, and delete", async () => {
    const useCases = createRecipeComponentUseCases(new InMemoryRecipeComponentRepository());

    const created = await useCases.createComponent(input);
    expect(created.ok).toBe(true);

    await expect(useCases.listComponents()).resolves.toMatchObject({
      ok: true,
      value: [expect.objectContaining({ id: "component-sauce" })],
    });

    await expect(useCases.getComponent("component-sauce")).resolves.toMatchObject({
      ok: true,
      value: expect.objectContaining({ name: "Tomato sauce" }),
    });

    await expect(
      useCases.updateComponent({ ...input, name: "Fast tomato sauce" }),
    ).resolves.toMatchObject({
      ok: true,
      value: expect.objectContaining({ name: "Fast tomato sauce" }),
    });

    await expect(useCases.buildImportSnapshot("component-sauce")).resolves.toMatchObject({
      ok: true,
      value: expect.objectContaining({
        name: "Fast tomato sauce",
        ingredients: [expect.objectContaining({ group: "Fast tomato sauce" })],
      }),
    });

    await expect(useCases.deleteComponent("component-sauce")).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    await expect(useCases.getComponent("component-sauce")).resolves.toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "not-found" }),
    });
  });

  it("returns validation errors without saving invalid components", async () => {
    const useCases = createRecipeComponentUseCases(new InMemoryRecipeComponentRepository());

    await expect(useCases.createComponent({ ...input, name: "" })).resolves.toMatchObject({
      ok: false,
      error: expect.objectContaining({ code: "validation" }),
    });
    await expect(useCases.listComponents()).resolves.toMatchObject({ ok: true, value: [] });
  });
});
