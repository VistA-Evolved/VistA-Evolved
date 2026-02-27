/**
 * Smoke test: Verify buildServer can construct a Fastify instance
 * without throwing. This validates the Phase 173 decomposition
 * assembles correctly.
 */
import { describe, it, expect } from "vitest";

describe("Server bootstrap (Phase 173 decomposition)", () => {
  it("buildServer creates a Fastify instance with /health route", async () => {
    // Dynamic import to avoid top-level-await issues in the test runner
    const { buildServer } = await import("../src/server/build-server.js");
    const server = await buildServer();

    // The server should be a Fastify instance
    expect(server).toBeDefined();
    expect(typeof server.listen).toBe("function");
    expect(typeof server.close).toBe("function");

    // Inject a request to /health — should return 200 without needing listen()
    const response = await server.inject({
      method: "GET",
      url: "/health",
    });
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.ok).toBe(true);

    await server.close();
  });
});
