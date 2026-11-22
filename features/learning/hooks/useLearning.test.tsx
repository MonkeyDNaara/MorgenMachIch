// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

const TOPIC = {
  id: 7,
  topic: "Closures",
  explanation: "A closure keeps its scope.",
  deep_explanation: null,
};

const fetchMock = vi.fn();

/** The hook talks to a module-level store, so every test starts with a fresh module. */
async function loadHook() {
  vi.resetModules();
  return (await import("@/features/learning/hooks/useLearning")).useLearning;
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => Response.json({ data: TOPIC }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useLearning (#466)", () => {
  it("loads today's topic once for the row and the page together", async () => {
    const useLearning = await loadHook();
    const row = renderHook(() => useLearning());
    const page = renderHook(() => useLearning());
    expect(row.result.current.phase).toBe("loading");

    await waitFor(() => expect(row.result.current.phase).toBe("ready"));
    expect(page.result.current.topic).toEqual(TOPIC);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/learning/today");
  });

  it("doesn't call the agent when autoLoad is off", async () => {
    const useLearning = await loadHook();
    const { result } = renderHook(() => useLearning({ autoLoad: false }));
    await act(async () => {});
    expect(result.current.phase).toBe("loading");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("re-renders when an action changes the state", async () => {
    const useLearning = await loadHook();
    const { result } = renderHook(() => useLearning());
    await waitFor(() => expect(result.current.phase).toBe("ready"));

    fetchMock.mockImplementationOnce(async () =>
      Response.json({ data: { id: 7, deep_explanation: "Deeper." } }),
    );
    await act(async () => {
      await result.current.deepen();
    });
    expect(result.current.topic?.deep_explanation).toBe("Deeper.");
  });

  it("shows offline and recovers with retry", async () => {
    fetchMock.mockImplementationOnce(async () =>
      Response.json({ error: { code: "learning_offline", message: "Offline." } }, { status: 503 }),
    );
    const useLearning = await loadHook();
    const { result } = renderHook(() => useLearning());
    await waitFor(() => expect(result.current.phase).toBe("offline"));
    await act(async () => {
      await result.current.retry();
    });
    expect(result.current.phase).toBe("ready");
  });
});
