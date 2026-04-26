import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import sensible from "@fastify/sensible";
import fastifyStatic from "@fastify/static";
import fs from "node:fs";
import path from "node:path";
import Fastify, { type FastifyError, type FastifyReply } from "fastify";
import type { Env } from "./config/env.js";
import { AUTH_COOKIE } from "./lib/auth-context.js";
import { ok, type ApiErrorBody } from "./lib/api-response.js";
import { HttpError } from "./lib/http-error.js";
import { adminRoutes } from "./routes/admin.js";
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

function publicWebOrigin(env: Env): string | null {
  try {
    return new URL(env.PUBLIC_APP_URL).origin;
  } catch {
    return null;
  }
}

export async function buildApp(env: Env) {
  const useStatic = Boolean(env.STATIC_DIR?.trim());
  const publicOrigin = publicWebOrigin(env);

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
      if (publicOrigin && origin === publicOrigin) {
        cb(null, true);
        return;
      }
      if (env.NODE_ENV !== "production") {
        const dev = new Set([
          "http://localhost:5173",
          "http://127.0.0.1:5173",
          "http://localhost:3001",
          "http://127.0.0.1:3001",
        ]);
        cb(null, dev.has(origin));
        return;
      }
      cb(null, false);
    },
    credentials: true,
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: "7d" },
    cookie: {
      cookieName: AUTH_COOKIE,
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

  if (!useStatic) {
    app.get("/", async () => ({
      service: "finbar-api",
      health: "/health",
      api: "/api",
    }));
  }

  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  app.get("/api", async () =>
    ok({
      service: "finbar-api",
      version: "0.0.1",
      admin: "/api/admin",
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

  await app.register(adminRoutes(env), { prefix: "/api/admin" });
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

  if (useStatic && env.STATIC_DIR) {
    const staticRoot = path.resolve(env.STATIC_DIR);
    if (!fs.existsSync(path.join(staticRoot, "index.html"))) {
      app.log.warn({ staticRoot }, "STATIC_DIR bevat geen index.html; SPA uitgeschakeld");
    } else {
      await app.register(fastifyStatic, {
        root: staticRoot,
        index: "index.html",
        decorateReply: true,
      });
      app.setNotFoundHandler((request, reply) => {
        const p = request.url.split("?")[0] ?? "";
        if (p.startsWith("/api")) {
          return sendJson(reply, 404, {
            error: { code: "NOT_FOUND", message: "Niet gevonden" },
          });
        }
        if (p.startsWith("/assets/") || path.extname(p) !== "") {
          return reply.code(404).type("text/plain; charset=utf-8").send("Not found");
        }
        if (request.method !== "GET" && request.method !== "HEAD") {
          return reply.code(405).send();
        }
        return reply.sendFile("index.html");
      });
    }
  }

  return app;
}
