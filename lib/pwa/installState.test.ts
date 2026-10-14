import { describe, expect, it } from "vitest";
import {
  UPDATE_CHECK_INTERVAL_MS,
  installState,
  isIOSDevice,
  shouldCheckForUpdate,
} from "./installState";

const base = { standalone: false, justInstalled: false, canPrompt: false, ios: false };

describe("installState", () => {
  it("is installed in the app window or right after installing", () => {
    expect(installState({ ...base, standalone: true, canPrompt: true })).toBe("installed");
    expect(installState({ ...base, justInstalled: true })).toBe("installed");
  });

  it("offers the prompt when the browser gave us one", () => {
    expect(installState({ ...base, canPrompt: true })).toBe("prompt");
  });

  it("shows the share-menu steps on iOS", () => {
    expect(installState({ ...base, ios: true })).toBe("ios-steps");
  });

  it("falls back to unsupported", () => {
    expect(installState(base)).toBe("unsupported");
  });
});

describe("isIOSDevice", () => {
  const iphone =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  const mac =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
  const android =
    "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";

  it("detects iPhone and iPadOS (Mac user agent with touch)", () => {
    expect(isIOSDevice(iphone, 5)).toBe(true);
    expect(isIOSDevice(mac, 5)).toBe(true);
  });

  it("doesn't flag a real Mac or Android", () => {
    expect(isIOSDevice(mac, 0)).toBe(false);
    expect(isIOSDevice(android, 5)).toBe(false);
  });
});

describe("shouldCheckForUpdate", () => {
  it("waits for the interval", () => {
    expect(shouldCheckForUpdate(0, UPDATE_CHECK_INTERVAL_MS - 1)).toBe(false);
    expect(shouldCheckForUpdate(0, UPDATE_CHECK_INTERVAL_MS)).toBe(true);
  });
});
