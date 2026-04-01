import sensible from "@fastify/sensible";
import Fastify, { type FastifyError } from "fastify";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
    },
  });

  await app.register(sensible);

  app.get("/", async () => ({
    service: "finbar-api",
    health: "/health",
  }));

  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  app.setErrorHandler((err: FastifyError, request, reply) => {
    request.log.error({ err }, "request failed");
    const statusCode = err.statusCode ?? 500;
    const message = statusCode >= 500 ? "Internal Server Error" : err.message;
    void reply.status(statusCode).send({
      error: err.name,
      message,
      statusCode,
    });
  });

  return app;
}
