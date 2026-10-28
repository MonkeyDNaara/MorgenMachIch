// @vitest-environment jsdom
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { useDismiss } from "@/hooks/useDismiss";

afterEach(cleanup);

function Popover({ close }: { close: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(true, close, [ref]);
  return <div ref={ref}>Popover</div>;
}

describe("useDismiss Escape (#440)", () => {
  it("closes and marks the Escape as handled, so a surrounding dialog stays open", () => {
    const close = vi.fn();
    render(<Popover close={close} />);
    const event = new KeyboardEvent("keydown", { key: "Escape", cancelable: true, bubbles: true });
    document.dispatchEvent(event);
    expect(close).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("leaves other keys alone", () => {
    const close = vi.fn();
    render(<Popover close={close} />);
    const event = new KeyboardEvent("keydown", { key: "Enter", cancelable: true, bubbles: true });
    document.dispatchEvent(event);
    expect(close).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});
