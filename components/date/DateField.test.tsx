// @vitest-environment jsdom
import { useState } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DateField from "@/components/date/DateField";
import { localDate } from "@/lib/test/factories";

// Only Date is faked (Sun 11 Oct 2026 14:00), so user-event's timers still run.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(localDate(2026, 10, 11, 14));
  // jsdom has no layout, so scrollIntoView doesn't exist there.
  Element.prototype.scrollIntoView = vi.fn();
});
afterAll(() => vi.useRealTimers());
afterEach(cleanup);

type Props = Partial<React.ComponentProps<typeof DateField>> & { initial?: string };

/** A controlled DateField like the drawers use; `onChange` is spied on. */
function setup({ initial = "", ...props }: Props = {}) {
  const onChange = vi.fn();
  function Harness() {
    const [value, setValue] = useState(initial);
    return (
      <DateField
        label="Due date"
        {...props}
        value={value}
        onChange={(next) => {
          onChange(next);
          setValue(next);
        }}
      />
    );
  }
  const user = userEvent.setup();
  render(
    <>
      <Harness />
      <button type="button">Elsewhere</button>
    </>,
  );
  return { user, onChange, input: screen.getByRole("textbox", { name: "Due date" }) };
}

describe("DateField — display", () => {
  it("shows the date in APP_LOCALE with a relative hint", () => {
    const { input } = setup({ initial: "2026-10-16" });
    expect(input).toHaveProperty("value", "Fri 16 Oct 2026");
    expect(screen.getByText("in 5 days")).toBeTruthy();
  });

  it("marks a late due date only with showLateHint", () => {
    setup({ initial: "2026-10-07", showLateHint: true });
    expect(screen.getByText("4 days ago").className).toContain("text-error");
  });
});

describe("DateField — typing (#258)", () => {
  it("previews a typed date and applies it on Enter", async () => {
    const { user, onChange, input } = setup();
    await user.click(input);
    await user.keyboard("fri");
    expect(screen.getByText("Fri 16 Oct 2026")).toBeTruthy(); // the preview line
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("2026-10-16");
    expect(input).toHaveProperty("value", "Fri 16 Oct 2026");
  });

  it("applies a typed date when leaving the field", async () => {
    const { user, onChange, input } = setup();
    await user.click(input);
    await user.keyboard("übermorgen");
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(onChange).toHaveBeenLastCalledWith("2026-10-13");
  });

  it("keeps the old value for unreadable text; Escape restores the text", async () => {
    const { user, onChange, input } = setup({ initial: "2026-10-16" });
    await user.click(input);
    await user.keyboard("someday");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText(/Couldn’t read that as a date/)).toBeTruthy();
    await user.keyboard("{Enter}");
    expect(onChange).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    expect(input).toHaveProperty("value", "Fri 16 Oct 2026");
  });

  it("clears only when clearable", async () => {
    const clearable = setup({ initial: "2026-10-16", clearable: true });
    await clearable.user.click(clearable.input);
    await clearable.user.keyboard("{Backspace}{Enter}");
    expect(clearable.onChange).toHaveBeenLastCalledWith("");
    cleanup();

    const required = setup({ initial: "2026-10-16" });
    await required.user.click(required.input);
    await required.user.keyboard("{Backspace}");
    expect(screen.getByText("A date is needed here.")).toBeTruthy();
    await required.user.keyboard("{Enter}");
    expect(required.onChange).not.toHaveBeenCalled();
  });

  it("rejects a date before min", async () => {
    const { user, onChange, input } = setup({ min: "2026-10-11" });
    await user.click(input);
    await user.keyboard("yesterday{Enter}");
    expect(screen.getByText("Pick today or a later day.")).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("DateField — popover", () => {
  const openCalendar = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button", { name: "Open calendar" }));
    return screen.getByRole("dialog", { name: "Choose a date" });
  };

  it("opens with focus on the selected day and picks with the keyboard", async () => {
    const { user, onChange } = setup({ initial: "2026-10-16" });
    await openCalendar(user);
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Friday, 16 October 2026");

    await user.keyboard("{ArrowRight}{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("2026-10-24");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Open calendar" }));
  });

  it("pages to the next month", async () => {
    const { user, onChange } = setup({ initial: "2026-10-31" });
    await openCalendar(user);
    await user.keyboard("{PageDown}{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("2026-11-30");
  });

  it("offers quick picks", async () => {
    const { user, onChange } = setup();
    await openCalendar(user);
    await user.click(screen.getByRole("button", { name: /^Next week/ }));
    expect(onChange).toHaveBeenLastCalledWith("2026-10-12");
  });

  it("disables days before min and shows Clear only when clearable", async () => {
    const { user, onChange } = setup({ initial: "2026-10-16", min: "2026-10-11" });
    await openCalendar(user);
    const yesterday = screen.getByRole("gridcell", { name: "Saturday, 10 October 2026" });
    expect(yesterday.getAttribute("aria-disabled")).toBe("true");
    await user.click(yesterday);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Clear date" })).toBeNull();
  });

  it("closes on Escape without picking", async () => {
    const { user, onChange } = setup({ initial: "2026-10-16", clearable: true });
    await openCalendar(user);
    expect(screen.getByRole("button", { name: "Clear date" })).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
