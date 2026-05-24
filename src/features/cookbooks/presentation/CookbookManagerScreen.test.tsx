import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createRecipeUseCases } from "../../recipes/application/recipeUseCases";
import { InMemoryRecipeRepository } from "../../recipes/data/InMemoryRecipeRepository";
import type { Recipe } from "../../recipes/domain/recipe";
import { createCookbookUseCases } from "../application/cookbookUseCases";
import { InMemoryCookbookRepository } from "../data/InMemoryCookbookRepository";
import type { Cookbook } from "../domain/cookbook";
import { CookbookManagerScreen } from "./CookbookManagerScreen";

const sampleRecipe: Recipe = {
  id: "recipe-1",
  title: "Lemon pasta",
  description: "Fast dinner",
  baseServings: 2,
  ingredients: [{ name: "Pasta", quantity: 100, unit: "g" }],
  steps: [{ position: 1, text: "Boil pasta." }],
  cookbookId: "cookbook-default",
  categoryPath: ["Dinner"],
  tags: ["quick"],
  difficulty: "beginner",
  isFavorite: false,
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

const sampleCookbook: Cookbook = {
  id: "cookbook-default",
  name: "Home cookbook",
  categories: [{ id: "category-dinner", name: "Dinner", recipeIds: [], children: [] }],
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

describe("CookbookManagerScreen", () => {
  it("organizes categories and assigns saved recipes through use cases", async () => {
    const recipeUseCases = createRecipeUseCases(new InMemoryRecipeRepository([sampleRecipe]));
    const cookbookUseCases = createCookbookUseCases(
      new InMemoryCookbookRepository([sampleCookbook]),
    );

    render(
      <CookbookManagerScreen
        cookbookUseCases={cookbookUseCases}
        recipeUseCases={recipeUseCases}
        onChanged={vi.fn()}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Cookbooks" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Recipe to assign"), {
      target: { value: "recipe-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Assign" }));

    expect(await screen.findByText("Lemon pasta")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => {
      expect(screen.getByText("No assigned recipes")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("New category name"), {
      target: { value: "Breakfast" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create category" }));
    expect(await screen.findByRole("button", { name: "Breakfast" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Breakfast" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete category" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm category delete" }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Breakfast" })).not.toBeInTheDocument();
    });
  });

  it("shows loading and unavailable states", async () => {
    const recipeUseCases = createRecipeUseCases(new InMemoryRecipeRepository([sampleRecipe]));
    const cookbookUseCases = {
      ...createCookbookUseCases(new InMemoryCookbookRepository([sampleCookbook])),
      listCookbooks: vi.fn(() => new Promise<never>(() => undefined)),
    };

    const { rerender } = render(
      <CookbookManagerScreen
        cookbookUseCases={cookbookUseCases}
        recipeUseCases={recipeUseCases}
        onChanged={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading cookbooks");

    rerender(
      <CookbookManagerScreen
        cookbookUseCases={{
          ...cookbookUseCases,
          listCookbooks: vi.fn(async () => ({
            ok: false,
            error: { code: "not-found", message: "Cookbook store unavailable" },
          })),
        }}
        recipeUseCases={recipeUseCases}
        onChanged={vi.fn()}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Cookbook store unavailable");
  });
});
