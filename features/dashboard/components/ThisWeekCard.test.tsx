// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ThisWeekCard from "@/features/dashboard/components/ThisWeekCard";
import { weekSummary } from "@/features/dashboard/lib/weekSummary";
import { localDate, localIso, makeTask } from "@/lib/test/factories";

afterEach(cleanup);

// Wed 28 Oct 2026, 18:00 local.
const NOW = localDate(2026, 10, 28, 18);
const done = (day: number, dueDay: number | null) =>
  makeTask({
    status: "done",
    completedAt: localIso(2026, 10, day, 12),
    dueDate: dueDay === null ? null : localIso(2026, 10, dueDay, 9),
  });

describe("ThisWeekCard (#425)", () => {
  it("renders the heading and the stats link while loading", () => {
    render(<ThisWeekCard summary={undefined} />);
    expect(screen.getByRole("heading", { name: "This week" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Stats →" }).getAttribute("href")).toBe("/stats");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("shows the bars, the totals and the comparison", () => {
    const summary = weekSummary([done(26, 26), done(28, 27), done(19, null)], NOW, null);
    render(<ThisWeekCard summary={summary} />);
    expect(
      screen.getByRole("img", { name: "Done per day this week: Mon 1, Tue 0, Wed 1 (today)" }),
    ).toBeTruthy();
    expect(screen.getByText(/2 done/)).toBeTruthy();
    expect(screen.getByText(/50% on time/)).toBeTruthy();
    expect(screen.getByText("+1 vs. last week")).toBeTruthy();
  });

  it("shows a dash when nothing had a due date", () => {
    render(<ThisWeekCard summary={weekSummary([done(26, null)], NOW, null)} />);
    expect(screen.getByText(/— on time/)).toBeTruthy();
  });
});
