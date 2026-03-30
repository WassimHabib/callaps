# Custom Auth (bcrypt + JWT) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Clerk SSO with a custom auth system using bcrypt + JWT, with admin-only account creation via email invitations.

**Architecture:** JWT cookies (jose) for sessions, bcrypt for password hashing, Resend for invitation/reset emails. The admin creates accounts from the admin portal, clients receive an email invitation to set their password. `getOrgContext()` keeps the same interface minus `clerkId`.

**Tech Stack:** Next.js 16, Prisma 7, jose (JWT), bcrypt, Resend

---

### Task 1: Install dependencies and configure environment

**Files:**
- Modify: `package.json`
- Modify: `.env.local` (add JWT_SECRET)

- [ ] **Step 1: Install bcrypt and jose**

```bash
npm install bcrypt jose @types/bcrypt
```

- [ ] **Step 2: Generate JWT_SECRET and add to .env.local**

```bash
openssl rand -base64 32
```

Add to `.env.local`:
```
JWT_SECRET=<generated-value>
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add bcrypt and jose dependencies"
```

---

### Task 2: Prisma schema migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Update User model in schema.prisma**

Replace the User model in `prisma/schema.prisma`:

```prisma
model User {
  id              String    @id @default(cuid())
  email           String    @unique
  name            String
  passwordHash    String?
  role            UserRole  @default(client)
  approved        Boolean   @default(false)
  company         String?
  phone           String?
  inviteToken     String?   @unique
  inviteExpiresAt DateTime?
  resetToken      String?   @unique
  resetExpiresAt  DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  agents    Agent[]
  campaigns Campaign[]
  integrations Integration[]

  apiKeys    ApiKey[]

  adminClients       AdminClient[]       @relation("AdminClients")
  clientOfAdmin      AdminClient[]       @relation("ClientOfAdmin")
  sharedClients      AdminClientShare[]  @relation("SharedAdminClients")
  prospects          Prospect[]          @relation("AdminProspects")
  prospectActivities ProspectActivity[]  @relation("ProspectActivities")
  convertedProspects Prospect[]          @relation("ConvertedProspect")

  @@map("users")
}
```

Key changes: removed `clerkId`, added `passwordHash`, `inviteToken`, `inviteExpiresAt`, `resetToken`, `resetExpiresAt`.

- [ ] **Step 2: Create and apply migration**

```bash
npx prisma migrate dev --name remove-clerk-add-custom-auth
```

This will:
- Drop the `clerkId` column (and its unique index)
- Add the 5 new columns
- Regenerate the Prisma client

If existing data has `clerkId` that can't be dropped directly, the migration SQL may need manual editing. Check the generated migration file before applying. If there's data, first make `clerkId` optional in a separate step, then drop it after migration.

- [ ] **Step 3: Verify Prisma client regenerated**

```bash
npx prisma generate
```

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ src/generated/
git commit -m "feat: migrate schema from Clerk to custom auth fields"
```

---

### Task 3: Auth module — JWT session helpers

**Files:**
- Create: `src/lib/jwt.ts`

- [ ] **Step 1: Create src/lib/jwt.ts**

```typescript
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = "auth_token";
const EXPIRATION = "7d";

export interface JWTPayload {
  userId: string;
  role: string;
  email: string;
}

