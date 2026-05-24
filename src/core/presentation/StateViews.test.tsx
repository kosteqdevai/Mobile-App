import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConfirmActionButton } from "./ConfirmActionButton";
import { EmptyView, ErrorView, LoadingView } from "./StateViews";

describe("shared state views", () => {
  it("renders accessible loading, empty, and error primitives", () => {
    render(<LoadingView title="Loading recipes" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading recipes");

    render(<EmptyView title="No recipes" message="Add one first." />);
    expect(screen.getByText("No recipes")).toBeInTheDocument();

    render(<ErrorView title="Unavailable" message="Try later." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Try later.");
  });
});

describe("ConfirmActionButton", () => {
  it("requires a second tap before destructive work runs", () => {
    const onConfirm = vi.fn();

    render(
      <ConfirmActionButton
        idleLabel="Delete recipe"
        confirmLabel="Confirm delete"
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete recipe" }));
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
