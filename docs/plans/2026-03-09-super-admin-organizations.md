# Super Admin + Clerk Organizations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add multi-tenant support with platform-level super admin, Clerk Organizations with 4 org roles, cookie-based impersonation, and org-scoped data filtering.

**Architecture:** Platform role (`super_admin`) stored in DB. Organization roles managed by Clerk Organizations (org_admin, manager, operator, viewer). All resources (Agent, Campaign) scoped by `orgId`. Super admin can impersonate any org via cookie. `getOrgContext()` replaces all current auth patterns.

**Tech Stack:** Clerk Organizations (v7), Next.js cookies, Prisma 7, PostgreSQL

---

### Task 1: Update Prisma schema — add `super_admin` role and `orgId` fields

**Files:**
- Modify: `prisma/schema.prisma:10-13` (UserRole enum)
- Modify: `prisma/schema.prisma:49-84` (Agent model)
- Modify: `prisma/schema.prisma:86-119` (Campaign model)

**Step 1: Add `super_admin` to UserRole enum**

In `prisma/schema.prisma`, change lines 10-13:

```prisma
enum UserRole {
  admin
  client
  super_admin
}
```

**Step 2: Add `orgId` to Agent model**

In the Agent model (line 76, after `userId`), add:

```prisma
  orgId            String?
```

Note: `orgId` is nullable for migration — existing agents don't have an org yet.

**Step 3: Add `orgId` to Campaign model**

In the Campaign model (line 108, after `userId`), add:

```prisma
  orgId           String?
```

**Step 4: Push schema to database**

Run: `npx prisma db push`

If warned about data loss, use `--accept-data-loss` only if the warning is about new nullable fields (it shouldn't be — we're only adding nullable columns and an enum value).

**Step 5: Regenerate Prisma client**

Run: `npx prisma generate`

**Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors (orgId is optional, so existing code still compiles)

**Step 7: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add super_admin role and orgId to schema"
```

---

### Task 2: Create permissions module

**Files:**
- Create: `src/lib/permissions.ts`

**Step 1: Create the permissions file**

Create `src/lib/permissions.ts`:

```typescript
export type OrgRole = "org_admin" | "manager" | "operator" | "viewer";

export type Permission =
  | "agents:read"
  | "agents:create"
  | "agents:update"
  | "agents:delete"
  | "agents:publish"
  | "campaigns:read"
  | "campaigns:create"
  | "campaigns:update"
  | "campaigns:delete"
  | "campaigns:launch"
  | "members:read"
  | "members:invite"
  | "members:remove"
  | "members:update_role"
  | "analytics:read"
  | "billing:read"
  | "billing:manage"
  | "phone_numbers:read"
  | "phone_numbers:manage"
  | "integrations:read"
  | "integrations:manage";

const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  org_admin: [
    "agents:read", "agents:create", "agents:update", "agents:delete", "agents:publish",
    "campaigns:read", "campaigns:create", "campaigns:update", "campaigns:delete", "campaigns:launch",
    "members:read", "members:invite", "members:remove", "members:update_role",
    "analytics:read",
    "billing:read", "billing:manage",
    "phone_numbers:read", "phone_numbers:manage",
    "integrations:read", "integrations:manage",
  ],
  manager: [
    "agents:read", "agents:create", "agents:update", "agents:delete", "agents:publish",
    "campaigns:read", "campaigns:create", "campaigns:update", "campaigns:delete", "campaigns:launch",
    "analytics:read",
    "phone_numbers:read", "phone_numbers:manage",
    "integrations:read", "integrations:manage",
  ],
  operator: [
    "agents:read",
    "campaigns:read", "campaigns:launch",
    "analytics:read",
    "phone_numbers:read",
  ],
  viewer: [
    "agents:read",
    "campaigns:read",
    "analytics:read",
  ],
};