export async function createSession(user: {
  id: string;
  role: string;
  email: string;
}): Promise<void> {
  const token = await new SignJWT({
    userId: user.id,
    role: user.role,
    email: user.email,
  } satisfies JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(EXPIRATION)
    .setIssuedAt()
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function verifySession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Verify a JWT token string directly (for middleware, which can't use cookies()).
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/jwt.ts
git commit -m "feat: add JWT session helpers (jose)"
```

---

### Task 4: Rewrite auth.ts — remove Clerk, use JWT

**Files:**
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Rewrite src/lib/auth.ts**

Replace the entire file with:

```typescript
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/jwt";
import type { OrgRole } from "@/lib/permissions";
import { cache } from "react";

export type UserRole = "admin" | "client" | "super_admin";
export type EffectiveRole = OrgRole | "super_admin";

export interface OrgContext {
  userId: string;
  userName: string;
  userRole: UserRole;
  orgId: string | null;
  role: EffectiveRole;
  isImpersonating: boolean;
  isSuperAdmin: boolean;
  approved: boolean;
}

/**
 * Core auth function — cached per request.
 * One single DB query for the entire request lifecycle.
 */
export const getOrgContext = cache(async (): Promise<OrgContext> => {
  const session = await verifySession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Super admin
  if (user.role === "super_admin") {
    const cookieStore = await cookies();
    const impersonatedOrg = cookieStore.get("impersonate_org")?.value;

    return {
      userId: user.id,
      userName: user.name,
      userRole: "super_admin",
      orgId: impersonatedOrg || null,
      role: "super_admin",
      isImpersonating: !!impersonatedOrg,
      isSuperAdmin: true,
      approved: true,
    };
  }

  // Admin
  if (user.role === "admin") {
    return {
      userId: user.id,
      userName: user.name,
      userRole: "admin",
      orgId: user.id,
      role: "org_admin",
      isImpersonating: false,
      isSuperAdmin: false,
      approved: user.approved,
    };
  }

  // Regular client
  return {
    userId: user.id,
    userName: user.name,
    userRole: "client",
    orgId: user.id,
    role: "org_admin",
    isImpersonating: false,
    isSuperAdmin: false,
    approved: user.approved,
  };
});

/**
 * Get user role — uses cached getOrgContext (no extra DB query).
 */
export async function getUserRole(): Promise<UserRole> {
  const ctx = await getOrgContext();
  return ctx.userRole;
}

export async function requireAdmin() {
  const ctx = await getOrgContext();
  if (ctx.userRole !== "admin" && ctx.userRole !== "super_admin") {
    throw new Error("Unauthorized: admin access required");
  }
}

export async function requireSuperAdmin() {
  const ctx = await getOrgContext();
  if (ctx.userRole !== "super_admin") {
    throw new Error("Unauthorized: super admin access required");
  }
}

/**
 * Require authenticated user — returns DB user ID.
 */
export async function requireAuth(): Promise<string> {
  const session = await verifySession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session.userId;
}

/**
 * Build a Prisma `where` filter scoped to the current org.
 */
export function orgFilter(ctx: OrgContext): { orgId?: string } {
  if (ctx.isSuperAdmin && !ctx.isImpersonating) {
    return {};
  }
  if (!ctx.orgId) {
    return { orgId: "___none___" };
  }
  return { orgId: ctx.orgId };
}
```

Key changes:
- Removed all `@clerk/nextjs` imports
- `getOrgContext()` uses `verifySession()` instead of Clerk's `auth()`
- Removed `clerkId` from `OrgContext` interface
- `requireAuth()` now returns DB user ID (not Clerk ID)
- Removed auto-creation logic (admin creates accounts now)
- Simplified client role to always `org_admin` (no more Clerk org roles)

- [ ] **Step 2: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: rewrite auth.ts with JWT sessions, remove Clerk"
```

---

### Task 5: Rewrite middleware — JWT verification

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Rewrite src/middleware.ts**

Replace the entire file with:

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_ROUTES = [
  "/sign-in",
  "/invite",
  "/forgot-password",
  "/reset-password",
  "/api/auth",
  "/api/webhooks",
  "/api/retell",
  "/api/agents",
  "/api/slack",
  "/api/whatsapp",
  "/api/v1",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes: let through
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check JWT cookie
  const token = request.cookies.get("auth_token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    // Invalid or expired token — clear cookie and redirect
    const response = NextResponse.redirect(new URL("/sign-in", request.url));
    response.cookies.delete("auth_token");
    return response;
  }
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

- [ ] **Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: replace Clerk middleware with JWT verification"
```

---

### Task 6: Login API route and sign-in page

**Files:**
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Modify: `src/app/sign-in/[[...sign-in]]/page.tsx` (rewrite as custom form)

- [ ] **Step 1: Create src/app/api/auth/login/route.ts**

```typescript
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/jwt";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.passwordHash || !user.approved) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    await createSession({ id: user.id, role: user.role, email: user.email });

    // Return role so the client can redirect appropriately
    return NextResponse.json({ success: true, role: user.role });
  } catch {
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create src/app/api/auth/logout/route.ts**

```typescript
import { NextResponse } from "next/server";
import { destroySession } from "@/lib/jwt";

export async function POST() {
  await destroySession();
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Rewrite sign-in page**

Replace `src/app/sign-in/[[...sign-in]]/page.tsx` with:

```tsx
"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur de connexion");
        return;
      }

      // Redirect based on role
      if (data.role === "super_admin") {
        router.push("/admin");
      } else if (data.role === "admin") {
        router.push("/admin-portal");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen overflow-hidden">
      {/* Left - Animated gradient + bold typography */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden lg:flex">
        <div className="absolute inset-0 animate-gradient bg-gradient-to-br from-[#4f46e5] via-[#7c3aed] to-[#2563eb] bg-[length:200%_200%]" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute -left-20 top-1/4 h-72 w-72 animate-float rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -right-10 bottom-1/3 h-56 w-56 animate-float-delayed rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 flex h-full flex-col justify-between p-14">
          <Image
            src="/logoV2.png"
            alt="Callaps"
            width={280}
            height={84}
            className="object-contain drop-shadow-lg"
            priority
          />
          <div className="-mt-6">
            <h1 className="text-6xl font-black leading-[1.05] tracking-tight text-white">
              Appels.
              <br />
              IA.
              <br />
              Résultats.
            </h1>
            <p className="mt-6 max-w-sm text-lg font-medium text-white/70">
              La plateforme qui automatise vos appels commerciaux et multiplie
              vos conversions.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex -space-x-2">
              {[
                "https://i.pravatar.cc/40?img=12",
                "https://i.pravatar.cc/40?img=32",
                "https://i.pravatar.cc/40?img=44",
                "https://i.pravatar.cc/40?img=52",
              ].map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="h-8 w-8 rounded-full border-2 border-[#4f46e5] object-cover"
                />
              ))}
            </div>
            <p className="text-sm font-medium text-white/60">
              +200 entreprises nous font confiance
            </p>
          </div>
        </div>
      </div>

      {/* Right - Login Form */}
      <div className="relative flex w-full items-center justify-center bg-slate-50 px-6 lg:w-1/2">
        <div className="absolute -left-32 top-1/4 h-64 w-64 rounded-full bg-[#e0e7ff]/50 blur-3xl" />
        <div className="absolute -right-20 bottom-1/4 h-48 w-48 rounded-full bg-[#ede9fe]/40 blur-3xl" />

        <div className="relative z-10 w-full max-w-md">
          <div className="mb-10 text-center lg:hidden">
            <Image
              src="/logoV2.png"
              alt="Callaps"
              width={200}
              height={60}
              className="mx-auto object-contain"
              priority
            />
            <p className="mt-3 text-2xl font-bold text-slate-900">
              Bon retour parmi nous
            </p>
          </div>

          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Connexion</h2>
            <p className="mt-1 text-slate-500">
              Accédez à votre tableau de bord
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-200/50">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="vous@entreprise.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>

            <div className="text-center">
              <a
                href="/forgot-password"
                className="text-sm text-indigo-600 hover:underline"
              >
                Mot de passe oublié ?
              </a>
            </div>
          </form>
        </div>
      </div>

      <style jsx global>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(20px); }
        }
        .animate-gradient { animation: gradient 8s ease infinite; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 7s ease-in-out infinite 1s; }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/login/route.ts src/app/api/auth/logout/route.ts src/app/sign-in/
