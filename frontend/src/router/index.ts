import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", redirect: "/today" },
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/LoginView.vue"),
    },
    {
      path: "/today",
      name: "today",
      component: () => import("@/views/TodayView.vue"),
    },
    {
      path: "/week",
      name: "week",
      component: () => import("@/views/WeekView.vue"),
    },
    {
      path: "/jobs",
      name: "jobs",
      component: () => import("@/views/JobsView.vue"),
    },
    {
      path: "/jobs/:id",
      name: "job-detail",
      component: () => import("@/views/JobDetailView.vue"),
      props: true,
    },
    {
      path: "/workers",
      name: "workers",
      component: () => import("@/views/WorkersView.vue"),
    },
    {
      path: "/settings",
      name: "settings",
      component: () => import("@/views/SettingsView.vue"),
    },
  ],
});

export default router;
