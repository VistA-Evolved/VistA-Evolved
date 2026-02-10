import Fastify from "fastify";

const server = Fastify();

server.get("/health", async () => ({ ok: true }));

const port = Number(process.env.PORT || 3001)
const host = process.env.HOST || "127.0.0.1"

try {
  await server.listen({ port, host });
  console.log(`Server listening on http://${host}:${port}`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