git commit -m "feat: add login/logout API routes and custom sign-in page"
```

---

### Task 7: Invitation system — accept invite page and API

**Files:**
- Create: `src/app/api/auth/invite/accept/route.ts`
- Create: `src/app/invite/[token]/page.tsx`

- [ ] **Step 1: Create src/app/api/auth/invite/accept/route.ts**

```typescript
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token et mot de passe requis" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Lien d'invitation invalide" },
        { status: 400 }
      );
    }

    if (user.inviteExpiresAt && user.inviteExpiresAt < new Date()) {
      return NextResponse.json(
        { error: "Ce lien d'invitation a expiré. Contactez votre administrateur." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        inviteToken: null,
        inviteExpiresAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create src/app/invite/[token]/page.tsx**

```tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/sign-in"), 2000);
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 flex justify-center">
          <Image
            src="/logoV2.png"
            alt="Callaps"
            width={180}
            height={54}
            className="object-contain"
            priority
          />
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-10 shadow-xl shadow-slate-200/50">
          {success ? (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
                <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="mt-6 text-xl font-bold text-slate-900">Compte activé !</h1>
              <p className="mt-2 text-sm text-slate-500">
                Redirection vers la page de connexion...
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-center text-2xl font-bold text-slate-900">
                Bienvenue sur Callaps
              </h1>
              <p className="mt-2 text-center text-sm text-slate-500">
                Définissez votre mot de passe pour activer votre compte
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                {error && (
                  <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-200/50">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Mot de passe
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Minimum 8 caractères"
                  />
                </div>

                <div>
                  <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Confirmer le mot de passe
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Retapez votre mot de passe"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? "Activation..." : "Activer mon compte"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/invite/accept/route.ts src/app/invite/
git commit -m "feat: add invitation acceptance page and API"
```

---

### Task 8: Password reset — forgot + reset pages and APIs

**Files:**
- Create: `src/app/api/auth/forgot-password/route.ts`
- Create: `src/app/api/auth/reset-password/route.ts`
- Create: `src/app/forgot-password/page.tsx`
- Create: `src/app/reset-password/[token]/page.tsx`
- Create: `src/lib/email/invite.ts`
- Create: `src/lib/email/reset-password.ts`

- [ ] **Step 1: Create email templates**

Create `src/lib/email/invite.ts`:

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInviteEmail({
  to,
  userName,
  inviteToken,
  adminName,
}: {
  to: string;
  userName: string;
  inviteToken: string;
  adminName: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invite/${inviteToken}`;

  await resend.emails.send({
    from: "Callaps <noreply@callaps.ai>",
    to,
    subject: "Vous avez été invité sur Callaps",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <img src="${baseUrl}/logoV2.png" alt="Callaps" style="height: 40px; margin-bottom: 32px;" />
        <h1 style="font-size: 22px; color: #0f172a; margin-bottom: 8px;">Bienvenue sur Callaps</h1>
        <p style="color: #64748b; font-size: 15px; line-height: 1.6;">
          ${adminName} vous a invité à rejoindre la plateforme Callaps.
          Cliquez sur le bouton ci-dessous pour définir votre mot de passe et activer votre compte.
        </p>
        <a href="${inviteUrl}" style="display: inline-block; margin-top: 24px; padding: 14px 32px; background: #4f46e5; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px;">
          Définir mon mot de passe
        </a>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">
          Ce lien expire dans 48 heures. Si vous n'avez pas demandé cette invitation, ignorez cet email.
        </p>
      </div>
    `,
  });
}
```

Create `src/lib/email/reset-password.ts`:

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendResetPasswordEmail({
  to,
  resetToken,
}: {
  to: string;
  resetToken: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password/${resetToken}`;

  await resend.emails.send({
    from: "Callaps <noreply@callaps.ai>",
    to,
    subject: "Réinitialisation de votre mot de passe",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <img src="${baseUrl}/logoV2.png" alt="Callaps" style="height: 40px; margin-bottom: 32px;" />
        <h1 style="font-size: 22px; color: #0f172a; margin-bottom: 8px;">Réinitialisation du mot de passe</h1>
        <p style="color: #64748b; font-size: 15px; line-height: 1.6;">
          Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
        </p>
        <a href="${resetUrl}" style="display: inline-block; margin-top: 24px; padding: 14px 32px; background: #4f46e5; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px;">
          Réinitialiser mon mot de passe
        </a>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">
          Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.
        </p>
      </div>
    `,
  });
}
```

- [ ] **Step 2: Create src/app/api/auth/forgot-password/route.ts**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendResetPasswordEmail } from "@/lib/email/reset-password";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    // Always return success to prevent email enumeration
    if (!email) {
      return NextResponse.json({ success: true });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (user && user.passwordHash) {
      const resetToken = crypto.randomUUID();
      const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetExpiresAt },
      });

      await sendResetPasswordEmail({ to: user.email, resetToken });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true }); // Don't leak errors
  }
}
```

- [ ] **Step 3: Create src/app/api/auth/reset-password/route.ts**

```typescript
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token et mot de passe requis" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { resetToken: token },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Lien de réinitialisation invalide" },
        { status: 400 }
      );
    }

    if (user.resetExpiresAt && user.resetExpiresAt < new Date()) {
      return NextResponse.json(
        { error: "Ce lien a expiré. Veuillez refaire une demande." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetExpiresAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Create src/app/forgot-password/page.tsx**

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 flex justify-center">
          <Image src="/logoV2.png" alt="Callaps" width={180} height={54} className="object-contain" priority />
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-10 shadow-xl shadow-slate-200/50">
          {sent ? (
            <div className="text-center">
              <h1 className="text-xl font-bold text-slate-900">Email envoyé</h1>
              <p className="mt-2 text-sm text-slate-500">
                Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.
              </p>
              <a href="/sign-in" className="mt-6 inline-block text-sm text-indigo-600 hover:underline">
                Retour à la connexion
              </a>
            </div>
          ) : (
            <>
              <h1 className="text-center text-2xl font-bold text-slate-900">
                Mot de passe oublié
              </h1>
              <p className="mt-2 text-center text-sm text-slate-500">
                Entrez votre email pour recevoir un lien de réinitialisation
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="vous@entreprise.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? "Envoi..." : "Envoyer le lien"}
                </button>

                <div className="text-center">
                  <a href="/sign-in" className="text-sm text-indigo-600 hover:underline">
                    Retour à la connexion
                  </a>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create src/app/reset-password/[token]/page.tsx**

```tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/sign-in"), 2000);
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 flex justify-center">
          <Image src="/logoV2.png" alt="Callaps" width={180} height={54} className="object-contain" priority />
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-10 shadow-xl shadow-slate-200/50">
          {success ? (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
                <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="mt-6 text-xl font-bold text-slate-900">Mot de passe modifié</h1>
              <p className="mt-2 text-sm text-slate-500">Redirection vers la connexion...</p>
            </div>
          ) : (
            <>
              <h1 className="text-center text-2xl font-bold text-slate-900">
                Nouveau mot de passe
              </h1>
              <p className="mt-2 text-center text-sm text-slate-500">
                Choisissez un nouveau mot de passe pour votre compte
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                {error && (
                  <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-200/50">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Nouveau mot de passe
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Minimum 8 caractères"
                  />
                </div>

                <div>
                  <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Confirmer
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Retapez votre mot de passe"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? "Modification..." : "Modifier mon mot de passe"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/email/ src/app/api/auth/forgot-password/ src/app/api/auth/reset-password/ src/app/forgot-password/ src/app/reset-password/
git commit -m "feat: add password reset flow (forgot + reset pages, email templates)"
```

---

### Task 9: Admin portal — invitation on client creation

**Files:**
- Modify: `src/app/(dashboard)/admin-portal/clients/actions.ts`
- Modify: `src/app/(dashboard)/admin-portal/prospects/actions.ts`

- [ ] **Step 1: Update createAdminClient in clients/actions.ts**

In `src/app/(dashboard)/admin-portal/clients/actions.ts`, replace the `createAdminClient` function (lines 87-141):

```typescript
import crypto from "crypto";
import { sendInviteEmail } from "@/lib/email/invite";
```

Add these imports at the top of the file (after existing imports).

Then replace the `createAdminClient` function:

```typescript
export async function createAdminClient(data: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  notes?: string;
}) {
  const ctx = await requireAdminPortal();

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  let clientUser;
  if (existingUser) {
    // Check if already managed by an admin
    const existingRelation = await prisma.adminClient.findFirst({
      where: { clientId: existingUser.id },
    });
    if (existingRelation) {
      throw new Error("Ce client est déjà géré par un administrateur");
    }
    clientUser = existingUser;
  } else {
    // Create new user with invitation token
    const inviteToken = crypto.randomUUID();
    const inviteExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

    clientUser = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: "client",
        approved: true,
        company: data.company || null,
        phone: data.phone || null,
        inviteToken,
        inviteExpiresAt,
      },
    });

    // Send invitation email
    await sendInviteEmail({
      to: data.email,
      userName: data.name,
      inviteToken,
      adminName: ctx.userName,
    });
  }

  // Create AdminClient relation
  const adminClient = await prisma.adminClient.create({
    data: {
      adminId: ctx.userId,
      clientId: clientUser.id,
      clientOrgId: clientUser.id,
      status: "onboarding",
      contractStatus: "draft",
      paymentStatus: "pending",
      notes: data.notes || null,
    },
  });

  revalidatePath("/admin-portal/clients");
  return adminClient;
}
```

- [ ] **Step 2: Add resendInvite action**

Add this new function at the end of `src/app/(dashboard)/admin-portal/clients/actions.ts`:

```typescript
// ---------- Resend invite ----------
export async function resendClientInvite(clientId: string) {
  const ctx = await requireAdminPortal();
  const access = await canAccessClient(
    ctx.userId,
    clientId,
    ctx.userRole === "super_admin"
  );
  if (!access.access) throw new Error("Accès refusé");

  const user = await prisma.user.findUnique({ where: { id: clientId } });
  if (!user) throw new Error("Client non trouvé");
  if (user.passwordHash) throw new Error("Ce client a déjà activé son compte");

  const inviteToken = crypto.randomUUID();
  const inviteExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: clientId },
    data: { inviteToken, inviteExpiresAt },
  });

  await sendInviteEmail({
    to: user.email,
    userName: user.name,
    inviteToken,
    adminName: ctx.userName,
  });

  revalidatePath(`/admin-portal/clients/${clientId}`);
}
```

- [ ] **Step 3: Update convertProspectToClient in prospects/actions.ts**

In `src/app/(dashboard)/admin-portal/prospects/actions.ts`, find the `convertProspectToClient` function. Add imports at the top:

```typescript
import crypto from "crypto";
import { sendInviteEmail } from "@/lib/email/invite";
```

Then replace the user creation block (around line 284-296). Find this code:

```typescript
    clientUser = await prisma.user.create({
      data: {
        clerkId: `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        email: prospect.email || `prospect_${prospectId}@placeholder.local`,
        name: prospect.name,
        role: "client",
        approved: true,
        company: prospect.company || null,
        phone: prospect.phone || null,
      },
    });
```

Replace with:

```typescript
    const inviteToken = crypto.randomUUID();
    const inviteExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    clientUser = await prisma.user.create({
      data: {
        email: prospect.email || `prospect_${prospectId}@placeholder.local`,
        name: prospect.name,
        role: "client",
        approved: true,
        company: prospect.company || null,
        phone: prospect.phone || null,
        inviteToken,
        inviteExpiresAt,
      },
    });

    // Send invitation email if prospect has a real email
    if (prospect.email) {
      await sendInviteEmail({
        to: prospect.email,
        userName: prospect.name,
        inviteToken,
        adminName: ctx.userName,
      });
    }
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/admin-portal/clients/actions.ts src/app/(dashboard)/admin-portal/prospects/actions.ts
git commit -m "feat: add invitation email on client creation and prospect conversion"
```

---

### Task 10: Remove ClerkProvider and update root layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Rewrite src/app/layout.tsx**

Replace the entire file:

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Callaps - Agents IA pour vos appels",
  description: "Automatisez vos appels commerciaux avec des agents IA intelligents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: remove ClerkProvider from root layout"
```

---

### Task 11: Update header — replace UserButton with custom logout

**Files:**
- Modify: `src/components/layout/header.tsx`

- [ ] **Step 1: Rewrite src/components/layout/header.tsx**

Replace the entire file:

```tsx
"use client";

import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface HeaderProps {
  title: string;
  description?: string;
  userName?: string;
}

export function Header({ title, description, userName }: HeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/sign-in");
  }

  return (
    <header className="flex h-[72px] items-center justify-between border-b border-slate-100 bg-white/80 px-8 backdrop-blur-sm">
      <div>
        <h1 className="text-[17px] font-semibold text-slate-900">{title}</h1>
        {description && (
          <p className="text-[13px] text-slate-500">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-indigo-500" />
        </Button>
        <div className="h-6 w-px bg-slate-200" />
        {userName && (
          <span className="text-sm font-medium text-slate-600">{userName}</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          onClick={handleLogout}
        >
          <LogOut className="h-[18px] w-[18px]" />
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/header.tsx
git commit -m "feat: replace Clerk UserButton with custom logout button"
```

---

### Task 12: Update sidebar — remove OrganizationSwitcher

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`

- [ ] **Step 1: Remove OrganizationSwitcher from app-sidebar.tsx**

In `src/components/layout/app-sidebar.tsx`:

1. Remove the Clerk import line:
```typescript
// DELETE: import { OrganizationSwitcher } from "@clerk/nextjs";
```

2. Remove the `showOrgSwitcher` prop from `AppSidebarProps` and the component signature.

3. Remove the entire `{showOrgSwitcher && (...)}` block (lines 139-155).

The updated interface and component signature:

```typescript
interface AppSidebarProps {
  role: "admin" | "client";
  isAdmin?: boolean;
}

export function AppSidebar({ role, isAdmin }: AppSidebarProps) {
```

- [ ] **Step 2: Update dashboard layout to remove showOrgSwitcher prop**

In `src/app/(dashboard)/layout.tsx`:

1. Remove the `clerkClient` import:
```typescript
// DELETE: import { clerkClient } from "@clerk/nextjs/server";
```

2. Simplify the `getImpersonationLabel` function — remove the Clerk org lookup branch:

```typescript
async function getImpersonationLabel(orgId: string): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: orgId },
      select: { name: true, email: true },
    });
    return user ? `${user.name} (${user.email})` : orgId;
  } catch {
    return orgId;
  }
}
```

3. Remove `showOrgSwitcher` from the `AppSidebar` usage:

```tsx
<AppSidebar
  role={sidebarRole as "admin" | "client"}
  isAdmin={role === "admin" || role === "super_admin"}
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/app-sidebar.tsx src/app/(dashboard)/layout.tsx
git commit -m "feat: remove Clerk OrganizationSwitcher from sidebar"
```

---

### Task 13: Update all remaining Clerk references

**Files:**
- Modify: `src/app/(dashboard)/settings/page.tsx`
- Modify: `src/app/(dashboard)/campaigns/new/page.tsx`
- Modify: `src/app/api/invoices/[id]/pdf/route.ts`
- Modify: `src/app/(dashboard)/admin/billing/page.tsx`
- Modify: `src/app/(dashboard)/admin/billing/[orgId]/page.tsx`
- Modify: `src/components/admin-portal/client-detail.tsx`
- Modify: `src/app/(dashboard)/admin/organizations/actions.ts`

- [ ] **Step 1: Fix settings/page.tsx**

In `src/app/(dashboard)/settings/page.tsx`, `requireAuth()` now returns the DB user ID directly. Change lines 14-15:

From:
```typescript
const clerkId = await requireAuth();
const user = await prisma.user.findUnique({ where: { clerkId } });
```

To:
```typescript
const userId = await requireAuth();
const user = await prisma.user.findUnique({ where: { id: userId } });
```

- [ ] **Step 2: Fix campaigns/new/page.tsx**

In `src/app/(dashboard)/campaigns/new/page.tsx`, same pattern. Change lines 8-9:

From:
```typescript
const clerkId = await requireAuth();
const user = await prisma.user.findUnique({ where: { clerkId } });
```

To:
```typescript
const userId = await requireAuth();
const user = await prisma.user.findUnique({ where: { id: userId } });
```

- [ ] **Step 3: Fix invoices/[id]/pdf/route.ts**

In `src/app/api/invoices/[id]/pdf/route.ts`, replace the auth section (lines 1, 31-54):

Replace the import:
```typescript
// DELETE: import { auth } from "@clerk/nextjs/server";
import { verifySession } from "@/lib/jwt";
```

Replace lines 31-36:
```typescript
  // 1. Auth check
  const session = await verifySession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Non authentifié" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
