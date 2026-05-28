import { describe, expect, it } from "vitest";

const forbiddenPhrases = [
  "Milestone 3",
  "Pending",
  "Full development arrives in Milestone 3",
  "Match XP, training progress, and facility cap detail will plug into this sheet in Milestone 3."
];

describe("development placeholder copy", () => {
  it("does not leave old Milestone 3 placeholder text in UI source", () => {
    const sources = import.meta.glob("./**/*.{ts,tsx}", { eager: true, query: "?raw", import: "default" }) as Record<string, string>;
    const source = Object.entries(sources)
      .filter(([path]) => !path.endsWith(".test.ts") && !path.endsWith(".test.tsx"))
      .map(([, contents]) => contents)
      .join("\n");

    for (const phrase of forbiddenPhrases) {
      expect(source).not.toContain(phrase);
    }
  });
});