export function hasPermission(role: OrgRole | "super_admin", permission: Permission): boolean {
  if (role === "super_admin") return true;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: OrgRole | "super_admin"): Permission[] {
  if (role === "super_admin") {
    // All permissions
    return Object.values(ROLE_PERMISSIONS).flat().filter((v, i, a) => a.indexOf(v) === i);
  }
  return ROLE_PERMISSIONS[role] ?? [];
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/lib/permissions.ts
git commit -m "feat: add permissions module with role-permission map"
```

---

### Task 3: Create `getOrgContext()` helper

This replaces the current `requireAuth() + prisma.user.findUnique()` pattern used in every server action.

**Files:**
- Modify: `src/lib/auth.ts`

**Step 1: Rewrite `src/lib/auth.ts`**

Replace the entire file with:

```typescript
import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { OrgRole } from "@/lib/permissions";

export type UserRole = "admin" | "client" | "super_admin";
export type EffectiveRole = OrgRole | "super_admin";

export interface OrgContext {
  userId: string;       // DB user ID
  clerkId: string;      // Clerk user ID
  orgId: string | null; // Clerk org ID (null for super_admin without impersonation)
  role: EffectiveRole;
  isImpersonating: boolean;
  isSuperAdmin: boolean;
}

export async function getUserRole(): Promise<UserRole> {
  const { sessionClaims } = await auth();
  return (sessionClaims?.metadata as { role?: UserRole })?.role || "client";
}

export async function requireAdmin() {
  const role = await getUserRole();
  if (role !== "admin" && role !== "super_admin") {
    throw new Error("Unauthorized: admin access required");
  }
}

export async function requireSuperAdmin() {
  const role = await getUserRole();
  if (role !== "super_admin") {
    throw new Error("Unauthorized: super admin access required");
  }
}

export async function requireAuth() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

/**
 * Get the organization context for the current request.
 * This is the main auth helper — use this in all server actions instead of requireAuth().
 *
 * For super_admin: returns impersonated org if cookie is set, otherwise orgId is null.
 * For regular users: returns their active Clerk organization and role.
 */
export async function getOrgContext(): Promise<OrgContext> {
  const { userId: clerkId, orgId: clerkOrgId, orgRole } = await auth();

  if (!clerkId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  // Check if super_admin
  if (user.role === "super_admin") {
    const cookieStore = await cookies();
    const impersonatedOrg = cookieStore.get("impersonate_org")?.value;

    return {
      userId: user.id,
      clerkId,
      orgId: impersonatedOrg || null,
      role: "super_admin",
      isImpersonating: !!impersonatedOrg,
      isSuperAdmin: true,
    };
  }

  // Regular user — use Clerk org
  const orgId = clerkOrgId || null;
  const role = (orgRole as OrgRole) || "viewer";

  return {
    userId: user.id,
    clerkId,
    orgId,
    role,
    isImpersonating: false,
    isSuperAdmin: false,
  };
}

/**
 * Build a Prisma `where` filter scoped to the current org.
 * Super admins without impersonation see everything (returns {}).
 */
export function orgFilter(ctx: OrgContext): { orgId?: string } {
  if (ctx.isSuperAdmin && !ctx.isImpersonating) {
    return {}; // No filter — super admin sees all
  }
  if (!ctx.orgId) {
    return { orgId: "___none___" }; // Safety: no org = no data
  }
  return { orgId: ctx.orgId };
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: May have errors in files importing from auth.ts — that's expected, we'll fix them in subsequent tasks.

**Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: add getOrgContext() and orgFilter() helpers"
```

---

### Task 4: Update agent server actions to use `getOrgContext()`

**Files:**
- Modify: `src/app/(dashboard)/agents/actions.ts`

**Step 1: Update imports**

Change line 4 from:
```typescript
import { requireAuth } from "@/lib/auth";
```
to:
```typescript
import { getOrgContext, orgFilter } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
```

**Step 2: Update `createAgent()`**

Replace lines 101-135 with:

```typescript
export async function createAgent(formData: FormData) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "agents:create")) {
    throw new Error("Permission denied");
  }

  const data = extractAgentData(formData);

  const agent = await prisma.agent.create({
    data: {
      ...data,
      userId: ctx.userId,
      orgId: ctx.orgId,
    },
  });

  revalidatePath("/agents");
  redirect(`/agents/${agent.id}`);
}
```

**Step 3: Update `updateAgent()`**

Replace lines 137-157 with:

```typescript
export async function updateAgent(id: string, formData: FormData) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "agents:update")) {
    throw new Error("Permission denied");
  }

  const data = extractAgentData(formData);

  const agent = await prisma.agent.update({
    where: { id, userId: ctx.userId, ...orgFilter(ctx) },
    data,
  });

  if (agent.retellAgentId && agent.retellLlmId) {
    await updateRetellLlm(agent.retellLlmId, buildRetellLlmParams(agent));
    await updateRetellAgent(agent.retellAgentId, buildRetellAgentParams(agent, agent.retellLlmId));
  }

  revalidatePath(`/agents/${id}`);
  revalidatePath("/agents");
}
```

**Step 4: Update `publishAgent()`**

Replace lines 159-195 with:

```typescript
export async function publishAgent(id: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "agents:publish")) {
    throw new Error("Permission denied");
  }

  const agent = await prisma.agent.findFirst({
    where: { id, userId: ctx.userId, ...orgFilter(ctx) },
  });
  if (!agent) throw new Error("Agent not found");

  let retellLlmId = agent.retellLlmId;
  let retellAgentId = agent.retellAgentId;

  if (!retellLlmId) {
    const llm = await createRetellLlm(buildRetellLlmParams(agent));
    retellLlmId = llm.llm_id;
  } else {
    await updateRetellLlm(retellLlmId, buildRetellLlmParams(agent));
  }

  if (!retellAgentId) {
    const retellAgent = await createRetellAgent(buildRetellAgentParams(agent, retellLlmId!));
    retellAgentId = retellAgent.agent_id;
  } else {
    await updateRetellAgent(retellAgentId, buildRetellAgentParams(agent, retellLlmId!));
  }

  await prisma.agent.update({
    where: { id, userId: ctx.userId },
    data: { published: true, retellAgentId, retellLlmId },
  });

  revalidatePath(`/agents/${id}`);
  revalidatePath("/agents");
}
```

**Step 5: Update `deleteAgent()`**

Replace lines 197-227 with:

```typescript
export async function deleteAgent(id: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "agents:delete")) {
    throw new Error("Permission denied");
  }

  const agent = await prisma.agent.findFirst({
    where: { id, userId: ctx.userId, ...orgFilter(ctx) },
  });
  if (!agent) throw new Error("Agent not found");

  if (agent.retellAgentId) {
    try { await deleteRetellAgent(agent.retellAgentId); } catch { /* ignore */ }
  }
  if (agent.retellLlmId) {
    try { await deleteRetellLlm(agent.retellLlmId); } catch { /* ignore */ }
  }

  await prisma.agent.delete({ where: { id } });

  revalidatePath("/agents");
  redirect("/agents");
}
```

**Step 6: Update `getWebCallToken()`**

Replace lines 229-241 with:

```typescript
export async function getWebCallToken(agentId: string) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "agents:read")) {
    throw new Error("Permission denied");
  }

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, userId: ctx.userId, ...orgFilter(ctx) },
  });
  if (!agent?.retellAgentId) throw new Error("Agent not published");

  const webCall = await createWebCall({ agent_id: agent.retellAgentId });
  return { access_token: webCall.access_token };
}
```

**Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

**Step 8: Commit**

```bash
git add src/app/(dashboard)/agents/actions.ts
git commit -m "feat: update agent actions to use getOrgContext and permissions"
```

---

### Task 5: Update campaign server actions to use `getOrgContext()`

**Files:**
- Modify: `src/app/(dashboard)/campaigns/actions.ts`

**Step 1: Update imports**

Replace line 4:
```typescript
import { requireAuth } from "@/lib/auth";
```
with:
```typescript
import { getOrgContext, orgFilter } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
```

**Step 2: Update all functions**

Replace the `requireAuth() + findUnique` pattern in each function:

- `createCampaign()`: Use `getOrgContext()`, check `campaigns:create`, set `orgId: ctx.orgId`
- `createCampaignFull()`: Same as above
- `deleteCampaign()`: Use `getOrgContext()`, check `campaigns:delete`, filter with `orgFilter(ctx)`
- `importContacts()`: Use `getOrgContext()`, check `campaigns:update`, filter with `orgFilter(ctx)`
- `launchCampaign()`: Use `getOrgContext()`, check `campaigns:launch`, filter with `orgFilter(ctx)`
- `pauseCampaign()`: Use `getOrgContext()`, check `campaigns:update`, filter with `orgFilter(ctx)`

Each function follows this pattern:

```typescript
export async function createCampaign(formData: FormData) {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "campaigns:create")) {
    throw new Error("Permission denied");
  }

  const campaign = await prisma.campaign.create({
    data: {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      agentId: formData.get("agentId") as string,
      userId: ctx.userId,
      orgId: ctx.orgId,
    },
  });

  revalidatePath("/campaigns");
  redirect(`/campaigns/${campaign.id}`);
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/app/(dashboard)/campaigns/actions.ts
git commit -m "feat: update campaign actions to use getOrgContext and permissions"
```

---

### Task 6: Update phone numbers and integrations actions

**Files:**
- Modify: `src/app/(dashboard)/phone-numbers/actions.ts`

**Step 1: Update phone-numbers actions**

Replace `getUser()` helper with `getOrgContext()` pattern. Add permission checks for `phone_numbers:read` and `phone_numbers:manage`.

```typescript
import { getOrgContext } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
```

Each function: replace `await getUser()` with:
```typescript
const ctx = await getOrgContext();
if (!hasPermission(ctx.role, "phone_numbers:manage")) {
  throw new Error("Permission denied");
}
```

For read-only (`fetchPhoneNumbers`, `fetchAgents`): check `phone_numbers:read`.
For mutations: check `phone_numbers:manage`.
For `fetchAgents()`: filter by `orgFilter(ctx)`.

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/app/(dashboard)/phone-numbers/actions.ts
git commit -m "feat: update phone-numbers actions to use getOrgContext"
```