```

Replace line 54:
```typescript
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
```

Also update the permission check further in the file: wherever it checks `clerkOrgId`, replace with `user?.id` since orgId is now the user ID.

- [ ] **Step 4: Fix admin/billing/page.tsx**

In `src/app/(dashboard)/admin/billing/page.tsx`, replace the local `requireSuperAdmin`:

From:
```typescript
import { auth } from "@clerk/nextjs/server";
// ...
async function requireSuperAdmin() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const user = await prisma.user.findFirst({ where: { clerkId: userId } });
  if (!user || user.role !== "super_admin") redirect("/dashboard");
  return user;
}
```

To:
```typescript
import { verifySession } from "@/lib/jwt";
// ...
async function requireSuperAdmin() {
  const session = await verifySession();
  if (!session) redirect("/sign-in");
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.role !== "super_admin") redirect("/dashboard");
  return user;
}
```

- [ ] **Step 5: Fix admin/billing/[orgId]/page.tsx**

Same pattern as above. In `src/app/(dashboard)/admin/billing/[orgId]/page.tsx`:

From:
```typescript
import { auth, clerkClient } from "@clerk/nextjs/server";
// ...
async function requireSuperAdmin() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const user = await prisma.user.findFirst({ where: { clerkId: userId } });
  if (!user || user.role !== "super_admin") redirect("/dashboard");
  return user;
}
```

To:
```typescript
import { verifySession } from "@/lib/jwt";
// ...
async function requireSuperAdmin() {
  const session = await verifySession();
  if (!session) redirect("/sign-in");
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.role !== "super_admin") redirect("/dashboard");
  return user;
}
```

Also remove `clerkClient` from the import and any usage of Clerk org lookups in this file.

- [ ] **Step 6: Fix client-detail.tsx**

In `src/components/admin-portal/client-detail.tsx`, remove `clerkId` from the type definition at line 66. Change:

```typescript
      clerkId: string;
