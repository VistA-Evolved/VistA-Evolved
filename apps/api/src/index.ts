import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/health", async () => {
  return { ok: true };
});

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || "127.0.0.1";

try {
  await app.listen({ port, host });
  app.log.info(`API running on http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
