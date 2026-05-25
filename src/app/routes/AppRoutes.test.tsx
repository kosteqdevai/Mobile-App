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

    fireEvent.click(screen.getByRole("button", { name: "Recipes" }));
    fireEvent.click(await screen.findByRole("button", { name: /Tomato rice/i }));
    expect(await screen.findByRole("heading", { name: "Tomato rice" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Recipes" })).toBeInTheDocument();
    });
  });
});
