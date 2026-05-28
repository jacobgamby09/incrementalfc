import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatLabel } from "./StatLabel";

describe("StatLabel", () => {
  it("renders focusable stat tooltip content", () => {
    render(<StatLabel code="PAS" />);

    expect(screen.getByRole("button", { name: "PAS" })).toBeInTheDocument();
    expect(screen.getByRole("tooltip")).toHaveTextContent("PAS - Passing");
    expect(screen.getByRole("tooltip")).toHaveTextContent("Affects midfield control");
  });
});
