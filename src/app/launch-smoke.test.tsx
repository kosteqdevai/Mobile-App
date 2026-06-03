import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("launch smoke", () => {
  it("starts the app shell with an accessible root landmark", () => {
    render(<App />);

    expect(screen.getByRole("main", { name: "Comero" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Comero app shell" })).toBeInTheDocument();
  });
});
