import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { err, ok } from "../../../core/result/Result";
import type { RecipePackUseCases } from "../application/recipePackUseCases";
import { RecipeTransferScreen } from "./RecipeTransferScreen";
import { initialRecipeTransferScreenState } from "./RecipeTransferState";

const sampleJson = JSON.stringify({
  format: "lacucina.recipe-pack",
  version: 1,
  recipes: [
    {
      title: "Imported soup",
      baseServings: 2,
      ingredients: [{ name: "Stock", quantity: 500, unit: "ml" }],
      steps: ["Simmer."],
    },
  ],
});

function createRecipePackUseCases(overrides: Partial<RecipePackUseCases> = {}): RecipePackUseCases {
  return {
    exportRecipePack: vi.fn(async () =>
      ok({
        fileName: "lacucina-recipes-2026-05-24.json",
        json: sampleJson,
        recipeCount: 1,
      }),
    ),
    previewRecipePack: vi.fn(() =>
      ok({
        totalCount: 1,
        validRecipes: [
          {
            index: 0,
            title: "Imported soup",
            notices: [],
            recipeInput: {
              id: "recipe-import-1",
              title: "Imported soup",
              baseServings: 2,
              ingredients: [{ name: "Stock", quantity: 500, unit: "ml" }],
              steps: [{ position: 1, text: "Simmer." }],
              cookbookId: "cookbook-default",
              categoryPath: [],
              tags: [],
              difficulty: "beginner",
              createdAt: "2026-05-24T12:00:00.000Z",
              updatedAt: "2026-05-24T12:00:00.000Z",
            },
          },
        ],
        invalidRecipes: [],
      }),
    ),
    importRecipePack: vi.fn(async () =>
      ok({
        importedCount: 1,
        skippedCount: 0,
        importedTitles: ["Imported soup"],
      }),
    ),
    getAiPromptTemplate: vi.fn(() => "Return only valid JSON."),
    ...overrides,
  };
}

describe("RecipeTransferScreen", () => {
  it("exports a recipe pack and shows the generated JSON", async () => {
    const recipePackUseCases = createRecipePackUseCases();

    render(<RecipeTransferScreen recipePackUseCases={recipePackUseCases} onImported={vi.fn()} />);

    fireEvent.click(screen.getByRole("tab", { name: "Export" }));
    fireEvent.click(screen.getByRole("button", { name: "Export" }));

    expect(await screen.findByText(/1 recipes ready/)).toBeInTheDocument();
    expect(screen.getByLabelText("Exported recipe pack JSON")).toHaveValue(sampleJson);
  });

  it("previews and imports valid pasted recipes", async () => {
    const onImported = vi.fn();
    const recipePackUseCases = createRecipePackUseCases();

    render(
      <RecipeTransferScreen recipePackUseCases={recipePackUseCases} onImported={onImported} />,
    );

    fireEvent.change(screen.getByLabelText("Recipe pack JSON"), {
      target: { value: sampleJson },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview import" }));

    expect(await screen.findByText("1 valid, 0 invalid, 1 total.")).toBeInTheDocument();
    expect(screen.getByText("Imported soup")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview again" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Import valid recipes" }));

    await waitFor(() => {
      expect(onImported).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Imported 1 recipes. Skipped 0.");
    expect(recipePackUseCases.importRecipePack).toHaveBeenCalledWith(sampleJson);
  });

  it("shows invalid JSON preview errors without importing", async () => {
    const recipePackUseCases = createRecipePackUseCases({
      previewRecipePack: vi.fn(() =>
        err({ code: "invalid-json", message: "Recipe pack JSON could not be read." }),
      ),
    });

    render(<RecipeTransferScreen recipePackUseCases={recipePackUseCases} onImported={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Recipe pack JSON"), {
      target: { value: "{bad" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview import" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Recipe pack JSON could not be read.",
    );
    expect(screen.queryByRole("button", { name: "Import valid recipes" })).not.toBeInTheDocument();
  });

  it("exposes the AI prompt template", () => {
    render(
      <RecipeTransferScreen recipePackUseCases={createRecipePackUseCases()} onImported={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "AI template" }));
    expect(screen.getByLabelText("AI recipe pack prompt")).toHaveValue("Return only valid JSON.");
  });

  it("preserves controlled import status while switching backup tabs", async () => {
    const recipePackUseCases = createRecipePackUseCases({
      previewRecipePack: vi.fn(() =>
        ok({
          totalCount: 1,
          validRecipes: [
            {
              index: 0,
              title: "Salt pasta",
              notices: ['Salt was imported as "to taste" because quantity or unit was missing.'],
              recipeInput: {
                id: "recipe-import-1",
                title: "Salt pasta",
                baseServings: 2,
                ingredients: [
                  { name: "Salt", quantity: 1, unit: "to taste", scaleMode: "toTaste" },
                ],
                steps: [{ position: 1, text: "Season." }],
                cookbookId: "cookbook-default",
                categoryPath: [],
                tags: [],
                difficulty: "beginner",
                createdAt: "2026-05-24T12:00:00.000Z",
                updatedAt: "2026-05-24T12:00:00.000Z",
              },
            },
          ],
          invalidRecipes: [],
        }),
      ),
    });

    function ControlledTransferFixture() {
      const [state, setState] = useState(initialRecipeTransferScreenState);

      return (
        <RecipeTransferScreen
          recipePackUseCases={recipePackUseCases}
          transferState={state}
          onImported={vi.fn()}
          onTransferStateChange={setState}
        />
      );
    }

    render(<ControlledTransferFixture />);

    fireEvent.change(screen.getByLabelText("Recipe pack JSON"), {
      target: { value: sampleJson },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview import" }));
    expect(await screen.findByText("1 import cleanup notes were applied.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Export" }));
    fireEvent.click(screen.getByRole("tab", { name: "Import" }));

    expect(screen.getByText("Salt pasta")).toBeInTheDocument();
    expect(screen.getByText(/Salt was imported as/)).toBeInTheDocument();
  });
});
