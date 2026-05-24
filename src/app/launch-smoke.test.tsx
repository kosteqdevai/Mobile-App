import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("launch smoke", () => {
  it("starts the app shell with an accessible root landmark", () => {
    render(<App />);

    expect(screen.getByRole("main", { name: "LaCucina" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "LaCucina app shell" })).toBeInTheDocument();
  });
});
