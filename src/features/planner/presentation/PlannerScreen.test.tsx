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
  it("configures weekly setup, tracks eaten meals, overrides servings, and opens cook mode", async () => {
    const onOpenRecipe = vi.fn();
    renderPlanner({ onOpenRecipe });

    expect(await screen.findByRole("heading", { name: "Planner" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Board" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Templates" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Setup plan" }));
    fireEvent.change(screen.getByLabelText("Planner setup mode"), {
      target: { value: "weekly" },
    });
    fireEvent.change(screen.getByLabelText("Planner setup start date"), {
      target: { value: "2026-05-25" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply setup" }));

    expect(await screen.findByLabelText("Monday Calories target")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Monday Calories target"), {
      target: { value: "1000" },
    });
    fireEvent.change(screen.getByLabelText("Monday Protein target"), {
      target: { value: "80" },
    });
    fireEvent.click(
      within(screen.getAllByRole("region", { name: "Monday" })[0]).getByRole("button", {
        name: "Save targets",
      }),
    );

    fireEvent.change(screen.getByLabelText("Setup recipe for Monday"), {
      target: { value: "recipe-1" },
    });
    fireEvent.change(screen.getByLabelText("Setup new servings for Monday"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Setup meal label for Monday"), {
      target: { value: "Lunch" },
    });
    fireEvent.click(
      within(screen.getAllByRole("region", { name: "Monday" })[0]).getByRole("button", {
        name: "Add meal",
      }),
    );

    await waitFor(() =>
      expect(screen.getAllByText(/Calories 600 kcal/i).length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText(/Protein 30 g/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByLabelText("Mark Lemon pasta eaten on 2026-05-25"));
    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Eaten" })).toHaveTextContent(/Calories 600 kcal/i);
    });
    expect(screen.getByRole("region", { name: "Left to target" })).toHaveTextContent(
      /Calories 400 kcal/i,
    );
    expect(screen.getByRole("region", { name: "Planned left" })).toHaveTextContent(
      /Calories 0 kcal/i,
    );

    fireEvent.change(screen.getByLabelText("Date servings for Lemon pasta"), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Lemon pasta date servings" }));
    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Eaten" })).toHaveTextContent(/Calories 800 kcal/i);
    });

    fireEvent.click(screen.getByRole("button", { name: "Cook Lemon pasta" }));
    expect(onOpenRecipe).toHaveBeenCalledWith("recipe-1", 4, true);
  });

  it("supports custom loop sequencing from a start date", async () => {
    renderPlanner();

    expect(await screen.findByRole("heading", { name: "Planner" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Setup plan" }));
    fireEvent.change(screen.getByLabelText("Planner setup mode"), {
      target: { value: "customLoop" },
    });
    fireEvent.change(screen.getByLabelText("Planner setup start date"), {
      target: { value: "2026-06-01" },
    });
    fireEvent.change(screen.getByLabelText("Custom loop day labels"), {
      target: { value: "High day, Low day, Rest day" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply setup" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open 2026-06-01" })).toHaveTextContent("High day");
    });
    expect(screen.getByRole("button", { name: "Open 2026-06-02" })).toHaveTextContent("Low day");
    expect(screen.getByRole("button", { name: "Open 2026-06-03" })).toHaveTextContent("Rest day");
  });

  it("supports individual dates and month view", async () => {
    renderPlanner();

    expect(await screen.findByRole("heading", { name: "Planner" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Setup plan" }));
    fireEvent.change(screen.getByLabelText("Planner setup mode"), {
      target: { value: "individualDates" },
    });
    fireEvent.change(screen.getByLabelText("Individual planner dates"), {
      target: { value: "2026-07-04, 2026-07-05" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply setup" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open 2026-07-04" })).toHaveTextContent(
        "2026-07-04",
      );
    });
    fireEvent.click(screen.getByRole("tab", { name: "Month" }));
    expect(screen.getByRole("button", { name: "Open 2026-07-04" })).toHaveTextContent("2026-07-04");
    expect(screen.getByRole("button", { name: "Open 2026-07-05" })).toHaveTextContent("2026-07-05");
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

function renderPlanner({
  onOpenRecipe = vi.fn(),
}: {
  onOpenRecipe?: (recipeId: string, servings: number, openCookMode: boolean) => void;
} = {}) {
  const recipeRepository = new InMemoryRecipeRepository([sampleRecipe]);
  const recipeUseCases = createRecipeUseCases(recipeRepository);
  const mealPlanUseCases = createMealPlanUseCases(
    new InMemoryMealPlanRepository([samplePlan]),
    recipeRepository,
  );

  return render(
    <PlannerScreen
      mealPlanUseCases={mealPlanUseCases}
      onChanged={vi.fn()}
      onOpenRecipe={onOpenRecipe}
      recipeUseCases={recipeUseCases}
    />,
  );
}
