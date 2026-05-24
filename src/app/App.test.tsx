import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";
import { AppProviders } from "./providers/AppProviders";
import { defaultAppDependencies } from "./providers/appDependencies";
import { AppRoutes } from "./routes/AppRoutes";

describe("App", () => {
  it("renders the accessible app shell", () => {
    render(<App />);

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "LaCucina" })).toBeInTheDocument();
    expect(screen.getByText("Foundation")).toBeInTheDocument();
    expect(screen.getByText("Personal cookbook")).toBeInTheDocument();
  });

  it("allows dependencies to be swapped in component tests", () => {
    render(
      <AppProviders
        dependencies={{
          ...defaultAppDependencies,
          appConfig: {
            name: "Test Kitchen",
            stage: "Test Stage",
            environment: {
              mode: "test",
              isDevelopment: false,
              isProduction: false,
            },
          },
        }}
      >
        <AppRoutes />
      </AppProviders>,
    );

    expect(screen.getByRole("heading", { name: "Test Kitchen" })).toBeInTheDocument();
    expect(screen.getByText("Test Stage")).toBeInTheDocument();
  });
});
