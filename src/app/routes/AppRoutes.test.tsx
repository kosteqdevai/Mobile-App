import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppProviders } from "../providers/AppProviders";
import { createDefaultAppDependencies } from "../providers/appDependencies";
import { AppRoutes } from "./AppRoutes";

describe("AppRoutes", () => {
  it("navigates between the MVP screens without auth guards for the local-only MVP", async () => {
    render(
      <AppProviders dependencies={createDefaultAppDependencies()}>
        <AppRoutes />
      </AppProviders>,
    );

    expect(await screen.findByRole("heading", { name: "Recipes" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cookbooks" }));
    expect(await screen.findByRole("heading", { name: "Cookbooks" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Planner" }));
    expect(await screen.findByRole("heading", { name: "Planner" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Components" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Backup" }));
    expect(await screen.findByRole("heading", { name: "Backup" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Recipes" }));
    fireEvent.click(await screen.findByRole("button", { name: /Tomato rice/i }));
    expect(await screen.findByRole("heading", { name: "Tomato rice" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Recipes" })).toBeInTheDocument();
    });
  });

  it("preserves backup import preview state across top-level navigation tabs", async () => {
    render(
      <AppProviders dependencies={createDefaultAppDependencies()}>
        <AppRoutes />
      </AppProviders>,
    );

    expect(await screen.findByRole("heading", { name: "Recipes" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Backup" }));
    fireEvent.change(await screen.findByLabelText("Recipe pack JSON"), {
      target: {
        value: JSON.stringify({
          format: "lacucina.recipe-pack",
          version: 1,
          recipes: [
            {
              title: "Stateful soup",
              baseServings: 2,
              ingredients: [{ name: "Stock", quantity: 500, unit: "ml" }],
              steps: ["Simmer."],
            },
          ],
        }),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview import" }));
    expect(await screen.findByText("Stateful soup")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Recipes" }));
    expect(await screen.findByRole("heading", { name: "Recipes" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Backup" }));

    expect(await screen.findByText("Stateful soup")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import valid recipes" })).toBeInTheDocument();
  });
});
