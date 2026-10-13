// @vitest-environment jsdom
import { useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MoveMenu from "@/components/dnd/MoveMenu";
import type { MoveAction } from "@/lib/utils/listMove";

afterEach(cleanup);

/** A grip button that opens the menu, like SortableTaskCard does. */
function Harness({
  onMove = () => {},
  blocked = [],
}: {
  onMove?: (action: MoveAction) => void;
  blocked?: MoveAction[];
}) {
  const [open, setOpen] = useState(false);
  const gripRef = useRef<HTMLButtonElement>(null);
  return (
    <div>
      <button type="button" ref={gripRef} onClick={() => setOpen((o) => !o)}>
        Grip
      </button>
      <MoveMenu
        open={open}
        onClose={() => setOpen(false)}
        onMove={onMove}
        canMove={(action) => !blocked.includes(action)}
        anchorRef={gripRef}
        title="Call mom"
      />
      <button type="button">Outside</button>
    </div>
  );
}

describe("MoveMenu (#73)", () => {
  it("opens with the four actions and focuses the first enabled one", async () => {
    const user = userEvent.setup();
    render(<Harness blocked={["top", "up"]} />);
    await user.click(screen.getByRole("button", { name: "Grip" }));

    expect(screen.getByRole("menu", { name: "Move “Call mom”" })).toBeTruthy();
    const items = screen.getAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Move to top",
      "Move up",
      "Move down",
      "Move to bottom",
    ]);
    expect(items.map((item) => (item as HTMLButtonElement).disabled)).toEqual([
      true,
      true,
      false,
      false,
    ]);
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Move down" }));
  });

  it("moves focus with arrows (skipping disabled items, wrapping), Home and End", async () => {
    const user = userEvent.setup();
    render(<Harness blocked={["up"]} />);
    await user.click(screen.getByRole("button", { name: "Grip" }));
    const focused = () => document.activeElement?.textContent;

    expect(focused()).toBe("Move to top");
    await user.keyboard("{ArrowDown}");
    expect(focused()).toBe("Move down");
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(focused()).toBe("Move to top");
    await user.keyboard("{ArrowUp}");
    expect(focused()).toBe("Move to bottom");
    await user.keyboard("{Home}");
    expect(focused()).toBe("Move to top");
    await user.keyboard("{End}");
    expect(focused()).toBe("Move to bottom");
  });

  it("runs the chosen action, closes and returns focus to the grip", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(<Harness onMove={onMove} />);
    await user.click(screen.getByRole("button", { name: "Grip" }));
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onMove).toHaveBeenCalledWith("up");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Grip" }));
  });

  it("closes on Escape (focus back on the grip) and on an outside click", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(<Harness onMove={onMove} />);
    const grip = screen.getByRole("button", { name: "Grip" });

    await user.click(grip);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(grip);

    await user.click(grip);
    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(onMove).not.toHaveBeenCalled();
  });
});