---

### Task 7: Update page-level data fetching

Server pages that fetch data need to use `getOrgContext()` for filtering.

**Files:**
- Modify: `src/app/(dashboard)/agents/page.tsx` — filter agents by `orgFilter(ctx)`
- Modify: `src/app/(dashboard)/campaigns/page.tsx` — filter campaigns by `orgFilter(ctx)`
- Modify: `src/app/(dashboard)/dashboard/page.tsx` (or wherever the client dashboard is)
- Modify: `src/app/(dashboard)/layout.tsx` — pass org context to sidebar

**Step 1: Update each page**

For each page that currently does:
```typescript
const clerkId = await requireAuth();
const user = await prisma.user.findUnique({ where: { clerkId } });
const agents = await prisma.agent.findMany({ where: { userId: user.id } });
```

Replace with:
```typescript
const ctx = await getOrgContext();
const agents = await prisma.agent.findMany({
  where: { ...orgFilter(ctx) },
});
```

**Step 2: Update layout to pass role info**

In `src/app/(dashboard)/layout.tsx`, update to get role from `getOrgContext()` if needed, or keep `getUserRole()` since the sidebar only needs admin vs client distinction. Add super_admin support:

```typescript
const role = await getUserRole();
// super_admin sees admin sidebar
const sidebarRole = role === "super_admin" ? "admin" : role;
```

