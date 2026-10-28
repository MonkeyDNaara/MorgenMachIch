// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SideDrawer from "@/components/ui/SideDrawer";

afterEach(cleanup);

// jsdom has no modal dialogs; these stand-ins open, close and fire "close"
// like the browser does. Focus trap and inert are the browser's job.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

function Harness({ initialFocus }: { initialFocus: "field" | "dialog" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <SideDrawer
        open={open}
        onClose={() => setOpen(false)}
        label="Edit task"
        initialFocus={initialFocus}
      >
        <button type="button">Close</button>
        <div data-autofocus>
          <input aria-label="Title" />
        </div>
      </SideDrawer>
    </>
  );
}

describe("SideDrawer (#440)", () => {
  it("opens as a modal dialog and focuses the marked field", async () => {
    render(<Harness initialFocus="field" />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog", { name: "Edit task" }) as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(document.activeElement).toBe(screen.getByLabelText("Title"));
  });

  it("focuses the dialog itself when asked to", async () => {
    render(<Harness initialFocus="dialog" />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(document.activeElement).toBe(screen.getByRole("dialog"));
  });

  it("closes on a backdrop click and unmounts its content", async () => {
    render(<Harness initialFocus="dialog" />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;
    fireEvent.mouseDown(dialog);
    expect(dialog.open).toBe(false);
    expect(screen.queryByLabelText("Title")).toBeNull();
  });

  it("closes when the dialog closes itself (Escape → close event)", async () => {
    render(<Harness initialFocus="dialog" />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;
    act(() => dialog.close());
    expect(screen.queryByLabelText("Title")).toBeNull();
  });

  it("ignores a mousedown inside the content", async () => {
    const onClose = vi.fn();
    render(
      <SideDrawer open onClose={onClose} label="x" initialFocus="dialog">
        <p>Body</p>
      </SideDrawer>,
    );
    fireEvent.mouseDown(screen.getByText("Body"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
