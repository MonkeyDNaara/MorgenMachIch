// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import BottomTabBar from "@/app/(app)/_components/BottomTabBar";

vi.mock("next/navigation", () => ({ usePathname: () => "/learn" }));
vi.mock("@/features/command-palette/components/CommandPaletteProvider", () => ({
  useCommandPalette: () => ({ openPalette: vi.fn() }),
}));
vi.mock("@/features/theme/components/ThemeToggle", () => ({ default: () => null }));
vi.mock("@/features/auth/components/AccountMoreItems", () => ({ default: () => null }));

afterEach(cleanup);

function moreLinks(showLearn: boolean) {
  render(<BottomTabBar showLearn={showLearn} />);
  fireEvent.click(screen.getByRole("button", { name: "More" }));
  return screen.getAllByRole("link").map((link) => link.getAttribute("href"));
}

describe("BottomTabBar Learn entry (#469)", () => {
  it("lists Learn right under Stats in the More menu for the owner", () => {
    const hrefs = moreLinks(true);
    expect(hrefs[hrefs.indexOf("/stats") + 1]).toBe("/learn");
  });

  it("shows no Learn entry for everyone else", () => {
    expect(moreLinks(false)).not.toContain("/learn");
  });
});
