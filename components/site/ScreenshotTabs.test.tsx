// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScreenshotTabs from "@/components/site/ScreenshotTabs";

afterEach(cleanup);

function panelImages() {
  return within(screen.getByRole("tabpanel"))
    .getAllByRole("img")
    .map((image) => image.getAttribute("src"));
}

describe("ScreenshotTabs", () => {
  it("starts on Today with the dark and the light shot", () => {
    render(<ScreenshotTabs />);
    expect(screen.getByRole("tab", { name: "Today" })).toHaveProperty("ariaSelected", "true");
    expect(panelImages()).toEqual([
      "/site/screens/today-dark.webp",
      "/site/screens/today-light.webp",
    ]);
  });

  it("has one tab stop and switches views with the arrow keys and End", async () => {
    render(<ScreenshotTabs />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1, -1]);

    await userEvent.click(tabs[0]);
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tabs[1]);
    expect(panelImages()[0]).toBe("/site/screens/tasks-dark.webp");

    await userEvent.keyboard("{End}");
    expect(document.activeElement).toBe(tabs[3]);
    expect(panelImages()[1]).toBe("/site/screens/stats-light.webp");
    expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(tabs[3].id);
  });

  it("switches views on click", async () => {
    render(<ScreenshotTabs />);
    await userEvent.click(screen.getByRole("tab", { name: "Calendar" }));
    expect(panelImages()[0]).toBe("/site/screens/calendar-dark.webp");
  });
});
