import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { err, ok } from "../../../core/result/Result";
import type { CookbookUseCases } from "../../cookbooks/application/cookbookUseCases";
import type { Cookbook } from "../../cookbooks/domain/cookbook";
import type { CookSessionUseCases } from "../application/cookSessionUseCases";
import {
  createMemoryRecipeSharePort,
  createRecipeExportUseCases,
  type RecipeExportUseCases,
} from "../application/recipeExportUseCases";
import type { RecipeUseCases } from "../application/recipeUseCases";
import type { Recipe } from "../domain/recipe";
import { RecipeDetailScreen } from "./RecipeDetailScreen";
import { RecipeFormScreen } from "./RecipeFormScreen";
import { RecipeListScreen } from "./RecipeListScreen";

const sampleRecipe: Recipe = {
  id: "recipe-1",
  title: "Lemon pasta",
  description: "Fast dinner",
  baseServings: 2,
  ingredients: [
    { name: "Pasta", quantity: 100, unit: "g", group: "Main", note: "al dente" },
    { name: "Lemon", quantity: 1, unit: "pcs", group: "Garnish", note: "zested" },
  ],
  steps: [
    { position: 1, text: "Boil pasta." },
    { position: 2, text: "Finish with lemon." },
  ],
  cookbookId: "cookbook-default",
  categoryPath: ["Dinner"],
  tags: ["quick"],
  difficulty: "beginner",
  guidance: {
    prepAhead: "Make the sauce in the morning.",
    refrigeratorStorage: "Store chilled in a sealed container.",
    reheating: "Warm gently with pasta water.",
    leftoverUse: "Turn leftovers into a frittata.",
  },
  dietary: {
    allergens: [{ allergen: "wheat", status: "estimated" }],
    dietaryTags: [{ label: "vegetarian", status: "userVerified" }],
  },
  nutrition: {
    calories: {
      amount: 640,
      unit: "kcal",
      status: "estimated",
      source: "Manual entry",
    },
    protein: {
      amount: 24,
      unit: "g",
      status: "userVerified",
      source: "Package label",
    },
  },
  isFavorite: true,
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

const sampleCookbook: Cookbook = {
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
  ],
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

function createRecipeUseCases(overrides: Partial<RecipeUseCases> = {}): RecipeUseCases {
  return {
    createRecipe: vi.fn(async () => ok(sampleRecipe)),
    updateRecipe: vi.fn(async () => ok(sampleRecipe)),
    deleteRecipe: vi.fn(async () => ok(undefined)),
    getRecipeDetails: vi.fn(async () => ok(sampleRecipe)),
    listRecipes: vi.fn(async () => ok([sampleRecipe])),
    previewPortions: vi.fn(async (_recipeId, targetServings) =>
      ok([
        {
          name: "Pasta",
          unit: "g",
          note: "al dente",
          group: "Main",
          scaleMode: "linear",
          scalingBehavior: "linear",
          originalQuantity: 100,
          scaledQuantity: (100 * targetServings) / 2,
        },
        {
          name: "Lemon",
          unit: "pcs",
          note: "zested",
          group: "Garnish",
          scaleMode: "linear",
          scalingBehavior: "linear",
          originalQuantity: 1,
          scaledQuantity: (1 * targetServings) / 2,
        },
      ]),
    ),
    ...overrides,
  };
}

function createCookbookUseCases(overrides: Partial<CookbookUseCases> = {}): CookbookUseCases {
  return {
    createCookbook: vi.fn(),
    listCookbooks: vi.fn(async () => ok([sampleCookbook])),
    createCategory: vi.fn(),
    renameCategory: vi.fn(),
    deleteCategory: vi.fn(),
    assignRecipe: vi.fn(),
    unassignRecipe: vi.fn(),
    ...overrides,
  };
}

function createCookSessionUseCases(
  overrides: Partial<CookSessionUseCases> = {},
): CookSessionUseCases {
  return {
    loadSession: vi.fn(async () => ok(undefined)),
    saveSession: vi.fn(async (session) => ok(session)),
    clearSession: vi.fn(async () => ok(undefined)),
    ...overrides,
  };
}

function createRecipeExportUseCaseFixture(
  recipeUseCases: RecipeUseCases,
  overrides?: Partial<RecipeExportUseCases>,
): RecipeExportUseCases {
  return {
    ...createRecipeExportUseCases(recipeUseCases, createMemoryRecipeSharePort()),
    ...overrides,
  };
}

describe("RecipeListScreen", () => {
  it("shows loading, error, empty, and filtered list states", async () => {
    const neverResolvingUseCases = createRecipeUseCases({
      listRecipes: vi.fn(() => new Promise(() => undefined)),
    });

    const { rerender } = render(
      <RecipeListScreen
        recipeUseCases={neverResolvingUseCases}
        onCreateRecipe={vi.fn()}
        onEditRecipe={vi.fn()}
        onOpenRecipe={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading recipes");

    rerender(
      <RecipeListScreen
        recipeUseCases={createRecipeUseCases({
          listRecipes: vi.fn(async () =>
            err({ code: "repository", message: "Offline recipe store" }),
          ),
        })}
        onCreateRecipe={vi.fn()}
        onEditRecipe={vi.fn()}
        onOpenRecipe={vi.fn()}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Offline recipe store");

    rerender(
      <RecipeListScreen
        recipeUseCases={createRecipeUseCases({ listRecipes: vi.fn(async () => ok([])) })}
        onCreateRecipe={vi.fn()}
        onEditRecipe={vi.fn()}
        onOpenRecipe={vi.fn()}
      />,
    );

    expect(await screen.findByText("No recipes yet")).toBeInTheDocument();

    rerender(
      <RecipeListScreen
        recipeUseCases={createRecipeUseCases()}
        onCreateRecipe={vi.fn()}
        onEditRecipe={vi.fn()}
        onOpenRecipe={vi.fn()}
      />,
    );

    expect(await screen.findByRole("button", { name: /Lemon pasta/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search recipes"), { target: { value: "soup" } });
    expect(screen.getByText("No matches")).toBeInTheDocument();
  });

  it("keeps local filtering deterministic for larger recipe lists", async () => {
    const recipes = Array.from({ length: 150 }, (_, index) => ({
      ...sampleRecipe,
      id: `recipe-${index}`,
      title: `Batch recipe ${index}`,
      tags: index === 149 ? ["target"] : ["batch"],
    }));

    render(
      <RecipeListScreen
        recipeUseCases={createRecipeUseCases({
          listRecipes: vi.fn(async () => ok(recipes)),
        })}
        onCreateRecipe={vi.fn()}
        onEditRecipe={vi.fn()}
        onOpenRecipe={vi.fn()}
      />,
    );

    expect(await screen.findByRole("button", { name: /Batch recipe 149/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search recipes"), { target: { value: "target" } });

    expect(screen.getByRole("button", { name: /Batch recipe 149/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Batch recipe 1 servings/i }),
    ).not.toBeInTheDocument();
  });
});

describe("RecipeDetailScreen", () => {
  it("shows scaled ingredients without mutating base quantities", async () => {
    const recipeUseCases = createRecipeUseCases();

    render(
      <RecipeDetailScreen
        cookSessionUseCases={createCookSessionUseCases()}
        recipeId="recipe-1"
        recipeExportUseCases={createRecipeExportUseCaseFixture(recipeUseCases)}
        recipeUseCases={recipeUseCases}
        onBack={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Lemon pasta" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Target servings"), { target: { value: "4" } });

    await waitFor(() => {
      expect(screen.getByText(/200 g/i)).toBeInTheDocument();
      expect(screen.getByText(/\(base 100 g\)/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Main" })).toBeInTheDocument();
    expect(screen.getByText(/al dente/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Garnish" })).toBeInTheDocument();
    expect(screen.getByText("Storage and leftovers")).toBeInTheDocument();
    expect(screen.getByText("Make the sauce in the morning.")).toBeInTheDocument();
    expect(screen.getByText(/Review freshness and safety/i)).toBeInTheDocument();
    expect(screen.getByText("Allergen and dietary notes")).toBeInTheDocument();
    expect(screen.getByText("Contains wheat")).toBeInTheDocument();
    expect(screen.getByText("vegetarian")).toBeInTheDocument();
    expect(screen.getByText(/not guarantee/i)).toBeInTheDocument();
    expect(screen.queryByText(/allergen-free/i)).not.toBeInTheDocument();
    expect(screen.getByText("Nutrition estimate")).toBeInTheDocument();
    expect(screen.getByText(/640 kcal per recipe \/ 320 kcal per serving/i)).toBeInTheDocument();
    expect(screen.getByText(/24 g per recipe \/ 12 g per serving/i)).toBeInTheDocument();
  });

  it("shows an error when portion preview fails", async () => {
    const recipeUseCases = createRecipeUseCases({
      previewPortions: vi.fn(async () =>
        err({ code: "validation", message: "Target servings are invalid" }),
      ),
    });

    render(
      <RecipeDetailScreen
        cookSessionUseCases={createCookSessionUseCases()}
        recipeId="recipe-1"
        recipeExportUseCases={createRecipeExportUseCaseFixture(recipeUseCases)}
        recipeUseCases={recipeUseCases}
        onBack={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Target servings are invalid");
  });

  it("surfaces private export success and failure states", async () => {
    const recipeUseCases = createRecipeUseCases();
    const recipeExportUseCases = createRecipeExportUseCaseFixture(recipeUseCases, {
      shareRecipe: vi
        .fn()
        .mockResolvedValueOnce(ok(undefined))
        .mockResolvedValueOnce(
          err({ code: "share-unavailable", message: "Sharing is not available" }),
        ),
    });

    render(
      <RecipeDetailScreen
        cookSessionUseCases={createCookSessionUseCases()}
        recipeId="recipe-1"
        recipeExportUseCases={recipeExportUseCases}
        recipeUseCases={recipeUseCases}
        onBack={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Lemon pasta" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Export recipe" }));
    expect(await screen.findByRole("status")).toHaveTextContent("ready to share");

    fireEvent.click(screen.getByRole("button", { name: "Export recipe" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sharing is not available");
  });

  it("runs cook mode with persisted progress and completion state", async () => {
    const saveSession = vi.fn(async (session) => ok(session));
    const cookSessionUseCases = createCookSessionUseCases({ saveSession });
    const recipeUseCases = createRecipeUseCases();

    render(
      <RecipeDetailScreen
        cookSessionUseCases={cookSessionUseCases}
        recipeId="recipe-1"
        recipeExportUseCases={createRecipeExportUseCaseFixture(recipeUseCases)}
        recipeUseCases={recipeUseCases}
        onBack={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Lemon pasta" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cook mode" }));

    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Boil pasta.")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Mark step complete"));
    await waitFor(() => {
      expect(saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          completedStepPositions: [1],
          currentStepPosition: 1,
        }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    await waitFor(() => {
      expect(screen.getByText("Step 2 of 2")).toBeInTheDocument();
      expect(screen.getByText("Finish with lemon.")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Exit cook mode" }));
    fireEvent.click(screen.getByRole("button", { name: "Cook mode" }));
    expect(screen.getByText("Step 2 of 2")).toBeInTheDocument();
  });
});

describe("RecipeFormScreen", () => {
  it("submits valid recipe values through use cases", async () => {
    const createRecipe = vi.fn(async () => ok(sampleRecipe));
    const onSaved = vi.fn();

    render(
      <RecipeFormScreen
        cookbookUseCases={createCookbookUseCases()}
        recipeUseCases={createRecipeUseCases({ createRecipe })}
        mode="create"
        onCancel={vi.fn()}
        onSaved={onSaved}
      />,
    );

    fireEvent.change(screen.getByLabelText("Recipe title"), { target: { value: "Lemon pasta" } });
    fireEvent.change(screen.getByLabelText("Ingredient 1 name"), { target: { value: "Pasta" } });
    fireEvent.change(screen.getByLabelText("Step 1 text"), {
      target: { value: "Boil pasta." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save recipe" }));

    await waitFor(() => {
      expect(createRecipe).toHaveBeenCalled();
      expect(onSaved).toHaveBeenCalledWith("recipe-1");
    });
  });

  it("loads cookbook categories and saves the selected category path", async () => {
    const createRecipe = vi.fn(async () => ok(sampleRecipe));

    render(
      <RecipeFormScreen
        cookbookUseCases={createCookbookUseCases()}
        recipeUseCases={createRecipeUseCases({ createRecipe })}
        mode="create"
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    fireEvent.change(await screen.findByLabelText("Recipe category"), {
      target: { value: "cookbook-default:category-quick" },
    });
    fireEvent.change(screen.getByLabelText("Recipe title"), { target: { value: "Fast rice" } });
    fireEvent.change(screen.getByLabelText("Ingredient 1 name"), { target: { value: "Rice" } });
    fireEvent.change(screen.getByLabelText("Step 1 text"), {
      target: { value: "Cook rice." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save recipe" }));

    await waitFor(() => {
      expect(createRecipe).toHaveBeenCalled();
    });

    expect(createRecipe.mock.calls[0][0]).toMatchObject({
      cookbookId: "cookbook-default",
      categoryPath: ["Dinner", "Quick meals"],
    });
  });

  it("shows empty and unavailable cookbook category states", async () => {
    const emptyCookbook: Cookbook = {
      ...sampleCookbook,
      categories: [],
    };

    const emptyView = render(
      <RecipeFormScreen
        cookbookUseCases={createCookbookUseCases({
          listCookbooks: vi.fn(async () => ok([emptyCookbook])),
        })}
        recipeUseCases={createRecipeUseCases()}
        mode="create"
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    expect(await screen.findByText("No recipe categories")).toBeInTheDocument();
    emptyView.unmount();

    render(
      <RecipeFormScreen
        cookbookUseCases={createCookbookUseCases({
          listCookbooks: vi.fn(async () =>
            err({ code: "repository", message: "Cookbook store unavailable" }),
          ),
        })}
        recipeUseCases={createRecipeUseCases()}
        mode="create"
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Cookbook store unavailable");
  });

  it("submits multi-row ingredients, steps, timing, and notes through use cases", async () => {
    const createRecipe = vi.fn(async () => ok(sampleRecipe));

    render(
      <RecipeFormScreen
        cookbookUseCases={createCookbookUseCases()}
        recipeUseCases={createRecipeUseCases({ createRecipe })}
        mode="create"
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Recipe title"), { target: { value: "Layered stew" } });
    fireEvent.change(screen.getByLabelText("Prep minutes"), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("Cook minutes"), { target: { value: "45" } });
    fireEvent.change(screen.getByLabelText("Recipe notes"), {
      target: { value: "Better after a short rest." },
    });
    fireEvent.change(screen.getByLabelText("Prep-ahead notes"), {
      target: { value: "Chop vegetables in the morning." },
    });
    fireEvent.change(screen.getByLabelText("Refrigerator storage"), {
      target: { value: "Store chilled in shallow containers." },
    });
    fireEvent.change(screen.getByLabelText("Freezer storage"), {
      target: { value: "Freeze sauce only." },
    });
    fireEvent.change(screen.getByLabelText("Reheating notes"), {
      target: { value: "Reheat gently with stock." },
    });
    fireEvent.change(screen.getByLabelText("Holding notes"), {
      target: { value: "Hold warm briefly before serving." },
    });
    fireEvent.change(screen.getByLabelText("Leftover ideas"), {
      target: { value: "Use with rice bowls." },
    });
    fireEvent.click(screen.getByLabelText("Contains milk"));
    fireEvent.change(screen.getByLabelText("Milk warning status"), {
      target: { value: "userVerified" },
    });
    fireEvent.click(screen.getByLabelText("Contains sesame"));
    fireEvent.change(screen.getByLabelText("Sesame warning status"), {
      target: { value: "estimated" },
    });
    fireEvent.change(screen.getByLabelText("Dietary tags"), {
      target: { value: "vegetarian, low sodium" },
    });
    fireEvent.change(screen.getByLabelText("Dietary tag warning status"), {
      target: { value: "estimated" },
    });
    fireEvent.change(screen.getByLabelText("Calories amount"), {
      target: { value: "900" },
    });
    fireEvent.change(screen.getByLabelText("Calories nutrition status"), {
      target: { value: "estimated" },
    });
    fireEvent.change(screen.getByLabelText("Calories nutrition source"), {
      target: { value: "Chef estimate" },
    });
    fireEvent.change(screen.getByLabelText("Protein amount"), {
      target: { value: "45" },
    });
    fireEvent.change(screen.getByLabelText("Protein nutrition status"), {
      target: { value: "userVerified" },
    });
    fireEvent.change(screen.getByLabelText("Protein nutrition source"), {
      target: { value: "Package label" },
    });

    for (let index = 1; index < 10; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Add ingredient" }));
    }

    for (let index = 1; index < 6; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Add step" }));
    }

    for (let index = 0; index < 10; index += 1) {
      const rowNumber = index + 1;
      fireEvent.change(screen.getByLabelText(`Ingredient ${rowNumber} name`), {
        target: { value: `Ingredient ${rowNumber}` },
      });
      fireEvent.change(screen.getByLabelText(`Ingredient ${rowNumber} quantity`), {
        target: { value: String(rowNumber) },
      });
      fireEvent.change(screen.getByLabelText(`Ingredient ${rowNumber} unit`), {
        target: { value: "g" },
      });
    }

    fireEvent.change(screen.getByLabelText("Ingredient 1 group"), {
      target: { value: "Sauce" },
    });
    fireEvent.change(screen.getByLabelText("Ingredient 1 prep note"), {
      target: { value: "minced, divided" },
    });

    for (let index = 0; index < 6; index += 1) {
      const rowNumber = index + 1;
      fireEvent.change(screen.getByLabelText(`Step ${rowNumber} text`), {
        target: { value: `Cook step ${rowNumber}.` },
      });
    }

    fireEvent.click(screen.getByRole("button", { name: "Save recipe" }));

    await waitFor(() => {
      expect(createRecipe).toHaveBeenCalled();
    });

    const submittedRecipe = createRecipe.mock.calls[0][0];
    expect(submittedRecipe.ingredients).toHaveLength(10);
    expect(submittedRecipe.steps).toHaveLength(6);
    expect(submittedRecipe.ingredients[0]).toMatchObject({
      group: "Sauce",
      name: "Ingredient 1",
      note: "minced, divided",
      quantity: 1,
      unit: "g",
    });
    expect(submittedRecipe.steps[5]).toMatchObject({
      position: 6,
      text: "Cook step 6.",
    });
    expect(submittedRecipe.prepTimeMinutes).toBe(20);
    expect(submittedRecipe.cookTimeMinutes).toBe(45);
    expect(submittedRecipe.notes).toBe("Better after a short rest.");
    expect(submittedRecipe.guidance).toEqual({
      prepAhead: "Chop vegetables in the morning.",
      refrigeratorStorage: "Store chilled in shallow containers.",
      freezerStorage: "Freeze sauce only.",
      reheating: "Reheat gently with stock.",
      holding: "Hold warm briefly before serving.",
      leftoverUse: "Use with rice bowls.",
    });
    expect(submittedRecipe.dietary).toEqual({
      allergens: [
        { allergen: "milk", status: "userVerified" },
        { allergen: "sesame", status: "estimated" },
      ],
      dietaryTags: [
        { label: "vegetarian", status: "estimated" },
        { label: "low sodium", status: "estimated" },
      ],
    });
    expect(submittedRecipe.nutrition).toEqual({
      calories: {
        amount: 900,
        unit: "kcal",
        status: "estimated",
        source: "Chef estimate",
      },
      protein: {
        amount: 45,
        unit: "g",
        status: "userVerified",
        source: "Package label",
      },
    });
  });

  it("duplicates, removes, and reorders ingredient and step rows", () => {
    render(
      <RecipeFormScreen
        cookbookUseCases={createCookbookUseCases()}
        recipeUseCases={createRecipeUseCases()}
        mode="create"
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Ingredient 1 name"), {
      target: { value: "Pasta" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add ingredient" }));
    fireEvent.change(screen.getByLabelText("Ingredient 2 name"), {
      target: { value: "Sauce" },
    });

    fireEvent.click(
      within(screen.getByRole("group", { name: "Ingredient 2" })).getByText("Move up"),
    );
    expect(screen.getByLabelText("Ingredient 1 name")).toHaveValue("Sauce");

    fireEvent.click(
      within(screen.getByRole("group", { name: "Ingredient 1" })).getByText("Duplicate"),
    );
    expect(screen.getByLabelText("Ingredient 2 name")).toHaveValue("Sauce");

    fireEvent.click(
      within(screen.getByRole("group", { name: "Ingredient 2" })).getByText("Remove"),
    );
    expect(screen.getByLabelText("Ingredient 2 name")).toHaveValue("Pasta");
    expect(screen.queryByLabelText("Ingredient 3 name")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Step 1 text"), {
      target: { value: "Boil." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add step" }));
    fireEvent.change(screen.getByLabelText("Step 2 text"), {
      target: { value: "Serve." },
    });

    fireEvent.click(within(screen.getByRole("group", { name: "Step 2" })).getByText("Move up"));
    expect(screen.getByLabelText("Step 1 text")).toHaveValue("Serve.");

    fireEvent.click(within(screen.getByRole("group", { name: "Step 1" })).getByText("Duplicate"));
    expect(screen.getByLabelText("Step 2 text")).toHaveValue("Serve.");

    fireEvent.click(within(screen.getByRole("group", { name: "Step 2" })).getByText("Remove"));
    expect(screen.getByLabelText("Step 2 text")).toHaveValue("Boil.");
    expect(screen.queryByLabelText("Step 3 text")).not.toBeInTheDocument();
  });

  it("shows validation failures and confirms destructive deletion", async () => {
    const deleteRecipe = vi.fn(async () => ok(undefined));
    const onDeleted = vi.fn();

    render(
      <RecipeFormScreen
        cookbookUseCases={createCookbookUseCases()}
        recipeId="recipe-1"
        recipeUseCases={createRecipeUseCases({
          updateRecipe: vi.fn(async () =>
            err({ code: "validation", message: "Recipe input is invalid" }),
          ),
          deleteRecipe,
        })}
        mode="edit"
        onCancel={vi.fn()}
        onDeleted={onDeleted}
        onSaved={vi.fn()}
      />,
    );

    expect(await screen.findByDisplayValue("Lemon pasta")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save recipe" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Recipe input is invalid");

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    await waitFor(() => {
      expect(deleteRecipe).toHaveBeenCalledWith("recipe-1");
      expect(onDeleted).toHaveBeenCalled();
    });
  });
});
