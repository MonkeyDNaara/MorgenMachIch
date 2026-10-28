// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImportantCard from "@/features/dashboard/components/ImportantCard";
import { importantItems } from "@/features/dashboard/lib/importantItems";
import { localDate, localIso, makeTask } from "@/lib/test/factories";

const openTaskDrawer = vi.fn();
vi.mock("@/features/tasks/components/drawer/TaskDrawerProvider", () => ({
  useTaskDrawer: () => ({ openTaskDrawer }),
}));

afterEach(() => {
  cleanup();
  openTaskDrawer.mockReset();
});

// Wed 28 Oct 2026, 10:00 local.
const NOW = localDate(2026, 10, 28, 10);
const high = (title: string, dueDate: string, allDay = false) =>
  makeTask({ title, priority: "high", dueDate, allDay });

describe("ImportantCard (#424)", () => {
  it("renders an empty body while loading", () => {
    render(<ImportantCard items={undefined} />);
    expect(screen.getByRole("heading", { name: "Important" })).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows the empty state without a count", () => {
    render(<ImportantCard items={[]} />);
    expect(screen.getAllByText(/Nothing urgent/).length).toBeGreaterThan(0);
  });

  it("labels overdue, timed and all-day items and opens the right task", async () => {
    const tasks = [
      high("Pay rent", localIso(2026, 10, 27, 9)),
      high("Call bank", localIso(2026, 10, 28, 15)),
      high("Visa form", localIso(2026, 10, 28), true),
    ];
    render(<ImportantCard items={importantItems(tasks, NOW)} />);
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("overdue · Tue")).toBeTruthy();
    expect(screen.getByText("15:00")).toBeTruthy();
    expect(screen.getByText("all day")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /Call bank/ }));
    expect(openTaskDrawer).toHaveBeenCalledWith(tasks[1].id);
  });

  it("lists five and counts the rest", () => {
    const tasks = Array.from({ length: 7 }, (_, index) =>
      high(`Task ${index + 1}`, localIso(2026, 10, 28, 11 + index)),
    );
    render(<ImportantCard items={importantItems(tasks, NOW)} />);
    expect(screen.getAllByRole("button")).toHaveLength(5);
    expect(screen.getByText("+ 2 more")).toBeTruthy();
  });
});
