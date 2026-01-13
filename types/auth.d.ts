declare module "better-auth" {
  interface User {
    role: "user" | "manager" | "admin";
  }
}

export {};