```

Remove this line from the client type.

- [ ] **Step 7: Rewrite admin/organizations/actions.ts**

This file uses `clerkClient()` extensively for Clerk organization management. Since we're removing Clerk, these functions should now work with the DB directly. Replace `src/app/(dashboard)/admin/organizations/actions.ts`:

```typescript
"use server";

import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getOrganizations() {
  await requireSuperAdmin();
  // Return all users as "organizations" for the super admin view
  const users = await prisma.user.findMany({
    where: { role: "client", approved: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      company: true,
      createdAt: true,
    },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.company || u.name,
    slug: u.email,
    membersCount: 1,
    createdAt: u.createdAt,
    imageUrl: "",
  }));
}

export async function createOrganization(formData: FormData) {
  await requireSuperAdmin();
  // Organizations are now just users — redirect to admin client creation
  throw new Error("Utilisez le portail admin pour créer des clients");
}

export async function deleteOrganization(orgId: string) {
  await requireSuperAdmin();
  // Soft delete or actual delete based on business logic
  await prisma.user.delete({ where: { id: orgId } });
  revalidatePath("/admin/organizations");
}

export async function getOrganizationMembers(orgId: string) {
  await requireSuperAdmin();
  const user = await prisma.user.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  if (!user) return [];
  return [{
    id: user.id,
    userId: user.id,
    email: user.email,
    firstName: user.name.split(" ")[0] || "",
    lastName: user.name.split(" ").slice(1).join(" ") || "",
    imageUrl: "",
    role: user.role,
    createdAt: user.createdAt,
  }];
}