**Step 3: Verify the app renders**

Run: `npm run dev`
Navigate to `/agents` — should show agents filtered by org.

**Step 4: Commit**

```bash
git add src/app/(dashboard)/agents/page.tsx src/app/(dashboard)/campaigns/page.tsx src/app/(dashboard)/layout.tsx
git commit -m "feat: update pages to use org-scoped data fetching"
```

---

### Task 8: Impersonation server actions

**Files:**
- Create: `src/app/(dashboard)/admin/impersonation-actions.ts`

**Step 1: Create impersonation actions**

```typescript
"use server";

import { requireSuperAdmin } from "@/lib/auth";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function startImpersonation(orgId: string) {
  await requireSuperAdmin();
  const cookieStore = await cookies();
  cookieStore.set("impersonate_org", orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4, // 4 hours
  });
  revalidatePath("/");
}

export async function stopImpersonation() {
  await requireSuperAdmin();
  const cookieStore = await cookies();
  cookieStore.delete("impersonate_org");
  revalidatePath("/");
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/app/(dashboard)/admin/impersonation-actions.ts
git commit -m "feat: add impersonation start/stop server actions"
```

---

### Task 9: Impersonation banner component

**Files:**
- Create: `src/components/layout/impersonation-banner.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`

**Step 1: Create the banner component**

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { stopImpersonation } from "@/app/(dashboard)/admin/impersonation-actions";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

