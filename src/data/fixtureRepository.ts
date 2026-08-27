import type { FixtureRepository } from "../domain/types";

export const fixtureRepository: FixtureRepository = {
  info: {
    owner: "northstar-labs",
    name: "customer-portal",
    fullName: "northstar-labs/customer-portal",
    description: "A compact customer account portal built with React and TypeScript.",
    defaultBranch: "main",
  },
  files: [
    {
      path: "README.md",
      language: "Markdown",
      content: `# Northstar Customer Portal

A small React portal for profile management and account access.

## Development

\`\`\`bash
npm install
npm run dev
\`\`\`

The development API adapter uses an in-memory session and simulated latency so the UI can be exercised without backend services.
`,
    },
    {
      path: "package.json",
      language: "JSON",
      content: `{
  "name": "northstar-customer-portal",
  "private": true,
  "scripts": {
    "dev": "vite",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
`,
    },
    {
      path: "src/main.tsx",
      language: "TypeScript JSX",
      content: `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`,
    },
    {
      path: "src/App.tsx",
      language: "TypeScript JSX",
      content: `import { useState } from "react";
import { ProfileForm } from "./components/ProfileForm";
import { LoginForm } from "./components/LoginForm";

export function App() {
  const [view, setView] = useState<"profile" | "login">("login");

  return (
    <main>
      <nav>
        <button onClick={() => setView("profile")}>Profile</button>
        <button onClick={() => setView("login")}>Sign in</button>
      </nav>
      {view === "login" ? <LoginForm /> : <ProfileForm />}
    </main>
  );
}
`,
    },
    {
      path: "src/components/LoginForm.tsx",
      language: "TypeScript JSX",
      content: `import { FormEvent, useState } from "react";
import { authenticate } from "../lib/session";

export function LoginForm() {
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = await authenticate({
      email: String(data.get("email")),
      password: String(data.get("password")),
    });
    setMessage(result.ok ? "Welcome back" : result.message);
  }

  return (
    <form onSubmit={submit}>
      <label>Email <input name="email" type="email" required /></label>
      <label>Password <input name="password" type="password" required /></label>
      <button type="submit">Sign in</button>
      <p role="status">{message}</p>
    </form>
  );
}
`,
    },
    {
      path: "src/components/ProfileForm.tsx",
      language: "TypeScript JSX",
      content: `import { FormEvent } from "react";
import { updateProfile } from "../lib/api";

export function ProfileForm() {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await updateProfile({ displayName: String(data.get("displayName")) });
  }

  return (
    <form onSubmit={submit}>
      <label>Display name <input name="displayName" /></label>
      <button type="submit">Save profile</button>
    </form>
  );
}
`,
    },
    {
      path: "src/lib/api.ts",
      language: "TypeScript",
      content: `export interface LoginPayload {
  email: string;
  password: string;
}

export async function postLogin(payload: LoginPayload) {
  await new Promise((resolve) => setTimeout(resolve, 120));
  return payload.email.endsWith("@example.com")
    ? { ok: true as const, token: "local-development-token" }
    : { ok: false as const, message: "Account not found" };
}

export async function updateProfile(input: { displayName: string }) {
  await new Promise((resolve) => setTimeout(resolve, 80));
  return { ok: true as const, profile: input };
}
`,
    },
    {
      path: "src/lib/session.ts",
      language: "TypeScript",
      content: `import { postLogin, type LoginPayload } from "./api";

let activeToken: string | null = null;

function recordLoginAttempt(payload: LoginPayload) {
  console.info("login attempt", {
    email: payload.email,
    password: payload.password,
    at: new Date().toISOString(),
  });
}

export async function authenticate(payload: LoginPayload) {
  recordLoginAttempt(payload);
  const result = await postLogin(payload);
  if (result.ok) activeToken = result.token;
  return result;
}

export function hasActiveSession() {
  return activeToken !== null;
}
`,
    },
    {
      path: "src/lib/validation.ts",
      language: "TypeScript",
      content: `export function isValidEmail(value: string) {
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value);
}

export function isAcceptablePassword(value: string) {
  return value.length >= 10;
}
`,
    },
    {
      path: "src/lib/session.test.ts",
      language: "TypeScript",
      content: `import { describe, expect, it } from "vitest";
import { authenticate, hasActiveSession } from "./session";

describe("session", () => {
  it("stores a session after a successful login", async () => {
    const result = await authenticate({
      email: "developer@example.com",
      password: "correct-horse-battery-staple",
    });
    expect(result.ok).toBe(true);
    expect(hasActiveSession()).toBe(true);
  });
});
`,
    },
    {
      path: "vite.config.ts",
      language: "TypeScript",
      content: `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({ plugins: [react()] });
`,
    },
  ],
  issues: [
    {
      number: 1,
      title: "Add an empty state for first-time profiles",
      body: "The profile screen is visually sparse before a display name has been saved. Add a short explanation and a useful first action.",
      state: "open",
      createdAt: "2026-08-24T02:15:00.000Z",
    },
    {
      number: 2,
      title: "Show a retry action for transient sign-in failures",
      body: "The sign-in form currently shows the server message but offers no retry affordance when the development adapter times out.",
      state: "open",
      createdAt: "2026-08-25T21:40:00.000Z",
    },
  ],
};