export async function addMemberToOrganization(orgId: string, formData: FormData) {
  await requireSuperAdmin();
  throw new Error("Utilisez le portail admin pour gérer les accès");
}

export async function removeMemberFromOrganization(orgId: string, userId: string) {
  await requireSuperAdmin();
  throw new Error("Utilisez le portail admin pour gérer les accès");
}

export async function updateMemberRole(orgId: string, userId: string, role: string) {
  await requireSuperAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { role: role as "admin" | "client" | "super_admin" },
  });
  revalidatePath(`/admin/organizations/${orgId}`);
}
```

- [ ] **Step 8: Commit**

```bash
git add src/app/(dashboard)/settings/page.tsx src/app/(dashboard)/campaigns/new/page.tsx src/app/api/invoices/[id]/pdf/route.ts src/app/(dashboard)/admin/billing/page.tsx src/app/(dashboard)/admin/billing/[orgId]/page.tsx src/components/admin-portal/client-detail.tsx src/app/(dashboard)/admin/organizations/actions.ts
git commit -m "fix: update all remaining Clerk references to use JWT auth"
```

---

### Task 14: Delete Clerk-specific files and pages

**Files:**
- Delete: `src/app/sign-up/[[...sign-up]]/page.tsx`
- Delete: `src/app/pending/page.tsx`
- Delete: `src/app/pending/sign-out-button.tsx`
- Delete: `src/app/api/webhooks/clerk/route.ts`

- [ ] **Step 1: Delete files**

```bash
rm -rf src/app/sign-up/
rm -rf src/app/pending/
rm -rf src/app/api/webhooks/clerk/
```

- [ ] **Step 2: Update dashboard layout redirect**

In `src/app/(dashboard)/layout.tsx`, the catch block redirects to `/pending`. Change it to `/sign-in`:

```typescript
  try {
    ctx = await getOrgContext();
  } catch {
    redirect("/sign-in");
  }
