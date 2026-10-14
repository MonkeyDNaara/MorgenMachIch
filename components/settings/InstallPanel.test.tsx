// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InstallPanel from "@/components/settings/InstallPanel";
import type { InstallState } from "@/lib/pwa/installState";

afterEach(cleanup);

function renderPanel(install: InstallState | null, updateReady = false) {
  const onInstall = vi.fn();
  const onUpdate = vi.fn();
  render(
    <InstallPanel
      install={install}
      updateReady={updateReady}
      onInstall={onInstall}
      onUpdate={onUpdate}
    />,
  );
  return { onInstall, onUpdate };
}

describe("InstallPanel", () => {
  it("offers the install button when the browser can prompt", async () => {
    const { onInstall } = renderPanel("prompt");
    await userEvent.click(screen.getByRole("button", { name: "Install app" }));
    expect(onInstall).toHaveBeenCalledOnce();
  });

  it("shows the share-menu steps on iOS", () => {
    renderPanel("ios-steps");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("Add to Home Screen")).toBeTruthy();
  });

  it("says installed in the app", () => {
    renderPanel("installed");
    expect(screen.getByText("Installed")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("explains the alternatives when installing isn't offered", () => {
    renderPanel("unsupported");
    expect(screen.getByText(/doesn't offer installing/)).toBeTruthy();
  });

  it("shows no install option before the browser is known", () => {
    renderPanel(null);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("offers Reload when a new version waits", async () => {
    const { onUpdate } = renderPanel("installed", true);
    await userEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(onUpdate).toHaveBeenCalledOnce();
  });
});
