import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatLabel } from "./StatLabel";

describe("StatLabel", () => {
  it("renders focusable stat tooltip content", () => {
    render(<StatLabel code="PAS" />);

    expect(screen.getByRole("button", { name: "PAS" })).toBeInTheDocument();
    expect(screen.getByRole("tooltip")).toHaveTextContent("PAS - Passing");
    expect(screen.getByRole("tooltip")).toHaveTextContent("Affects midfield control");
  });

  it("can act as a sortable stat header", () => {
    const onClick = vi.fn();

    render(<StatLabel code="SHO" onClick={onClick} suffix=" ↑" />);

    fireEvent.click(screen.getByRole("button", { name: "Sort by SHO" }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Sort by SHO" })).toHaveTextContent("SHO ↑");
  });
});
