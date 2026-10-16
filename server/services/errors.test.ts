import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ForbiddenError,
  NotFoundError,
  ServiceError,
  ValidationError,
} from "@/server/services/errors";

describe("service errors", () => {
  it("carry a code the routes map to HTTP", () => {
    const notFound = new NotFoundError("Task", "abc");
    expect(notFound).toBeInstanceOf(ServiceError);
    expect(notFound).toMatchObject({
      code: "not_found",
      name: "NotFoundError",
      message: "Task abc not found",
    });
    expect(new ForbiddenError("Label belongs to another user")).toMatchObject({
      code: "forbidden",
    });
  });

  it("ValidationError lists the Zod issue paths", () => {
    const result = z.object({ title: z.string().min(1), due: z.string() }).safeParse({ title: "" });
    if (result.success) throw new Error("expected a failure");
    const error = new ValidationError("task", result.error);
    expect(error.code).toBe("validation");
    expect(error.issues.map((i) => i.path).sort()).toEqual(["due", "title"]);
  });
});