interface ImpersonationBannerProps {
  orgId: string;
}

export function ImpersonationBanner({ orgId }: ImpersonationBannerProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleStop = () => {
    startTransition(async () => {
      await stopImpersonation();
      router.refresh();
    });
  };

  return (
    <div className="flex items-center justify-between bg-red-600 px-4 py-2 text-sm text-white">
      <span>
        Mode impersonation — Organisation: <strong>{orgId}</strong>
      </span>
      <Button
        onClick={handleStop}
        variant="outline"
        size="sm"
        disabled={isPending}
        className="border-white/30 bg-transparent text-white hover:bg-white/10 text-xs"
      >
        <X className="h-3 w-3 mr-1" />
        Quitter
      </Button>
    </div>
  );
}
```

**Step 2: Add banner to layout**

In `src/app/(dashboard)/layout.tsx`, import and render the banner when impersonating:

```typescript
import { getUserRole } from "@/lib/auth";
import { cookies } from "next/headers";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const role = await getUserRole();
  const sidebarRole = role === "super_admin" ? "admin" : role;

  const cookieStore = await cookies();
  const impersonatedOrg = role === "super_admin"
    ? cookieStore.get("impersonate_org")?.value
    : null;

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar role={sidebarRole} />
      <div className="flex flex-1 flex-col overflow-auto">
        {impersonatedOrg && <ImpersonationBanner orgId={impersonatedOrg} />}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
```

**Step 3: Update `AppSidebarProps` type**

In `src/components/layout/app-sidebar.tsx`, change the role type to support super_admin mapped to admin:

The `sidebarRole` variable already maps `super_admin` → `"admin"`, so no change needed in the sidebar component itself.

**Step 4: Verify the app renders**

Run: `npm run dev`
Expected: Layout renders without errors. No banner visible unless impersonate_org cookie is set.

**Step 5: Commit**

```bash
git add src/components/layout/impersonation-banner.tsx src/app/(dashboard)/layout.tsx
git commit -m "feat: add impersonation banner and integrate into layout"
```

---

### Task 10: Update admin pages for super admin

**Files:**
- Modify: `src/app/(dashboard)/admin/page.tsx`
- Modify: `src/app/(dashboard)/admin/clients/page.tsx`
- Modify: `src/app/(dashboard)/admin/clients/[id]/page.tsx`
- Modify: `src/app/(dashboard)/admin/actions.ts`

**Step 1: Update admin page guard**

In all admin pages, `requireAdmin()` already allows both `admin` and `super_admin` (from Task 3). No changes needed for access control.

**Step 2: Add impersonation button to client list**

In `src/app/(dashboard)/admin/clients/page.tsx`, add an "Impersonner" button next to each client row. This button needs the client's org ID. Since we're transitioning to orgs, and clients may not have orgs yet, we can add this button once Clerk Organizations is fully set up.

For now, add a simple impersonation trigger that sets the cookie with a client's user ID (as a temporary org identifier until Clerk orgs are set up):

Add to the table row actions, next to "Gerer":
```tsx
<Button
  variant="outline"
  size="sm"
  className="rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity"
  onClick={() => startImpersonation(client.id)}