```

Also change the unapproved redirect:
```typescript
  if (!ctx.approved) {
    redirect("/sign-in");
  }
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete Clerk sign-up, pending, and webhook files"
```

---

### Task 15: Uninstall Clerk dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Uninstall packages**

```bash
npm uninstall @clerk/nextjs svix
```

- [ ] **Step 2: Verify no remaining Clerk imports**

```bash
grep -r "@clerk" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v generated
```

This should return zero results. If any remain, fix them.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: uninstall @clerk/nextjs and svix"
```

---

### Task 16: Update seed script and utility files

**Files:**
- Modify: `prisma/seed.ts`
- Modify: `prisma/update-email.ts`

- [ ] **Step 1: Update prisma/seed.ts**

Remove `clerkId` from the seed data. Replace the user creation to use `passwordHash` instead. Update the seed to hash a default password:

```typescript
import bcrypt from "bcrypt";
```

Replace user creation data — remove `clerkId`, add `passwordHash`:

```typescript
const passwordHash = await bcrypt.hash("admin123", 10);

// Create admin user
await prisma.user.upsert({
  where: { email: "admin@callaps.ai" },
  update: {},
  create: {
    email: "admin@callaps.ai",
    name: "Admin Callaps",
    passwordHash,
    role: "super_admin",
    approved: true,
  },
});
```

