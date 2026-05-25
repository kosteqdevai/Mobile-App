import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MemoryLocalDatabase } from "../core/data/localDatabase";
import { MemoryKeyValueStore } from "../core/data/localJsonCollection";
import { AppProviders } from "./providers/AppProviders";
import { createBrowserAppDependencies } from "./providers/appDependencies";
import { AppRoutes } from "./routes/AppRoutes";

function renderPersistedApp(storage: MemoryKeyValueStore, database: MemoryLocalDatabase) {
  return render(
    <AppProviders dependencies={createBrowserAppDependencies(storage, database)}>
      <AppRoutes />
    </AppProviders>,
  );
}

describe("MVP flow integration", () => {
  it("creates, finds, scales, plans, and reopens persisted recipe data", async () => {
    const storage = new MemoryKeyValueStore();
    const database = new MemoryLocalDatabase();
    const view = renderPersistedApp(storage, database);

    expect(await screen.findByRole("heading", { name: "Recipes" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add recipe" }));

    fireEvent.change(screen.getByLabelText("Recipe title"), { target: { value: "Garlic soup" } });
    fireEvent.change(screen.getByLabelText("Recipe description"), {
      target: { value: "Simple recovery soup." },
    });
    fireEvent.change(screen.getByLabelText("Ingredient 1 name"), { target: { value: "Garlic" } });
    fireEvent.change(screen.getByLabelText("Ingredient 1 quantity"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Ingredient 1 unit"), { target: { value: "cloves" } });
    fireEvent.change(screen.getByLabelText("Ingredient 1 group"), { target: { value: "Base" } });
    fireEvent.change(screen.getByLabelText("Ingredient 1 prep note"), {
      target: { value: "peeled" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add ingredient" }));
    fireEvent.change(screen.getByLabelText("Ingredient 2 name"), { target: { value: "Stock" } });
    fireEvent.change(screen.getByLabelText("Ingredient 2 quantity"), { target: { value: "500" } });
    fireEvent.change(screen.getByLabelText("Ingredient 2 unit"), { target: { value: "ml" } });
    fireEvent.change(screen.getByLabelText("Step 1 text"), {
      target: { value: "Simmer until mellow." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add step" }));
    fireEvent.change(screen.getByLabelText("Step 2 text"), {
      target: { value: "Blend smooth." },
    });
    fireEvent.change(screen.getByLabelText("Prep minutes"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Cook minutes"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Recipe notes"), {
      target: { value: "Serve hot." },
    });
    fireEvent.change(screen.getByLabelText("Prep-ahead notes"), {
      target: { value: "Peel garlic before cooking." },
    });
    fireEvent.change(screen.getByLabelText("Leftover ideas"), {
      target: { value: "Use leftovers as a sauce base." },
    });
    fireEvent.click(screen.getByLabelText("Milk allergen"));
    fireEvent.change(screen.getByLabelText("Calories amount"), { target: { value: "300" } });
    fireEvent.change(screen.getByLabelText("Protein amount"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Save recipe" }));

    expect(await screen.findByRole("heading", { name: "Garlic soup" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Target servings"), { target: { value: "4" } });
    expect(await screen.findByText(/4 cloves/i)).toBeInTheDocument();
    expect(screen.getByText(/1000 ml/i)).toBeInTheDocument();
    expect(screen.getByText("Blend smooth.")).toBeInTheDocument();
    expect(screen.getByText("Peel garlic before cooking.")).toBeInTheDocument();
    expect(screen.getByText("Use leftovers as a sauce base.")).toBeInTheDocument();
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText(/\(Contains\)/)).toBeInTheDocument();
    expect(screen.queryByText("comfort food")).not.toBeInTheDocument();
    expect(
      screen.getByText(/600 kcal for 4 servings \/ 150 kcal per serving/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.change(await screen.findByLabelText("Search recipes"), {
      target: { value: "garlic" },
    });
    expect(screen.getByRole("button", { name: /Garlic soup/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Planner" }));
    expect(await screen.findByRole("heading", { name: "Planner" })).toBeInTheDocument();

    const option = screen.getAllByRole("option", { name: "Garlic soup" })[0] as HTMLOptionElement;
    fireEvent.change(screen.getByLabelText("Board recipe for Training Day"), {
      target: { value: option.value },
    });
    fireEvent.change(screen.getByLabelText("Board servings for Training Day"), {
      target: { value: "4" },
    });
    fireEvent.click(
      within(screen.getByRole("region", { name: "Training Day" })).getByRole("button", {
        name: "Add to board",
      }),
    );

    expect(await screen.findByLabelText("Board servings for Garlic soup")).toHaveValue(4);
    expect(screen.getByText(/Nutrition: Calories 600 kcal .* Protein 24 g/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Move Garlic soup to day"), {
      target: { value: "day-rest" },
    });
    fireEvent.change(screen.getByLabelText("Move Garlic soup to slot"), {
      target: { value: "slot-dinner" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Move Garlic soup board entry" }));

    const restDay = await screen.findByRole("region", { name: "Non-training Day" });
    expect(within(restDay).getByLabelText("Board servings for Garlic soup")).toHaveValue(4);

    view.unmount();
    renderPersistedApp(storage, database);

    expect(await screen.findByRole("heading", { name: "Recipes" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search recipes"), { target: { value: "garlic" } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Garlic soup/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Planner" }));
    const persistedRestDay = await screen.findByRole("region", { name: "Non-training Day" });
    expect(within(persistedRestDay).getByLabelText("Board servings for Garlic soup")).toHaveValue(
      4,
    );
  });

  it("saves a template recipe and imports it into a new recipe", async () => {
    const storage = new MemoryKeyValueStore();
    const database = new MemoryLocalDatabase();
    renderPersistedApp(storage, database);

    expect(await screen.findByRole("heading", { name: "Recipes" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add recipe" }));
    fireEvent.change(screen.getByLabelText("Recipe title"), {
      target: { value: "Pierogi dough" },
    });
    fireEvent.change(screen.getByLabelText("Ingredient 1 name"), {
      target: { value: "Flour" },
    });
    fireEvent.change(screen.getByLabelText("Ingredient 1 quantity"), {
      target: { value: "300" },
    });
    fireEvent.change(screen.getByLabelText("Step 1 text"), {
      target: { value: "Knead dough." },
    });
    fireEvent.click(screen.getByLabelText("Wheat allergen"));
    fireEvent.change(screen.getByLabelText("Calories amount"), { target: { value: "400" } });
    fireEvent.click(screen.getByLabelText("Template recipe"));
    fireEvent.click(screen.getByRole("button", { name: "Save recipe" }));
    expect(await screen.findByRole("heading", { name: "Pierogi dough" })).toBeInTheDocument();
    expect(screen.getByText("Template recipe")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add recipe" }));
    const templateSelect = (await screen.findByLabelText(
      "Template recipe to import",
    )) as HTMLSelectElement;
    expect(templateSelect.value).toMatch(/^recipe-/);
    fireEvent.click(screen.getByRole("button", { name: "Import template recipe" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Pierogi dough imported as independent recipe rows.",
    );
    expect(
      within(screen.getByRole("table", { name: "Nutrition totals" })).getByRole("row", {
        name: /Calories 400 kcal 0 kcal 400 kcal 200 kcal/i,
      }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Recipe title"), { target: { value: "Pierogi" } });
    fireEvent.change(screen.getByLabelText("Calories amount"), { target: { value: "50" } });
    fireEvent.click(screen.getByRole("button", { name: "Save recipe" }));

    expect(await screen.findByRole("heading", { name: "Pierogi" })).toBeInTheDocument();
    expect(screen.getByText("Knead dough.")).toBeInTheDocument();
    expect(screen.getAllByText(/300 g/i)).not.toHaveLength(0);
    expect(screen.getByText("Wheat")).toBeInTheDocument();
    expect(
      screen.getByText(/450 kcal for 2 servings \/ 225 kcal per serving/i),
    ).toBeInTheDocument();
  });
});
