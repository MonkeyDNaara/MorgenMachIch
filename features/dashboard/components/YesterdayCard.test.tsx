// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import YesterdayCard from "@/features/dashboard/components/YesterdayCard";
import type { YesterdayReview } from "@/features/dashboard/lib/yesterdayReview";
import { localDate, makeTask } from "@/lib/test/factories";

const openTaskDrawer = vi.fn();
vi.mock("@/features/tasks/components/drawer/TaskDrawerProvider", () => ({
  useTaskDrawer: () => ({ openTaskDrawer }),
}));

afterEach(() => {
  cleanup();
  openTaskDrawer.mockReset();
});

const DAY = localDate(2026, 10, 27);
const review = (overrides: Partial<YesterdayReview> = {}): YesterdayReview => ({
  day: DAY,
  done: 0,
  total: 0,
  missed: [],
  ...overrides,
});

describe("YesterdayCard (#423)", () => {
  it("renders an empty body while loading", () => {
    render(<YesterdayCard review={undefined} />);
    expect(screen.getByRole("heading", { name: "Yesterday" })).toBeTruthy();
    expect(screen.queryByText("Tue 27 Oct")).toBeNull();
  });

  it("shows the empty state when nothing was due", () => {
    render(<YesterdayCard review={review()} />);
    expect(screen.getByText("Nothing was due yesterday.")).toBeTruthy();
    expect(screen.getByText("Tue 27 Oct")).toBeTruthy();
  });

  it("celebrates a fully done day", () => {
    render(<YesterdayCard review={review({ done: 3, total: 3 })} />);
    expect(screen.getByText("3 of 3 tasks done")).toBeTruthy();
    expect(screen.getByText("All done — Morgen can wait.")).toBeTruthy();
  });

  it("lists up to three left-open tasks, opens one in the drawer, counts the rest", async () => {
    const missed = ["A", "B", "C", "D", "E"].map((title) => makeTask({ title }));
    render(<YesterdayCard review={review({ done: 1, total: 6, missed })} />);
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "A",
      "B",
      "C",
    ]);
    expect(screen.getByText("+ 2 more")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "B" }));
    expect(openTaskDrawer).toHaveBeenCalledWith(missed[1].id);
  });

  it("shows an agent note with its source", () => {
    render(<YesterdayCard review={review({ done: 1, total: 1 })} note="Solid day." />);
    expect(screen.getByText("Solid day.")).toBeTruthy();
    expect(screen.getByText("improvement agent")).toBeTruthy();
  });
});
