// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Sparkline from "@/components/ui/charts/Sparkline";
import MiniBars from "@/components/ui/charts/MiniBars";

afterEach(cleanup);

describe("Sparkline (#422)", () => {
  it("has an accessible name and draws one path per run", () => {
    const { container } = render(<Sparkline values={[1, 3, null, 2, 5]} label="Steps trend" />);
    expect(screen.getByRole("img", { name: "Steps trend" })).toBeTruthy();
    expect(container.querySelectorAll("path")).toHaveLength(2);
  });

  it("puts the dot on the newest value, also before trailing nulls", () => {
    const { container } = render(<Sparkline values={[0, 10, null]} label="x" />);
    const dot = container.querySelector<HTMLElement>("[data-last-dot]");
    expect(dot?.style.left).toBe("50%");
    expect(dot?.style.top).toBe("8%");
  });

  it("can hide the dot and shows a goal line", () => {
    const { container } = render(<Sparkline values={[1, 2]} goal={4} lastDot={false} label="x" />);
    expect(container.querySelector("[data-last-dot]")).toBeNull();
    expect(container.querySelector("[data-goal]")).toBeTruthy();
  });

  it("draws nothing but keeps its name without data", () => {
    const { container } = render(<Sparkline values={[null, null]} label="No data" />);
    expect(screen.getByRole("img", { name: "No data" })).toBeTruthy();
    expect(container.querySelectorAll("path")).toHaveLength(0);
    expect(container.querySelector("[data-last-dot]")).toBeNull();
  });
});

describe("MiniBars (#422)", () => {
  it("has an accessible name and one bar per slot", () => {
    const { container } = render(
      <MiniBars values={[3, 0, 6, null]} highlightIndex={2} label="Done per day" />,
    );
    expect(screen.getByRole("img", { name: "Done per day" })).toBeTruthy();
    const bars = [...container.querySelectorAll<HTMLElement>("[data-kind]")];
    expect(bars.map((bar) => bar.dataset.kind)).toEqual(["value", "empty", "value", "future"]);
    expect(bars[0].style.height).toBe("max(3px, 50%)");
    expect(bars[2].className).toContain("bg-data-4");
    expect(bars[0].className).toContain("bg-data-2");
  });
});
