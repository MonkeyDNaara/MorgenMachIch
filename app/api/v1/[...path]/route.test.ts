import { describe, expect, it } from "vitest";
import { DELETE, GET, POST } from "@/app/api/v1/[...path]/route";

describe("/api/v1 catch-all (#455)", () => {
  it("answers unknown paths with a JSON 404", async () => {
    for (const handler of [GET, POST, DELETE]) {
      const response = handler();
      expect(response.status).toBe(404);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect((await response.json()).error.code).toBe("not_found");
    }
  });
});
