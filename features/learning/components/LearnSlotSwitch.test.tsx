// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import LearnSlotSwitch from "@/features/learning/components/LearnSlotSwitch";

afterEach(cleanup);

describe("LearnSlotSwitch (#481)", () => {
  it("is a radiogroup with New and Review, the slot checked", () => {
    render(<LearnSlotSwitch slot="review" onChange={() => {}} />);
    expect(screen.getByRole("radiogroup", { name: "Learning topic" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "New" }).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByRole("radio", { name: "Review" }).getAttribute("aria-checked")).toBe("true");
  });

  it("has one tab stop: the checked radio", () => {
    render(<LearnSlotSwitch slot="today" onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: "New" }).tabIndex).toBe(0);
    expect(screen.getByRole("radio", { name: "Review" }).tabIndex).toBe(-1);
  });

  it("changes the slot on click and with the arrow keys", () => {
    const onChange = vi.fn();
    render(<LearnSlotSwitch slot="today" onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Review" }));
    expect(onChange).toHaveBeenLastCalledWith("review");
    fireEvent.keyDown(screen.getByRole("radio", { name: "New" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("review");
    fireEvent.keyDown(screen.getByRole("radio", { name: "Review" }), { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("review");
  });
});
