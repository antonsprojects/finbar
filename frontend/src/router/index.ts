import { useAuthStore } from "@/stores/auth";
import type { RouteLocationNormalized } from "vue-router";
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      meta: { requiresAuth: true, hideRootChrome: true },
      component: () => import("@/views/ProjectListView.vue"),
    },
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/LoginView.vue"),
    },
    {
      path: "/register",
      name: "register",
      component: () => import("@/views/RegisterView.vue"),
    },
    {
      path: "/forgot-password",
      name: "forgot-password",
      component: () => import("@/views/ForgotPasswordView.vue"),
    },
    {
      path: "/reset-password",
      name: "reset-password",
      component: () => import("@/views/ResetPasswordView.vue"),
    },
    {
      path: "/admin",
      name: "admin",
      meta: { requiresAuth: true, requiresAdmin: true },
      component: () => import("@/views/AdminView.vue"),
    },
    {
      path: "/workers",
      name: "global-workers",
      meta: { requiresAuth: true, hideRootChrome: true },
      component: () => import("@/views/GlobalWorkersView.vue"),
    },
    {
      path: "/workers/new",
      name: "global-worker-new",
      meta: { requiresAuth: true, hideRootChrome: true },
      component: () => import("@/views/WorkerNewView.vue"),
    },
    {
      path: "/workers/:id",
      name: "global-worker-detail",
      meta: { requiresAuth: true, hideRootChrome: true },
      component: () => import("@/views/WorkerDetailView.vue"),
      props: true,
    },
    {
      path: "/settings",
      name: "global-settings",
      meta: { requiresAuth: true, hideRootChrome: true },
      component: () => import("@/views/SettingsView.vue"),
    },
    {
      path: "/archive",
      redirect: { name: "home" },
    },
    {
      path: "/projects/new",
      name: "project-new",
      meta: { requiresAuth: true, hideRootChrome: true },
      component: () => import("@/views/JobNewView.vue"),
    },
    {
      path: "/projects/:projectId",
      component: () => import("@/views/ProjectLayout.vue"),
      meta: { requiresAuth: true, projectShell: true },
      children: [
        {
          path: "",
          redirect: (to) => ({
            name: "project-planning-today",
            params: { projectId: to.params.projectId as string },
          }),
        },
        {
          path: "planning/vandaag",
          redirect: (to) => ({
            name: "project-planning-today",
            params: { projectId: to.params.projectId as string },
          }),
        },
        {
          path: "planning/week",
          redirect: (to) => ({
            name: "project-planning-today",
            params: { projectId: to.params.projectId as string },
          }),
        },
        {
          path: "planning/month",
          redirect: (to) => ({
            name: "project-planning-today",
            params: { projectId: to.params.projectId as string },
          }),
        },
        {
          path: "planning",
          name: "project-planning-today",
          component: () => import("@/views/TodayView.vue"),
        },
        {
          path: "begroting",
          name: "project-begroting",
          component: () => import("@/views/ProjectBudgetView.vue"),
        },
        {
          path: "today",
          redirect: (to) => ({
            name: "project-planning-today",
            params: { projectId: to.params.projectId as string },
          }),
        },
        {
          path: "week",
          redirect: (to) => ({
            name: "project-planning-today",
            params: { projectId: to.params.projectId as string },
          }),
        },
        {
          path: "job",
          name: "project-job",
          component: () => import("@/views/JobDetailView.vue"),
          props: (r) => ({ id: r.params.projectId as string }),
        },
        {
          path: "todos",
          redirect: (to) => ({
            name: "project-planning-today",
            params: { projectId: to.params.projectId as string },
          }),
        },
        {
          path: "tasks/new",
          name: "project-task-new",
          component: () => import("@/views/TaskNewView.vue"),
          props: (r) => ({ jobId: r.params.projectId as string }),
        },
        {
          path: "tasks/:taskId",
          name: "project-task-detail",
          component: () => import("@/views/TaskDetailView.vue"),
          props: (r) => ({ id: r.params.taskId as string }),
        },
        {
          path: "workers",
          name: "project-workers",
          component: () => import("@/views/WorkersView.vue"),
        },
        {
          path: "workers/kiezen",
          name: "project-team-pick",
          component: () => import("@/views/ProjectTeamPickView.vue"),
        },
        {
          path: "workers/new",
          name: "project-worker-new",
          component: () => import("@/views/WorkerNewView.vue"),
        },
        {
          path: "workers/:id",
          name: "project-worker-detail",
          component: () => import("@/views/WorkerDetailView.vue"),
          props: true,
        },
        {
          path: "settings",
          name: "project-settings",
          component: () => import("@/views/ProjectSettingsView.vue"),
        },
      ],
    },
  ],
});

router.beforeEach(async (to: RouteLocationNormalized) => {
  const auth = useAuthStore();
  if (!auth.initialized) {
    await auth.fetchMe();
  }

  const requiresAuth = to.matched.some(
    (r: { meta: { requiresAuth?: boolean } }) => r.meta.requiresAuth === true,
  );
  if (requiresAuth && !auth.user) {
    return {
      name: "login",
      query: { redirect: to.fullPath },
    };
  }

  const requiresAdmin = to.matched.some(
    (r: { meta: { requiresAdmin?: boolean } }) => r.meta.requiresAdmin === true,
  );
  if (requiresAdmin && !auth.isAdmin) {
    return { name: "home" };
  }

  if (
    auth.user &&
    (to.name === "login" ||
      to.name === "register" ||
      to.name === "forgot-password" ||
      to.name === "reset-password")
  ) {
    const redirect =
      typeof to.query.redirect === "string" && to.query.redirect.startsWith("/")
        ? to.query.redirect
        : auth.isAdmin
          ? "/admin"
          : "/";
    return redirect;
  }

  return true;
});

router.afterEach(() => {
  window.sessionStorage.removeItem("finbar:chunk-reload");
});

router.onError((error, to) => {
  const message = error instanceof Error ? error.message : String(error);
  const isStaleChunk =
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("error loading dynamically imported module");
  if (!isStaleChunk) return;

  const key = "finbar:chunk-reload";
  if (window.sessionStorage.getItem(key) === "1") return;

  window.sessionStorage.setItem(key, "1");
  window.location.assign(to.fullPath);
});

export default router;