- [ ] **Step 2: Update prisma/update-email.ts**

Remove any `clerkId` references. Update the `where` clause to use `email` instead of `clerkId`.

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts prisma/update-email.ts
git commit -m "chore: update seed and utility scripts for custom auth"
```

---

### Task 17: Add NEXT_PUBLIC_APP_URL to env and final verification

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Ensure NEXT_PUBLIC_APP_URL is set**

Add to `.env.local` if not already present:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 2: Remove Clerk env variables**

Remove from `.env.local`:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
CLERK_WEBHOOK_SECRET=...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=...
NEXT_PUBLIC_CLERK_SIGN_UP_URL=...
```

- [ ] **Step 3: Run build to verify no compile errors**

```bash
npm run build
```

Fix any TypeScript errors that appear.

- [ ] **Step 4: Run the dev server and test manually**

```bash
npm run dev
```

Test:
1. Visit `/sign-in` — should show custom login form
2. Visit `/invite/fake-token` — should show "define password" form
3. Visit `/forgot-password` — should show email form
4. Try logging in with a seeded user

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup and env configuration for custom auth"
```

---

### Task 18: Add resend invite button to client detail page

**Files:**
- Modify: `src/components/admin-portal/client-detail.tsx`

- [ ] **Step 1: Add resend invite button**

In the client detail component, add a button that appears when `passwordHash` is null (invitation not yet accepted). Import the `resendClientInvite` action and add a button in the client info section:

```tsx
import { resendClientInvite } from "@/app/(dashboard)/admin-portal/clients/actions";
```

Add a status indicator and resend button near the client's email display:

```tsx
{!client.passwordHash && (
  <div className="flex items-center gap-2 mt-2">
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200/50">
      Invitation en attente
    </span>
    <button
      onClick={async () => {
        await resendClientInvite(client.id);
      }}
      className="text-xs text-indigo-600 hover:underline"
    >
      Renvoyer l&apos;invitation
    </button>
  </div>
)}
```

Note: Check the exact component structure in `client-detail.tsx` to place this in the right location. The `client` object will need `passwordHash` added to its type and included in the Prisma query in `getAdminClient`.

Update `getAdminClient` in `src/app/(dashboard)/admin-portal/clients/actions.ts` to include `passwordHash` in the client select (or it's already included via `client: true`).

- [ ] **Step 2: Commit**

```bash
git add src/components/admin-portal/client-detail.tsx
git commit -m "feat: add resend invite button on client detail page"
```
