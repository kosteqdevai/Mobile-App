import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createRecipeUseCases } from "../../recipes/application/recipeUseCases";
import { InMemoryRecipeRepository } from "../../recipes/data/InMemoryRecipeRepository";
import type { Recipe } from "../../recipes/domain/recipe";
import { createMealPlanUseCases } from "../application/mealPlanUseCases";
import { InMemoryMealPlanRepository } from "../data/InMemoryMealPlanRepository";
import type { MealPlan } from "../domain/mealPlan";
import { PlannerScreen } from "./PlannerScreen";

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
  nutrition: {
    calories: {
      amount: 400,
      unit: "kcal",
    },
    protein: {
      amount: 20,
      unit: "g",
    },
  },
  isFavorite: false,
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

const samplePlan: MealPlan = {
  id: "plan-1",
  name: "Training loop",
  loopDays: [
    { id: "day-training", label: "Training Day", preset: "training", entries: [] },
    { id: "day-rest", label: "Non-training Day", preset: "nonTraining", entries: [] },
  ],
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

describe("PlannerScreen", () => {
  it("configures board entries, custom slots, moves entries, and removes entries", async () => {
    const recipeRepository = new InMemoryRecipeRepository([sampleRecipe]);
    const recipeUseCases = createRecipeUseCases(recipeRepository);
    const mealPlanUseCases = createMealPlanUseCases(
      new InMemoryMealPlanRepository([samplePlan]),
      recipeRepository,
    );

    render(
      <PlannerScreen
        mealPlanUseCases={mealPlanUseCases}
        recipeUseCases={recipeUseCases}
        onChanged={vi.fn()}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Planner" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Board" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByText("No meals planned")).toHaveLength(2);

    fireEvent.change(screen.getByLabelText("Board recipe for Training Day"), {
      target: { value: "recipe-1" },
    });
    fireEvent.change(screen.getByLabelText("Board servings for Training Day"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Board slot for Training Day"), {
      target: { value: "__custom-slot" },
    });
    fireEvent.change(screen.getByLabelText("Board custom slot for Training Day"), {
      target: { value: "Post workout" },
    });
    fireEvent.change(screen.getByLabelText("Board context for Training Day"), {
      target: { value: "cook" },
    });
    fireEvent.click(
      within(screen.getByRole("region", { name: "Training Day" })).getByRole("button", {
        name: "Add to board",
      }),
    );

    expect(await screen.findByLabelText("Board servings for Lemon pasta")).toHaveValue(3);
    expect(
      screen.getByText(/Post workout .* cook .* Nutrition: Calories 600 kcal/i),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Board servings for Lemon pasta"), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update Lemon pasta board entry" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Board servings for Lemon pasta")).toHaveValue(4);
    });

    fireEvent.change(screen.getByLabelText("Move Lemon pasta to day"), {
      target: { value: "day-rest" },
    });
    fireEvent.change(screen.getByLabelText("Move Lemon pasta to slot"), {
      target: { value: "slot-dinner" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Move Lemon pasta board entry" }));

    const restDay = await screen.findByRole("region", { name: "Non-training Day" });
    expect(within(restDay).getByLabelText("Board servings for Lemon pasta")).toHaveValue(4);
    expect(within(restDay).getByText(/Dinner .* cook/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove Lemon pasta board entry" }));
    await waitFor(() => {
      expect(screen.getAllByText("No meals planned")).toHaveLength(2);
    });
  });

  it("keeps loop templates available and exposes move controls", async () => {
    const recipeRepository = new InMemoryRecipeRepository([sampleRecipe]);
    const recipeUseCases = createRecipeUseCases(recipeRepository);
    const mealPlanUseCases = createMealPlanUseCases(
      new InMemoryMealPlanRepository([samplePlan]),
      recipeRepository,
    );

    render(
      <PlannerScreen
        mealPlanUseCases={mealPlanUseCases}
        recipeUseCases={recipeUseCases}
        onChanged={vi.fn()}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Planner" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Templates" }));

    fireEvent.change(screen.getByLabelText("Recipe for Training Day"), {
      target: { value: "recipe-1" },
    });
    fireEvent.change(screen.getByLabelText("New servings for Training Day"), {
      target: { value: "2" },
    });
    fireEvent.click(
      within(screen.getByRole("region", { name: "Training Day" })).getByRole("button", {
        name: "Add recipe",
      }),
    );

    const trainingDay = screen.getByRole("region", { name: "Training Day" });
    expect(
      await within(trainingDay).findByLabelText("Move Lemon pasta to template day"),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Move Lemon pasta to template day"), {
      target: { value: "day-rest" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Move Lemon pasta template entry" }));

    const restDay = await screen.findByRole("region", { name: "Non-training Day" });
    await waitFor(() => {
      expect(within(restDay).getByLabelText("Servings for Lemon pasta")).toHaveValue(2);
    });
  });

  it("shows loading and unavailable states", async () => {
    const recipeRepository = new InMemoryRecipeRepository([sampleRecipe]);
    const recipeUseCases = createRecipeUseCases(recipeRepository);
    const mealPlanUseCases = {
      ...createMealPlanUseCases(new InMemoryMealPlanRepository([samplePlan]), recipeRepository),
      listPlans: vi.fn(() => new Promise<never>(() => undefined)),
    };

    const { rerender } = render(
      <PlannerScreen
        mealPlanUseCases={mealPlanUseCases}
        recipeUseCases={recipeUseCases}
        onChanged={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading planner");

    rerender(
      <PlannerScreen
        mealPlanUseCases={{
          ...mealPlanUseCases,
          listPlans: vi.fn(async () => ({
            ok: false,
            error: { code: "not-found", message: "Planner store unavailable" },
          })),
        }}
        recipeUseCases={recipeUseCases}
        onChanged={vi.fn()}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Planner store unavailable");
  });
});
