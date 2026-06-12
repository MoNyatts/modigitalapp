import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

app.use("*", cors({
  origin: "*",
  credentials: true,
}));

app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
    onError: ({ error, path, type }) => {
      console.error(`[tRPC Error] Path: ${path}, Type: ${type}, Message: ${error.message}`);
    },
  })
);

app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    backend: "hono",
    trpc: "enabled",
  });
});

app.get("/", (c) => {
  return c.json({ status: "ok", message: "Mo' Digital Events API is running" });
});

app.all("*", (c) => {
  return c.json(
    {
      error: "Not Found",
      message: "Available routes: /, /api/health, /api/trpc/*",
    },
    404
  );
});

export default app;
