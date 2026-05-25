import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { err, ok } from "../../../core/result/Result";
import type { RecipeComponentUseCases } from "../application/recipeComponentUseCases";
import type { RecipeComponent } from "../domain/recipeComponent";
import { RecipeComponentManagerScreen } from "./RecipeComponentManagerScreen";

const sampleComponent: RecipeComponent = {
  id: "component-dough",
  name: "Pierogi dough",
  baseServings: 4,
  ingredients: [{ name: "Flour", quantity: 300, unit: "g" }],
  steps: [{ position: 1, text: "Knead dough." }],
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
};

function createRecipeComponentUseCases(
  overrides: Partial<RecipeComponentUseCases> = {},
): RecipeComponentUseCases {
  return {
    createComponent: vi.fn(async () => ok(sampleComponent)),
    updateComponent: vi.fn(async () => ok(sampleComponent)),
    deleteComponent: vi.fn(async () => ok(undefined)),
    getComponent: vi.fn(async () => ok(sampleComponent)),
    listComponents: vi.fn(async () => ok([sampleComponent])),
    buildImportSnapshot: vi.fn(),
    ...overrides,
  };
}

describe("RecipeComponentManagerScreen", () => {
  it("shows loading, error, and empty library states", async () => {
    const neverResolvingUseCases = createRecipeComponentUseCases({
      listComponents: vi.fn(() => new Promise(() => undefined)),
    });

    const { rerender } = render(
      <RecipeComponentManagerScreen
        recipeComponentUseCases={neverResolvingUseCases}
        onChanged={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading components");

    rerender(
      <RecipeComponentManagerScreen
        recipeComponentUseCases={createRecipeComponentUseCases({
          listComponents: vi.fn(async () =>
            err({ code: "repository", message: "Component store unavailable" }),
          ),
        })}
        onChanged={vi.fn()}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Component store unavailable");

    rerender(
      <RecipeComponentManagerScreen
        recipeComponentUseCases={createRecipeComponentUseCases({
          listComponents: vi.fn(async () => ok([])),
        })}
        onChanged={vi.fn()}
      />,
    );

    expect(await screen.findByText("No components yet")).toBeInTheDocument();
  });

  it("creates, edits, and deletes components", async () => {
    const createComponent = vi.fn(async () => ok(sampleComponent));
    const updateComponent = vi.fn(async () => ok({ ...sampleComponent, name: "Fast dough" }));
    const deleteComponent = vi.fn(async () => ok(undefined));
    const onChanged = vi.fn();

    render(
      <RecipeComponentManagerScreen
        recipeComponentUseCases={createRecipeComponentUseCases({
          createComponent,
          updateComponent,
          deleteComponent,
        })}
        onChanged={onChanged}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Components" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Component name"), {
      target: { value: "Sauce base" },
    });
    fireEvent.change(screen.getByLabelText("Component ingredient 1 name"), {
      target: { value: "Tomato" },
    });
    fireEvent.change(screen.getByLabelText("Component ingredient 1 quantity"), {
      target: { value: "400" },
    });
    fireEvent.change(screen.getByLabelText("Component step 1 text"), {
      target: { value: "Simmer." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save component" }));

    await waitFor(() => {
      expect(createComponent).toHaveBeenCalled();
    });
    expect(createComponent.mock.calls[0][0]).toMatchObject({
      name: "Sauce base",
      ingredients: [{ name: "Tomato", quantity: 400 }],
      steps: [{ position: 1, text: "Simmer." }],
    });

    fireEvent.click(screen.getByRole("button", { name: "Edit Pierogi dough" }));
    fireEvent.change(screen.getByLabelText("Component name"), {
      target: { value: "Fast dough" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save component changes" }));

    await waitFor(() => {
      expect(updateComponent).toHaveBeenCalled();
    });
    expect(updateComponent.mock.calls[0][0]).toMatchObject({
      id: "component-dough",
      name: "Fast dough",
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete Pierogi dough" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete Pierogi dough" }));

    await waitFor(() => {
      expect(deleteComponent).toHaveBeenCalledWith("component-dough");
      expect(onChanged).toHaveBeenCalled();
    });
  });

  it("validates blank component quantity before save", async () => {
    const createComponent = vi.fn(async () => ok(sampleComponent));

    render(
      <RecipeComponentManagerScreen
        recipeComponentUseCases={createRecipeComponentUseCases({ createComponent })}
        onChanged={vi.fn()}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Components" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Component name"), {
      target: { value: "Sauce base" },
    });
    fireEvent.change(screen.getByLabelText("Component ingredient 1 name"), {
      target: { value: "Tomato" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save component" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Component ingredient 1 quantity must be greater than zero.",
    );
    expect(createComponent).not.toHaveBeenCalled();
  });
});
