export const DEMO_ACCOUNTS = {
  user: "demo.user@example.com",
  volunteer: "demo.volunteer@example.com",
  organization: "demo.org@example.com",
  admin: "demo.admin@example.com",
} as const;

export type DemoPersona = keyof typeof DEMO_ACCOUNTS;
