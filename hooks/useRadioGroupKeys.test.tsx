// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRadioGroupKeys } from "@/hooks/useRadioGroupKeys";

afterEach(cleanup);

const OPTIONS = ["Open", "Done", "Skipped"];

/** A minimal radiogroup wired like the app's segmented controls. */
function Group({ initial = 0 }: { initial?: number }) {
  const [selected, setSelected] = useState(initial);
  const radios = useRadioGroupKeys({
    count: OPTIONS.length,
    selectedIndex: selected,
    onSelect: setSelected,
  });
  return (
    <>
      <button type="button">Before</button>
      <div role="radiogroup" aria-label="Status" {...radios.groupProps}>
        {OPTIONS.map((label, index) => (
          <button
            key={label}
            {...radios.itemProps(index)}
            type="button"
            role="radio"
            aria-checked={selected === index}
            onClick={() => setSelected(index)}
          >
            {label}
          </button>
        ))}
      </div>
      <button type="button">After</button>
    </>
  );
}

const radio = (name: string) => screen.getByRole("radio", { name });

describe("useRadioGroupKeys (#272)", () => {
  it("makes only the checked option a tab stop", async () => {
    const user = userEvent.setup();
    render(<Group initial={1} />);
    expect(OPTIONS.map((o) => radio(o).tabIndex)).toEqual([-1, 0, -1]);

    await user.click(screen.getByRole("button", { name: "Before" }));
    await user.tab();
    expect(document.activeElement).toBe(radio("Done"));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "After" }));
  });

  it("moves selection and focus together with the arrow keys, wrapping", async () => {
    const user = userEvent.setup();
    render(<Group />);
    await user.click(radio("Open"));

    await user.keyboard("{ArrowRight}");
    expect(radio("Done").getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(radio("Done"));

    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(document.activeElement).toBe(radio("Open"));

    await user.keyboard("{ArrowLeft}");
    expect(radio("Skipped").getAttribute("aria-checked")).toBe("true");
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(radio("Done"));
  });

  it("jumps with Home and End and keeps the tab stop on the checked option", async () => {
    const user = userEvent.setup();
    render(<Group initial={1} />);
    await user.click(radio("Done"));

    await user.keyboard("{End}");
    expect(document.activeElement).toBe(radio("Skipped"));
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(radio("Open"));
    expect(OPTIONS.map((o) => radio(o).tabIndex)).toEqual([0, -1, -1]);
  });

  it("ignores other keys", async () => {
    const user = userEvent.setup();
    render(<Group />);
    await user.click(radio("Open"));
    await user.keyboard("a{PageDown}");
    expect(radio("Open").getAttribute("aria-checked")).toBe("true");
  });
});
