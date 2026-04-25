import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import sensible from "@fastify/sensible";
import Fastify, { type FastifyError, type FastifyReply } from "fastify";
import type { Env } from "./config/env.js";
import { ok, type ApiErrorBody } from "./lib/api-response.js";
import { HttpError } from "./lib/http-error.js";
import { createAuthRoutes } from "./routes/auth.js";
import { jobRoutes } from "./routes/jobs.js";
import { preferenceRoutes } from "./routes/preferences.js";
import { scheduleAssignmentRoutes } from "./routes/schedule-assignments.js";
import { taskRoutes } from "./routes/tasks.js";
import { todayRoutes } from "./routes/today.js";
import { workerAvailabilityPeriodRoutes } from "./routes/worker-availability-periods.js";
import { workerAvailabilityRoutes } from "./routes/worker-availability.js";
import { workerRoutes } from "./routes/workers.js";

function sendJson(reply: FastifyReply, statusCode: number, body: unknown) {
  reply
    .code(statusCode)
    .type("application/json; charset=utf-8")
    .send(JSON.stringify(body));
}

export async function buildApp(env: Env) {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
    },
  });

  await app.register(sensible);

  await app.register(cookie);

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) {
        cb(null, true);
        return;
      }
      const allowed = new Set([
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
      ]);
      cb(null, allowed.has(origin));
    },
    credentials: true,
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: "7d" },
    cookie: {
      cookieName: "finbar_token",
      signed: false,
    },
  });

  app.decorate("authenticate", async function (request, _reply) {
    try {
      await request.jwtVerify();
    } catch {
      throw new HttpError(401, "UNAUTHORIZED", "Niet ingelogd");
    }
  });

  app.setErrorHandler((err: FastifyError, request, reply) => {
    const http =
      err instanceof HttpError
        ? err
        : typeof err === "object" &&
            err !== null &&
            (err as Error).name === "HttpError" &&
            typeof (err as HttpError).statusCode === "number"
          ? (err as HttpError)
          : null;
    if (http) {
      sendJson(reply, http.statusCode, http.toJSON());
      return;
    }
    request.log.error({ err }, "request failed");
    const statusCode = err.statusCode ?? 500;
    const message =
      statusCode >= 500 ? "Interne serverfout" : err.message;
    const code =
      statusCode >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR";
    const body: ApiErrorBody = {
      error: {
        code,
        message,
      },
    };
    sendJson(reply, statusCode, body);
  });

  app.get("/", async () => ({
    service: "finbar-api",
    health: "/health",
    api: "/api",
  }));

  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  app.get("/api", async () =>
    ok({
      service: "finbar-api",
      version: "0.0.1",
      auth: "/api/auth",
      authForgotPassword: "POST /api/auth/forgot-password",
      authResetPassword: "POST /api/auth/reset-password",
      jobs: "/api/jobs",
      workers: "/api/workers",
      tasks: "/api/tasks",
      workerAvailability: "/api/worker-availability",
      workerAvailabilityPeriods: "/api/worker-availability-periods",
      scheduleAssignments: "/api/schedule-assignments",
      today: "/api/today",
      preferences: "/api/preferences",
      begroting: "GET/POST/… /api/jobs/:id/begroting/…",
    }),
  );

  await app.register(createAuthRoutes(env), { prefix: "/api/auth" });
  await app.register(jobRoutes, { prefix: "/api/jobs" });
  await app.register(workerRoutes, { prefix: "/api/workers" });
  await app.register(taskRoutes, { prefix: "/api/tasks" });
  await app.register(workerAvailabilityRoutes, {
    prefix: "/api/worker-availability",
  });
  await app.register(workerAvailabilityPeriodRoutes, {
    prefix: "/api/worker-availability-periods",
  });
  await app.register(scheduleAssignmentRoutes, {
    prefix: "/api/schedule-assignments",
  });
  await app.register(todayRoutes, { prefix: "/api/today" });
  await app.register(preferenceRoutes, { prefix: "/api/preferences" });

  return app;
}
