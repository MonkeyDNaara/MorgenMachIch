import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError, errorToResponse } from "@/server/api/errors";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/services/errors";

afterEach(() => vi.restoreAllMocks());

async function contract(response: Response) {
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  return { status: response.status, body: await response.json() };
}

describe("errorToResponse (#455)", () => {
  it("maps the service errors to 404 / 422 / 403", async () => {
    expect(await contract(errorToResponse(new NotFoundError("Task", "t1")))).toEqual({
      status: 404,
      body: { error: { code: "not_found", message: "Task t1 not found" } },
    });
    expect(
      await contract(
        errorToResponse(new ValidationError("label", [{ path: "name", message: "Taken" }])),
      ),
    ).toEqual({
      status: 422,
      body: {
        error: {
          code: "validation",
          message: "Invalid label",
          details: { issues: [{ path: "name", message: "Taken" }] },
        },
      },
    });
    expect(await contract(errorToResponse(new ForbiddenError("Not your label")))).toEqual({
      status: 403,
      body: { error: { code: "forbidden", message: "Not your label" } },
    });
  });

  it("maps a failed request schema to 422 with dotted issue paths", async () => {
    const schema = z.object({ subtasks: z.array(z.object({ title: z.string() })) }).strict();
    const result = schema.safeParse({ subtasks: [{ title: 1 }], source: "claude" });
    expect(result.success).toBe(false);
    if (result.success) return;
    const { status, body } = await contract(errorToResponse(result.error));
    expect(status).toBe(422);
    expect(body.error.code).toBe("validation");
    expect(body.error.details.issues.map((issue: { path: string }) => issue.path)).toEqual([
      "subtasks.0.title",
      "",
    ]);
  });

  it("keeps the status and code of an ApiError", async () => {
    expect(
      await contract(errorToResponse(new ApiError(415, "unsupported_media_type", "JSON"))),
    ).toEqual({
      status: 415,
      body: { error: { code: "unsupported_media_type", message: "JSON" } },
    });
  });

  it("answers anything else with a 500 without details and logs it", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { status, body } = await contract(
      errorToResponse(new Error("password authentication failed for secret-user")),
    );
    expect(status).toBe(500);
    expect(body).toEqual({
      error: { code: "internal_error", message: "Something went wrong. Try again shortly." },
    });
    expect(log).toHaveBeenCalledOnce();
  });
});
