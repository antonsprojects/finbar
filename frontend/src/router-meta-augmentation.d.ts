import "vue-router";

declare module "vue-router" {
  interface RouteMeta {
    requiresAuth?: boolean;
    /** Minimal header (Finbar + logout), no footer — home & new project */
    hideRootChrome?: boolean;
    /** Only global administrators can open this route */
    requiresAdmin?: boolean;
    /** Project shell provides its own header/footer */
    projectShell?: boolean;
  }
}