>
  Impersonner
</Button>
```

Note: This needs to be a client component or use a form action. Since the page is a server component, wrap the button in a small client component or use a form with the server action.

**Step 3: Commit**

```bash
git add src/app/(dashboard)/admin/clients/page.tsx src/app/(dashboard)/admin/actions.ts
git commit -m "feat: add impersonation to admin client list"
```

---

### Task 11: Set up Clerk Organizations in Clerk Dashboard

This is a **manual step** — no code changes.

**Step 1: Enable Organizations in Clerk Dashboard**

1. Go to Clerk Dashboard → Organizations
2. Enable Organizations
3. Create the 4 custom roles: `org_admin`, `manager`, `operator`, `viewer`
4. Set default role for new members to `viewer`

**Step 2: Verify the API works**

After enabling, the `auth()` call should return `orgId` and `orgRole` when a user selects an organization.

**Step 3: Document the setup**

No commit needed — this is a Clerk Dashboard configuration.

---

### Task 12: Add organization switcher to sidebar

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`

**Step 1: Add Clerk OrganizationSwitcher**

Import and add the Clerk `OrganizationSwitcher` component to the sidebar, between the logo and navigation:

```typescript
import { OrganizationSwitcher } from "@clerk/nextjs";
```

Add after the logo div (line 60), before the nav:

```tsx
{role !== "admin" && (
  <div className="px-3 pb-2">
    <OrganizationSwitcher
      appearance={{
        elements: {
          rootBox: "w-full",
          organizationSwitcherTrigger:
            "w-full rounded-xl bg-slate-800/50 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50",
        },
      }}
    />
  </div>
)}
```

**Step 2: Verify it renders**

Run: `npm run dev`
Expected: Org switcher visible for client role users. Admin/super_admin see no switcher.

**Step 3: Commit**

```bash
git add src/components/layout/app-sidebar.tsx
git commit -m "feat: add Clerk organization switcher to sidebar"
```

---

### Task 13: Backfill existing data with orgId

This is a **migration task** — sets `orgId` on existing Agent and Campaign records.

**Files:**
- Create: `scripts/backfill-org-id.ts`

**Step 1: Create migration script**

```typescript
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  // For each user, if they belong to a Clerk org, set orgId on their agents and campaigns
  // For now, set orgId to the userId as a placeholder until Clerk orgs are created
  const users = await prisma.user.findMany();

  for (const user of users) {
    console.log(`Updating agents and campaigns for user ${user.email}...`);

    await prisma.agent.updateMany({
      where: { userId: user.id, orgId: null },
      data: { orgId: user.id }, // Temporary: use userId as orgId until real orgs
    });

    await prisma.campaign.updateMany({
      where: { userId: user.id, orgId: null },
      data: { orgId: user.id },
    });
  }

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Step 2: Run the script**

Run: `npx tsx scripts/backfill-org-id.ts`

**Step 3: Commit**

```bash
git add scripts/backfill-org-id.ts
git commit -m "feat: add backfill script for orgId on existing data"
```

---

### Task 14: Final integration test

**Step 1: Clear Next.js cache**

Run: `rm -rf .next`

**Step 2: Regenerate Prisma**

Run: `npx prisma generate`

**Step 3: Start dev server**

Run: `npm run dev`

**Step 4: Manual verification checklist**

- [ ] Login as regular user → see org switcher in sidebar
- [ ] Create an agent → agent gets `orgId` set
- [ ] Create a campaign → campaign gets `orgId` set
- [ ] Login as admin → see admin dashboard, no org switcher
- [ ] Set `super_admin` role in DB for a user → can access admin pages
- [ ] Set `impersonate_org` cookie → red banner appears, data filtered to that org
- [ ] Click "Quitter" on banner → cookie removed, back to global view
- [ ] TypeScript: `npx tsc --noEmit` passes

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete super admin + org system integration"
```
