// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import DashboardBand from "@/features/dashboard/components/DashboardBand";

afterEach(cleanup);

const widgets = [
  { id: "yesterday", node: <p>Yesterday card</p> },
  { id: "this-week", node: <p>This week card</p> },
];

function textOrder(): string[] {
  return screen.getAllByText(/card|row/).map((node) => node.textContent ?? "");
}

describe("DashboardBand (#465)", () => {
  it("keeps one DOM order: Important, the widgets, then the wide row", () => {
    render(
      <DashboardBand important={<p>Important card</p>} widgets={widgets} wide={<p>Wide row</p>} />,
    );
    expect(textOrder()).toEqual(["Important card", "Yesterday card", "This week card", "Wide row"]);
  });

  it("lets the wide row span every column and sit second on mobile", () => {
    render(
      <DashboardBand important={<p>Important card</p>} widgets={widgets} wide={<p>Wide row</p>} />,
    );
    const slot = screen.getByText("Wide row").parentElement!;
    expect(slot.className).toContain("md:col-span-full");
    expect(slot.className).toContain("order-2");
  });

  it("renders no empty slot without a wide row, and no skip link or collapse toggle", () => {
    const { container } = render(
      <DashboardBand important={<p>Important card</p>} widgets={widgets} />,
    );
    expect(container.firstElementChild?.children).toHaveLength(3);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
