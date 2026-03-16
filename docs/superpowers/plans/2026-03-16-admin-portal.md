# Admin Portal Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin portal (`/admin-portal/`) for admin users (resellers/internal managers) to manage their clients, track prospects, and handle billing autonomously.

**Architecture:** Extends the existing Next.js App Router codebase with new Prisma models (`AdminClient`, `AdminClientShare`, `Prospect`, `ProspectActivity`), a new route group under `(dashboard)/admin-portal/`, and a dedicated sidebar. Reuses existing auth (`getOrgContext`), impersonation (cookie-based), and billing (`/src/lib/billing.ts`) patterns.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma 7, PostgreSQL, Clerk Auth, Tailwind CSS 4, shadcn/ui, Lucide Icons

**Spec:** `docs/superpowers/specs/2026-03-16-admin-portal-design.md`

---

## File Structure

### New files to create

```
prisma/
  migrations/YYYYMMDD_admin_portal/migration.sql  (auto-generated)

src/lib/
  admin-access.ts                    # canAccessClient utility + helpers

src/app/(dashboard)/admin-portal/
  layout.tsx                         # Auth guard + admin-portal sidebar
  page.tsx                           # Dashboard page (server component)
  actions.ts                         # Dashboard KPIs server actions
  impersonation-actions.ts           # Admin impersonation (scoped)
  clients/
    page.tsx                         # Client list page
    actions.ts                       # Client CRUD server actions
    new/
      page.tsx                       # Create client page
    [id]/
      page.tsx                       # Client detail page
  prospects/
    page.tsx                         # Prospect pipeline page
    actions.ts                       # Prospect CRUD server actions
    new/
      page.tsx                       # Create prospect page
    [id]/
      page.tsx                       # Prospect detail page
  billing/
    page.tsx                         # Billing overview page
    actions.ts                       # Billing server actions (wraps billing.ts)
  settings/
    page.tsx                         # Admin settings page

src/components/admin-portal/
  admin-portal-sidebar.tsx           # Sidebar navigation
  dashboard-kpis.tsx                 # KPI cards (client component)
  dashboard-widgets.tsx              # Alert widgets (client component)
  client-list.tsx                    # Client list with filters (client component)
  client-form.tsx                    # Create/edit client form (client component)
  client-detail.tsx                  # Client detail view (client component)
  prospect-list.tsx                  # Prospect list with filters (client component)
  prospect-form.tsx                  # Create/edit prospect form (client component)
  prospect-detail.tsx                # Prospect detail with timeline (client component)
  prospect-stage-bar.tsx             # Stage progression bar (client component)
  billing-overview.tsx               # Billing list with KPIs (client component)
```

### Files to modify

```
prisma/schema.prisma                 # Add 4 new models + User relations
src/lib/auth.ts                      # Add requireAdminRole() helper
src/components/layout/app-sidebar.tsx # Add "admin-portal" role option
src/app/(dashboard)/layout.tsx       # Route admins to admin-portal sidebar
```

---

## Chunk 1: Database & Auth Foundation

### Task 1: Prisma Schema — New models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add AdminClient model to schema**

Add after the existing models in `prisma/schema.prisma`:

```prisma
model AdminClient {
  id              String   @id @default(cuid())
  adminId         String
  admin           User     @relation("AdminClients", fields: [adminId], references: [id])
  clientId        String
  client          User     @relation("ClientOfAdmin", fields: [clientId], references: [id])
  clientOrgId     String
  status          String   @default("onboarding") // onboarding | active | suspended | churned
  contractStatus  String   @default("draft")      // draft | sent | signed | expired
  contractUrl     String?
  paymentStatus   String   @default("pending")     // pending | authorized | active | failed
  paymentMethod   String?
  notes           String?
  metadata        Json     @default("{}")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  shares          AdminClientShare[]

  @@unique([adminId, clientId])
  @@index([adminId])
  @@index([clientId])
  @@map("admin_clients")
}

model AdminClientShare {
  id              String      @id @default(cuid())
  adminClientId   String
  adminClient     AdminClient @relation(fields: [adminClientId], references: [id], onDelete: Cascade)
  sharedWithId    String
  sharedWith      User        @relation("SharedAdminClients", fields: [sharedWithId], references: [id])
  permission      String      @default("read") // read | manage
  createdAt       DateTime    @default(now())

  @@unique([adminClientId, sharedWithId])
  @@index([sharedWithId])
  @@map("admin_client_shares")
}

model Prospect {
  id              String    @id @default(cuid())
  adminId         String
  admin           User      @relation("AdminProspects", fields: [adminId], references: [id])
  name            String
  phone           String?
  email           String?
  company         String?
  source          String    @default("manual") // manual | referral | website | event | other
  stage           String    @default("prospect") // prospect | contacted | demo_scheduled | demo_done | proposal_sent | negotiation | converted | lost
  lostReason      String?
  nextAction      String?
  nextActionDate  DateTime?
  estimatedValue  Int?
  notes           String?
  convertedToId   String?
  convertedTo     User?     @relation("ConvertedProspect", fields: [convertedToId], references: [id])
  metadata        Json      @default("{}")
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  activities      ProspectActivity[]

  @@index([adminId])
  @@index([stage])
  @@map("prospects")
}

model ProspectActivity {
  id          String   @id @default(cuid())
  prospectId  String
  prospect    Prospect @relation(fields: [prospectId], references: [id], onDelete: Cascade)
  type        String   // call | email | meeting | note | stage_change
  description String
  authorId    String
  author      User     @relation("ProspectActivities", fields: [authorId], references: [id])
  createdAt   DateTime @default(now())

  @@index([prospectId])
  @@map("prospect_activities")
}
```

- [ ] **Step 2: Add relations to User model**

In the existing `User` model, add these relations after `integrations Integration[]`:

```prisma
  adminClients       AdminClient[]       @relation("AdminClients")
  clientOfAdmin      AdminClient[]       @relation("ClientOfAdmin")
  sharedClients      AdminClientShare[]  @relation("SharedAdminClients")
  prospects          Prospect[]          @relation("AdminProspects")
  prospectActivities ProspectActivity[]  @relation("ProspectActivities")
  convertedProspects Prospect[]          @relation("ConvertedProspect")
```

- [ ] **Step 3: Generate and apply migration**

Run:
```bash
npx prisma migrate dev --name admin_portal
```
Expected: Migration created and applied successfully.

- [ ] **Step 4: Verify Prisma client**

Run:
```bash
npx prisma generate
npx tsc --noEmit 2>&1 | head -5
```
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/
git commit -m "feat: add AdminClient, Prospect, ProspectActivity Prisma models"
```

---

### Task 2: Admin access utility

**Files:**
- Create: `src/lib/admin-access.ts`

- [ ] **Step 1: Create canAccessClient and helpers**

```typescript
// src/lib/admin-access.ts
import { prisma } from "./prisma";
import { getOrgContext } from "./auth";

export type AdminPermission = "owner" | "manage" | "read" | null;

export interface AdminAccessResult {
  access: boolean;
  permission: AdminPermission;
}

/**
 * Check if an admin can access a specific client.
 * Super admins always have owner-level access.
 */
export async function canAccessClient(
  adminId: string,
  clientId: string,
  isSuperAdmin = false
): Promise<AdminAccessResult> {
  if (isSuperAdmin) {
    return { access: true, permission: "owner" };
  }

  // Check ownership
  const adminClient = await prisma.adminClient.findUnique({
    where: { adminId_clientId: { adminId, clientId } },
    include: { shares: { where: { sharedWithId: adminId } } },
  });

  if (adminClient) {
    return { access: true, permission: "owner" };
  }

  // Check shared access
  const shared = await prisma.adminClientShare.findFirst({
    where: {
      sharedWithId: adminId,
      adminClient: { clientId },
    },
  });

  if (shared) {
    return {
      access: true,
      permission: shared.permission as "read" | "manage",
    };
  }

  return { access: false, permission: null };
}

/**
 * Get the OrgContext and verify the user is an admin.
 * Returns the context or throws.
 */
export async function requireAdminPortal() {
  const ctx = await getOrgContext();
  if (ctx.userRole !== "admin" && ctx.userRole !== "super_admin") {
    throw new Error("Accès réservé aux administrateurs");
  }
  return ctx;
}

/**
 * Verify admin has at least the required permission level on a client.
 * Permission hierarchy: owner > manage > read
 */
export function hasMinPermission(
  current: AdminPermission,
  required: "owner" | "manage" | "read"
): boolean {
  if (!current) return false;
  const levels: Record<string, number> = { read: 1, manage: 2, owner: 3 };
  return (levels[current] ?? 0) >= (levels[required] ?? 0);
}

/**
 * Get all client IDs accessible to an admin.
 * Used for listing and dashboard queries.
 */
export async function getAccessibleClientIds(
  adminId: string,
  isSuperAdmin = false
): Promise<string[]> {
  if (isSuperAdmin) {
    const all = await prisma.adminClient.findMany({
      select: { clientId: true },
    });
    return all.map((a) => a.clientId);
  }

  const [owned, shared] = await Promise.all([
    prisma.adminClient.findMany({
      where: { adminId },
      select: { clientId: true },
    }),
    prisma.adminClientShare.findMany({
      where: { sharedWithId: adminId },
      select: { adminClient: { select: { clientId: true } } },
    }),
  ]);

  const ids = new Set<string>();
  for (const o of owned) ids.add(o.clientId);
  for (const s of shared) ids.add(s.adminClient.clientId);
  return Array.from(ids);
}

/**
 * Get all clientOrgIds accessible to an admin.
 * Used for billing queries (Subscription/Invoice use orgId).
 */
export async function getAccessibleClientOrgIds(
  adminId: string,
  isSuperAdmin = false
): Promise<string[]> {
  if (isSuperAdmin) {
    const all = await prisma.adminClient.findMany({
      select: { clientOrgId: true },
    });
    return all.map((a) => a.clientOrgId);
  }

  const [owned, shared] = await Promise.all([
    prisma.adminClient.findMany({
      where: { adminId },
      select: { clientOrgId: true },
    }),
    prisma.adminClientShare.findMany({
      where: { sharedWithId: adminId },
      select: { adminClient: { select: { clientOrgId: true } } },
    }),
  ]);

  const ids = new Set<string>();
  for (const o of owned) ids.add(o.clientOrgId);
  for (const s of shared) ids.add(s.adminClient.clientOrgId);
  return Array.from(ids);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/admin-access.ts
git commit -m "feat: add admin access control utility (canAccessClient)"
```

---

### Task 3: Admin impersonation actions

**Files:**
- Create: `src/app/(dashboard)/admin-portal/impersonation-actions.ts`

- [ ] **Step 1: Create admin impersonation actions**

```typescript
// src/app/(dashboard)/admin-portal/impersonation-actions.ts
"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPortal, canAccessClient } from "@/lib/admin-access";

export async function startAdminImpersonation(clientId: string) {
  const ctx = await requireAdminPortal();
  const access = await canAccessClient(
    ctx.userId,
    clientId,
    ctx.userRole === "super_admin"
  );
  if (!access.access) {
    throw new Error("Accès refusé à ce client");
  }

  const cookieStore = await cookies();
  cookieStore.set("impersonate_org", clientId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4,
  });
  revalidatePath("/");
  redirect("/dashboard");
}

export async function stopAdminImpersonation() {
  await requireAdminPortal();
  const cookieStore = await cookies();
  cookieStore.delete("impersonate_org");
  revalidatePath("/");
  redirect("/admin-portal/clients");
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/admin-portal/impersonation-actions.ts
git commit -m "feat: add admin-scoped impersonation actions"
```

---

## Chunk 2: Layout, Sidebar & Navigation

### Task 4: Admin-portal sidebar component

**Files:**
- Create: `src/components/admin-portal/admin-portal-sidebar.tsx`

- [ ] **Step 1: Create sidebar component**

Follow the pattern from `src/components/layout/app-sidebar.tsx`. The admin-portal sidebar has 5 links: Dashboard, Mes Clients, Prospects, Facturation, Paramètres.

```typescript
// src/components/admin-portal/admin-portal-sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Target,
  Receipt,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin-portal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin-portal/clients", label: "Mes Clients", icon: Users },
  { href: "/admin-portal/prospects", label: "Prospects", icon: Target },
  { href: "/admin-portal/billing", label: "Facturation", icon: Receipt },
  { href: "/admin-portal/settings", label: "Paramètres", icon: Settings },
];

export function AdminPortalSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[260px] shrink-0 flex-col border-r border-slate-200 bg-white">
      {/* Header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow-lg shadow-indigo-500/25">
          W
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Wevlap</p>
          <p className="text-[11px] text-slate-400">Portail Admin</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive =
            link.href === "/admin-portal"
              ? pathname === "/admin-portal"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all",
                isActive
                  ? "bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  isActive ? "text-indigo-500" : "text-slate-400"
                )}
              />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-100 px-5 py-4">
        <p className="truncate text-xs text-slate-500">{userName}</p>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin-portal/admin-portal-sidebar.tsx
git commit -m "feat: add admin-portal sidebar component"
```

---

### Task 5: Admin-portal layout

**Files:**
- Create: `src/app/(dashboard)/admin-portal/layout.tsx`

- [ ] **Step 1: Create layout with auth guard and sidebar**

```typescript
// src/app/(dashboard)/admin-portal/layout.tsx
import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/auth";
import { AdminPortalSidebar } from "@/components/admin-portal/admin-portal-sidebar";

export default async function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let ctx;
  try {
    ctx = await getOrgContext();
  } catch {
    redirect("/pending");
  }

  if (ctx.userRole !== "admin" && ctx.userRole !== "super_admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminPortalSidebar userName={ctx.userName} />
      <div className="flex flex-1 flex-col overflow-auto">
        <main className="min-h-screen bg-slate-50/50">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/admin-portal/layout.tsx
git commit -m "feat: add admin-portal layout with auth guard"
```

---

### Task 6: Update main dashboard layout for admin routing

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Read the current layout**

Read `src/app/(dashboard)/layout.tsx` to understand the exact current code.

- [ ] **Step 2: Add admin redirect logic**

In the dashboard layout, after the `approved` check, add a check: if the user is an `admin` and the current path is `/dashboard`, they should see the regular dashboard. But we also need to ensure the admin-portal layout takes over for `/admin-portal/**` routes. Since Next.js nested layouts handle this automatically, the main change is:

Update the sidebar role mapping to include an "admin-portal" option. In the part where `sidebarRole` is determined:

```typescript
// Before:
const sidebarRole = role === "super_admin" ? "admin" : "client";

// After: admin-portal has its own layout, so admins using /dashboard see client sidebar
// No change needed — admin-portal/layout.tsx overrides the sidebar for /admin-portal/** routes
```

Actually, the admin-portal layout already provides its own sidebar. The main layout's sidebar will only show for non-admin-portal routes. **No modification needed** if the admin-portal layout wraps its own sidebar.

However, we should add a link to the admin portal in the main sidebar for admin users. Read and modify `src/components/layout/app-sidebar.tsx`.

- [ ] **Step 3: Add admin-portal link to sidebar**

In `src/components/layout/app-sidebar.tsx`, modify the `AppSidebarProps` interface and add a link for admin users:

Add a new prop `isAdmin` and show a "Portail Admin" link at the top of client links when the user has role `admin`:

```typescript
// In AppSidebarProps, add:
isAdmin?: boolean;

// After the links array rendering, add before the nav section:
{isAdmin && (
  <Link
    href="/admin-portal"
    className="mx-3 mb-3 flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-50 to-violet-50 px-3 py-2.5 text-[13px] font-medium text-indigo-700 transition-all hover:from-indigo-100 hover:to-violet-100"
  >
    <Briefcase className="h-4 w-4 text-indigo-500" />
    Portail Admin
  </Link>
)}
```

Import `Briefcase` from lucide-react.

- [ ] **Step 4: Pass isAdmin prop from layout**

In `src/app/(dashboard)/layout.tsx`, pass the prop:

```typescript
<AppSidebar
  role={sidebarRole}
  showOrgSwitcher={role === "super_admin"}
  isAdmin={role === "admin" || role === "super_admin"}
/>
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/layout.tsx src/components/layout/app-sidebar.tsx
git commit -m "feat: add Portail Admin link in sidebar for admin users"
```

---

## Chunk 3: Client Management

### Task 7: Client server actions

**Files:**
- Create: `src/app/(dashboard)/admin-portal/clients/actions.ts`

- [ ] **Step 1: Create client CRUD actions**

```typescript
// src/app/(dashboard)/admin-portal/clients/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  requireAdminPortal,
  canAccessClient,
  hasMinPermission,
  getAccessibleClientIds,
} from "@/lib/admin-access";

// ---------- List ----------
export async function fetchAdminClients(search?: string, status?: string) {
  const ctx = await requireAdminPortal();
  const isSuperAdmin = ctx.userRole === "super_admin";

  const clientIds = await getAccessibleClientIds(ctx.userId, isSuperAdmin);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { clientId: { in: clientIds } };
  if (status && status !== "all") {
    where.status = status;
  }

  const adminClients = await prisma.adminClient.findMany({
    where,
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          phone: true,
          createdAt: true,
        },
      },
      admin: { select: { id: true, name: true } },
      _count: { select: { shares: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (search) {
    const s = search.toLowerCase();
    return adminClients.filter(
      (ac) =>
        ac.client.name.toLowerCase().includes(s) ||
        ac.client.email.toLowerCase().includes(s) ||
        ac.client.company?.toLowerCase().includes(s) ||
        ac.client.phone?.includes(s)
    );
  }

  return adminClients;
}

// ---------- Get single ----------
export async function getAdminClient(clientId: string) {
  const ctx = await requireAdminPortal();
  const access = await canAccessClient(
    ctx.userId,
    clientId,
    ctx.userRole === "super_admin"
  );
  if (!access.access) throw new Error("Accès refusé");

  const adminClient = await prisma.adminClient.findFirst({
    where: { clientId },
    include: {
      client: true,
      admin: { select: { id: true, name: true, email: true } },
      shares: {
        include: {
          sharedWith: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!adminClient) throw new Error("Client non trouvé");

  return { ...adminClient, currentPermission: access.permission };
}

// ---------- Create ----------
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
    // Create new user
    clientUser = await prisma.user.create({
      data: {
        clerkId: `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        email: data.email,
        name: data.name,
        role: "client",
        approved: true,
        company: data.company || null,
        phone: data.phone || null,
      },
    });
  }

  // Create AdminClient relation
  const adminClient = await prisma.adminClient.create({
    data: {
      adminId: ctx.userId,
      clientId: clientUser.id,
      clientOrgId: clientUser.id, // user.id as orgId fallback
      status: "onboarding",
      contractStatus: "draft",
      paymentStatus: "pending",
      notes: data.notes || null,
    },
  });

  revalidatePath("/admin-portal/clients");
  return adminClient;
}

// ---------- Update ----------
export async function updateAdminClient(
  clientId: string,
  data: {
    status?: string;
    contractStatus?: string;
    contractUrl?: string;
    paymentStatus?: string;
    paymentMethod?: string;
    notes?: string;
  }
) {
  const ctx = await requireAdminPortal();
  const access = await canAccessClient(
    ctx.userId,
    clientId,
    ctx.userRole === "super_admin"
  );
  if (!access.access || !hasMinPermission(access.permission, "manage")) {
    throw new Error("Permission insuffisante");
  }

  const adminClient = await prisma.adminClient.findFirst({
    where: { clientId },
  });
  if (!adminClient) throw new Error("Client non trouvé");

  const updated = await prisma.adminClient.update({
    where: { id: adminClient.id },
    data: {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.contractStatus !== undefined && {
        contractStatus: data.contractStatus,
      }),
      ...(data.contractUrl !== undefined && {
        contractUrl: data.contractUrl || null,
      }),
      ...(data.paymentStatus !== undefined && {
        paymentStatus: data.paymentStatus,
      }),
      ...(data.paymentMethod !== undefined && {
        paymentMethod: data.paymentMethod || null,
      }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
    },
  });

  revalidatePath("/admin-portal/clients");
  revalidatePath(`/admin-portal/clients/${clientId}`);
  return updated;
}

// ---------- Update client info ----------
export async function updateClientInfo(
  clientId: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
  }
) {
  const ctx = await requireAdminPortal();
  const access = await canAccessClient(
    ctx.userId,
    clientId,
    ctx.userRole === "super_admin"
  );
  if (!access.access || !hasMinPermission(access.permission, "manage")) {
    throw new Error("Permission insuffisante");
  }

  await prisma.user.update({
    where: { id: clientId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.company !== undefined && { company: data.company || null }),
    },
  });

  revalidatePath("/admin-portal/clients");
  revalidatePath(`/admin-portal/clients/${clientId}`);
}

// ---------- Delete ----------
export async function deleteAdminClient(clientId: string) {
  const ctx = await requireAdminPortal();
  const access = await canAccessClient(
    ctx.userId,
    clientId,
    ctx.userRole === "super_admin"
  );
  if (!access.access || !hasMinPermission(access.permission, "owner")) {
    throw new Error("Seul le propriétaire peut supprimer un client");
  }

  // Delete AdminClient (cascades to shares)
  await prisma.adminClient.deleteMany({
    where: { clientId },
  });

  revalidatePath("/admin-portal/clients");
}

// ---------- Share ----------
export async function shareClientAccess(
  clientId: string,
  adminEmail: string,
  permission: "read" | "manage"
) {
  const ctx = await requireAdminPortal();
  const access = await canAccessClient(
    ctx.userId,
    clientId,
    ctx.userRole === "super_admin"
  );
  if (!access.access || !hasMinPermission(access.permission, "owner")) {
    throw new Error("Seul le propriétaire peut partager l'accès");
  }

  const targetAdmin = await prisma.user.findFirst({
    where: { email: adminEmail, role: "admin" },
  });
  if (!targetAdmin) {
    throw new Error("Administrateur non trouvé avec cet email");
  }

  const adminClient = await prisma.adminClient.findFirst({
    where: { clientId, adminId: ctx.userId },
  });
  if (!adminClient) throw new Error("Client non trouvé");

  await prisma.adminClientShare.upsert({
    where: {
      adminClientId_sharedWithId: {
        adminClientId: adminClient.id,
        sharedWithId: targetAdmin.id,
      },
    },
    update: { permission },
    create: {
      adminClientId: adminClient.id,
      sharedWithId: targetAdmin.id,
      permission,
    },
  });

  revalidatePath(`/admin-portal/clients/${clientId}`);
}

// ---------- Remove share ----------
export async function removeClientShare(shareId: string) {
  const ctx = await requireAdminPortal();

  const share = await prisma.adminClientShare.findUnique({
    where: { id: shareId },
    include: { adminClient: true },
  });
  if (!share) throw new Error("Partage non trouvé");

  const access = await canAccessClient(
    ctx.userId,
    share.adminClient.clientId,
    ctx.userRole === "super_admin"
  );
  if (!access.access || !hasMinPermission(access.permission, "owner")) {
    throw new Error("Permission insuffisante");
  }

  await prisma.adminClientShare.delete({ where: { id: shareId } });
  revalidatePath(`/admin-portal/clients/${share.adminClient.clientId}`);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/admin-portal/clients/actions.ts
git commit -m "feat: add client CRUD server actions for admin-portal"
```

---

### Task 8: Client list page and component

**Files:**
- Create: `src/app/(dashboard)/admin-portal/clients/page.tsx`
- Create: `src/components/admin-portal/client-list.tsx`

- [ ] **Step 1: Create client list client component**

Create `src/components/admin-portal/client-list.tsx` — a "use client" component receiving initial data. Features:
- Search bar
- Status filter (all / onboarding / active / suspended / churned)
- Card grid showing each client with: name, company, email, status badge, contract badge, payment badge, last updated
- Click navigates to `/admin-portal/clients/[id]`
- "Nouveau client" button linking to `/admin-portal/clients/new`
- Empty state when no clients

Follow the pattern established in `src/components/contacts/contacts-client.tsx`:
- `useState(initialData)` with `useEffect` sync
- `useRouter()` for navigation
- Badge colors per status
- Toast for success/error messages

The component should be ~200 lines. Include status color maps:

```typescript
const statusConfig: Record<string, { label: string; className: string }> = {
  onboarding: { label: "Onboarding", className: "bg-blue-50 text-blue-700" },
  active: { label: "Actif", className: "bg-emerald-50 text-emerald-700" },
  suspended: { label: "Suspendu", className: "bg-amber-50 text-amber-700" },
  churned: { label: "Perdu", className: "bg-red-50 text-red-700" },
};

const contractConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-slate-50 text-slate-600" },
  sent: { label: "Envoyé", className: "bg-blue-50 text-blue-700" },
  signed: { label: "Signé", className: "bg-emerald-50 text-emerald-700" },
  expired: { label: "Expiré", className: "bg-red-50 text-red-700" },
};

const paymentConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-slate-50 text-slate-600" },
  authorized: { label: "Autorisé", className: "bg-blue-50 text-blue-700" },
  active: { label: "Actif", className: "bg-emerald-50 text-emerald-700" },
  failed: { label: "Échec", className: "bg-red-50 text-red-700" },
};
```

- [ ] **Step 2: Create client list server page**

```typescript
// src/app/(dashboard)/admin-portal/clients/page.tsx
import { Header } from "@/components/layout/header";
import { ClientList } from "@/components/admin-portal/client-list";
import { fetchAdminClients } from "./actions";

export default async function AdminPortalClientsPage() {
  const clients = await fetchAdminClients();
  return (
    <>
      <Header
        title="Mes Clients"
        description="Gérez votre portefeuille clients"
      />
      <ClientList initialClients={clients} />
    </>
  );
}
```

- [ ] **Step 3: Type-check and verify**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/admin-portal/clients/page.tsx src/components/admin-portal/client-list.tsx
git commit -m "feat: add client list page for admin-portal"
```

---

### Task 9: Create client page and form

**Files:**
- Create: `src/app/(dashboard)/admin-portal/clients/new/page.tsx`
- Create: `src/components/admin-portal/client-form.tsx`

- [ ] **Step 1: Create client form component**

Create `src/components/admin-portal/client-form.tsx` — "use client" form with sections:
1. Informations (name*, email*, phone, company)
2. Notes (optional textarea)

Uses `useTransition()` for submit, calls `createAdminClient()`, shows toast, redirects to client list on success.

Follow patterns from existing forms in the codebase (Input, Label, Button from shadcn/ui).

- [ ] **Step 2: Create the server page**

```typescript
// src/app/(dashboard)/admin-portal/clients/new/page.tsx
import { Header } from "@/components/layout/header";
import { ClientForm } from "@/components/admin-portal/client-form";

export default function NewClientPage() {
  return (
    <>
      <Header
        title="Nouveau Client"
        description="Créez un compte client"
      />
      <ClientForm />
    </>
  );
}
```

- [ ] **Step 3: Type-check and commit**

```bash
npx tsc --noEmit
git add src/app/\(dashboard\)/admin-portal/clients/new/ src/components/admin-portal/client-form.tsx
git commit -m "feat: add create client page for admin-portal"
```

---

### Task 10: Client detail page and component

**Files:**
- Create: `src/app/(dashboard)/admin-portal/clients/[id]/page.tsx`
- Create: `src/components/admin-portal/client-detail.tsx`

- [ ] **Step 1: Create client detail component**

Create `src/components/admin-portal/client-detail.tsx` — "use client" component showing:
- **Header**: Name, company, email, phone, status badge, "Accéder à l'espace" button
- **Section 1 - Infos**: Editable fields (name, email, phone, company), admin owner, shared admins list, share button
- **Section 2 - Contrat & Paiement**: Status dropdowns for contract/payment, contract URL field, payment method
- **Section 3 - Abonnement**: Display subscription info if exists, link to billing
- **Section 4 - Notes**: Editable textarea

Actions: Edit info, change statuses (via dropdown selects calling `updateAdminClient`), share access dialog, delete with confirmation.

Uses `useTransition()`, `useState` for edit modes, `useRouter()` for refresh.

The component needs these props:
```typescript
interface ClientDetailProps {
  adminClient: Awaited<ReturnType<typeof getAdminClient>>;
  subscription: { monthlyPrice: number; status: string; pricePerMinute: number } | null;
  invoicesSummary: { total: number; paid: number; overdue: number; totalAmount: number };
  clientStats: { agents: number; campaigns: number; calls: number };
}
```

- [ ] **Step 2: Create server page**

The server page calls `getAdminClient(id)`, fetches subscription and invoice data, and passes to the component.

```typescript
// src/app/(dashboard)/admin-portal/clients/[id]/page.tsx
import { Header } from "@/components/layout/header";
import { ClientDetail } from "@/components/admin-portal/client-detail";
import { getAdminClient } from "../actions";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let adminClient;
  try {
    adminClient = await getAdminClient(id);
  } catch {
    notFound();
  }

  const orgId = adminClient.clientOrgId;

  const [subscription, invoices, agentCount, campaignCount, callCount] =
    await Promise.all([
      prisma.subscription.findUnique({ where: { orgId } }),
      prisma.invoice.findMany({
        where: { orgId },
        select: { status: true, totalTTC: true },
      }),
      prisma.agent.count({ where: { userId: id } }),
      prisma.campaign.count({ where: { userId: id } }),
      prisma.call.count({ where: { orgId } }),
    ]);

  const invoicesSummary = {
    total: invoices.length,
    paid: invoices.filter((i) => i.status === "paid").length,
    overdue: invoices.filter((i) => i.status === "overdue").length,
    totalAmount: invoices.reduce((sum, i) => sum + i.totalTTC, 0),
  };

  const clientStats = {
    agents: agentCount,
    campaigns: campaignCount,
    calls: callCount,
  };

  return (
    <>
      <Header
        title={adminClient.client.name}
        description={adminClient.client.company || adminClient.client.email}
      />
      <ClientDetail
        adminClient={adminClient}
        subscription={
          subscription
            ? {
                monthlyPrice: subscription.monthlyPrice,
                status: subscription.status,
                pricePerMinute: subscription.pricePerMinute,
              }
            : null
        }
        invoicesSummary={invoicesSummary}
        clientStats={clientStats}
      />
    </>
  );
}
```

- [ ] **Step 3: Type-check and commit**

```bash
npx tsc --noEmit
git add src/app/\(dashboard\)/admin-portal/clients/\[id\]/ src/components/admin-portal/client-detail.tsx
git commit -m "feat: add client detail page for admin-portal"
```

---

## Chunk 4: Prospects Pipeline

### Task 11: Prospect server actions

**Files:**
- Create: `src/app/(dashboard)/admin-portal/prospects/actions.ts`

- [ ] **Step 1: Create prospect CRUD actions**

Server actions for:
- `fetchProspects(search?, stage?, source?)` — list all prospects for the admin
- `getProspect(id)` — single prospect with activities
- `createProspect(data)` — create new prospect
- `updateProspect(id, data)` — update prospect fields
- `advanceProspectStage(id)` — move to next stage
- `markProspectLost(id, reason)` — mark as lost
- `addProspectActivity(prospectId, type, description)` — add interaction
- `convertProspectToClient(prospectId)` — convert to client (creates User + AdminClient)
- `deleteProspect(id)` — delete prospect

Each action starts with `requireAdminPortal()` and verifies the prospect belongs to the admin (`prospect.adminId === ctx.userId` or `isSuperAdmin`).

Stage order constant:
```typescript
const STAGES = [
  "prospect",
  "contacted",
  "demo_scheduled",
  "demo_done",
  "proposal_sent",
  "negotiation",
  "converted",
  "lost",
] as const;
```

`advanceProspectStage` finds current index and moves to `index + 1`. Cannot advance past "negotiation" (conversion is separate). Auto-creates a `ProspectActivity` with `type: "stage_change"`.

`convertProspectToClient` creates the User (or links existing), creates AdminClient, updates `prospect.convertedToId` and `prospect.stage = "converted"`, adds activity.

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add src/app/\(dashboard\)/admin-portal/prospects/actions.ts
git commit -m "feat: add prospect CRUD server actions for admin-portal"
```

---

### Task 12: Prospect stage bar component

**Files:**
- Create: `src/components/admin-portal/prospect-stage-bar.tsx`

- [ ] **Step 1: Create stage progression bar**

A "use client" component showing 8 stages horizontally. Current stage is highlighted, completed stages are filled, future stages are grayed out. Two action buttons: "Avancer" and "Marquer perdu".

```typescript
interface ProspectStageBarProps {
  currentStage: string;
  onAdvance: () => void;
  onMarkLost: () => void;
  disabled?: boolean;
}
```

Uses the same color scheme from the spec:
```typescript
const STAGE_CONFIG = [
  { slug: "prospect", label: "Prospect", color: "slate" },
  { slug: "contacted", label: "Contacté", color: "blue" },
  { slug: "demo_scheduled", label: "Démo planifiée", color: "indigo" },
  { slug: "demo_done", label: "Démo faite", color: "violet" },
  { slug: "proposal_sent", label: "Proposition envoyée", color: "amber" },
  { slug: "negotiation", label: "Négociation", color: "orange" },
  { slug: "converted", label: "Converti", color: "emerald" },
  { slug: "lost", label: "Perdu", color: "red" },
];
```

Renders as a horizontal bar with circles/steps connected by lines. Active step is larger with a ring effect.

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add src/components/admin-portal/prospect-stage-bar.tsx
git commit -m "feat: add prospect stage progression bar component"
```

---

### Task 13: Prospect list page and component

**Files:**
- Create: `src/app/(dashboard)/admin-portal/prospects/page.tsx`
- Create: `src/components/admin-portal/prospect-list.tsx`

- [ ] **Step 1: Create prospect list component**

"use client" component with:
- Filters: stage multi-select, source filter, overdue toggle, search
- Card grid showing each prospect: name, company, stage badge, source badge, estimated value, next action (red if overdue), activity count
- Click navigates to detail
- "Nouveau prospect" button

Stage badge colors follow the spec. Source badges are neutral.

- [ ] **Step 2: Create server page**

```typescript
// src/app/(dashboard)/admin-portal/prospects/page.tsx
import { Header } from "@/components/layout/header";
import { ProspectList } from "@/components/admin-portal/prospect-list";
import { fetchProspects } from "./actions";

export default async function AdminPortalProspectsPage() {
  const prospects = await fetchProspects();
  return (
    <>
      <Header
        title="Prospects"
        description="Pipeline de conversion"
      />
      <ProspectList initialProspects={prospects} />
    </>
  );
}
```

- [ ] **Step 3: Type-check and commit**

```bash
npx tsc --noEmit
git add src/app/\(dashboard\)/admin-portal/prospects/page.tsx src/components/admin-portal/prospect-list.tsx
git commit -m "feat: add prospect list page for admin-portal"
```

---

### Task 14: Create prospect page and form

**Files:**
- Create: `src/app/(dashboard)/admin-portal/prospects/new/page.tsx`
- Create: `src/components/admin-portal/prospect-form.tsx`

- [ ] **Step 1: Create prospect form**

"use client" form with fields: name*, phone, email, company, source (select), estimated value, next action, next action date, notes.

Calls `createProspect()` on submit, redirects to prospect list.

- [ ] **Step 2: Create server page**

- [ ] **Step 3: Type-check and commit**

```bash
npx tsc --noEmit
git add src/app/\(dashboard\)/admin-portal/prospects/new/ src/components/admin-portal/prospect-form.tsx
git commit -m "feat: add create prospect page for admin-portal"
```

---

### Task 15: Prospect detail page and component

**Files:**
- Create: `src/app/(dashboard)/admin-portal/prospects/[id]/page.tsx`
- Create: `src/components/admin-portal/prospect-detail.tsx`

- [ ] **Step 1: Create prospect detail component**

"use client" component showing:
- **Header**: Name, company, stage badge, source badge, estimated value
- **Stage bar** (ProspectStageBar component): with Advance/Lost buttons
- **Section: Prochaine action**: editable text + date
- **Section: Informations**: editable contact info
- **Section: Raison de perte**: only visible if stage === "lost"
- **Section: Historique**: timeline of ProspectActivity entries, newest first
- **Add interaction form**: type select (call/email/meeting/note) + description textarea + submit button
- **Convert button**: shown when stage === "negotiation", opens confirmation dialog that creates the client

- [ ] **Step 2: Create server page**

```typescript
// src/app/(dashboard)/admin-portal/prospects/[id]/page.tsx
import { Header } from "@/components/layout/header";
import { ProspectDetail } from "@/components/admin-portal/prospect-detail";
import { getProspect } from "../actions";
import { notFound } from "next/navigation";

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let prospect;
  try {
    prospect = await getProspect(id);
  } catch {
    notFound();
  }

  return (
    <>
      <Header
        title={prospect.name}
        description={prospect.company || prospect.email || "Prospect"}
      />
      <ProspectDetail prospect={prospect} />
    </>
  );
}
```

- [ ] **Step 3: Type-check and commit**

```bash
npx tsc --noEmit
git add src/app/\(dashboard\)/admin-portal/prospects/\[id\]/ src/components/admin-portal/prospect-detail.tsx
git commit -m "feat: add prospect detail page for admin-portal"
```

---

## Chunk 5: Billing & Dashboard

### Task 16: Admin billing actions

**Files:**
- Create: `src/app/(dashboard)/admin-portal/billing/actions.ts`

- [ ] **Step 1: Create billing actions**

Server actions wrapping `/src/lib/billing.ts` functions, scoped to the admin's clients:

```typescript
// src/app/(dashboard)/admin-portal/billing/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  requireAdminPortal,
  canAccessClient,
  hasMinPermission,
  getAccessibleClientOrgIds,
} from "@/lib/admin-access";
import { generateInvoice, formatCentimes } from "@/lib/billing";

export async function fetchBillingOverview() {
  const ctx = await requireAdminPortal();
  const orgIds = await getAccessibleClientOrgIds(
    ctx.userId,
    ctx.userRole === "super_admin"
  );

  const [subscriptions, invoices, adminClients] = await Promise.all([
    prisma.subscription.findMany({
      where: { orgId: { in: orgIds } },
    }),
    prisma.invoice.findMany({
      where: { orgId: { in: orgIds } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.adminClient.findMany({
      where: { clientOrgId: { in: orgIds } },
      include: {
        client: {
          select: { id: true, name: true, company: true },
        },
      },
    }),
  ]);

  // Build a map orgId -> client info
  const clientMap = new Map(
    adminClients.map((ac) => [
      ac.clientOrgId,
      { name: ac.client.name, company: ac.client.company, clientId: ac.clientId },
    ])
  );

  // KPIs
  const activeSubscriptions = subscriptions.filter(
    (s) => s.status === "active"
  );
  const mrr = activeSubscriptions.reduce(
    (sum, s) => sum + s.monthlyPrice,
    0
  );
  const unpaidInvoices = invoices.filter(
    (i) => i.status === "overdue" || i.status === "sent"
  );
  const unpaidAmount = unpaidInvoices.reduce(
    (sum, i) => sum + i.totalTTC,
    0
  );

  return {
    kpis: {
      mrr,
      mrrFormatted: formatCentimes(mrr),
      unpaidCount: unpaidInvoices.length,
      unpaidAmount: formatCentimes(unpaidAmount),
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
    },
    subscriptions: subscriptions.map((s) => ({
      ...s,
      client: clientMap.get(s.orgId) || null,
    })),
    recentInvoices: invoices.map((i) => ({
      ...i,
      client: clientMap.get(i.orgId) || null,
    })),
  };
}

export async function adminGenerateInvoice(
  clientId: string,
  month: number,
  year: number
) {
  const ctx = await requireAdminPortal();
  const access = await canAccessClient(
    ctx.userId,
    clientId,
    ctx.userRole === "super_admin"
  );
  if (!access.access || !hasMinPermission(access.permission, "manage")) {
    throw new Error("Permission insuffisante");
  }

  const adminClient = await prisma.adminClient.findFirst({
    where: { clientId },
  });
  if (!adminClient) throw new Error("Client non trouvé");

  const result = await generateInvoice(adminClient.clientOrgId, month, year);
  revalidatePath("/admin-portal/billing");
  return result;
}

export async function adminUpdateInvoiceStatus(
  invoiceId: string,
  status: "sent" | "paid" | "overdue"
) {
  const ctx = await requireAdminPortal();

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });
  if (!invoice) throw new Error("Facture non trouvée");

  // Verify admin has access to this org
  const adminClient = await prisma.adminClient.findFirst({
    where: { clientOrgId: invoice.orgId },
  });
  if (!adminClient) throw new Error("Accès refusé");

  const access = await canAccessClient(
    ctx.userId,
    adminClient.clientId,
    ctx.userRole === "super_admin"
  );
  if (!access.access || !hasMinPermission(access.permission, "manage")) {
    throw new Error("Permission insuffisante");
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status,
      ...(status === "paid" ? { paidAt: new Date() } : {}),
    },
  });

  revalidatePath("/admin-portal/billing");
}

export async function adminUpsertSubscription(
  clientId: string,
  data: {
    monthlyPrice: number;
    pricePerMinute: number;
    companyName?: string;
    freeTrialType?: string;
    freeTrialMonths?: number;
  }
) {
  const ctx = await requireAdminPortal();
  const access = await canAccessClient(
    ctx.userId,
    clientId,
    ctx.userRole === "super_admin"
  );
  if (!access.access || !hasMinPermission(access.permission, "manage")) {
    throw new Error("Permission insuffisante");
  }

  const adminClient = await prisma.adminClient.findFirst({
    where: { clientId },
  });
  if (!adminClient) throw new Error("Client non trouvé");

  const orgId = adminClient.clientOrgId;

  await prisma.subscription.upsert({
    where: { orgId },
    update: {
      monthlyPrice: data.monthlyPrice,
      pricePerMinute: data.pricePerMinute,
      companyName: data.companyName || null,
      freeTrialType: data.freeTrialType || "none",
      freeTrialMonths: data.freeTrialMonths || 0,
    },
    create: {
      orgId,
      monthlyPrice: data.monthlyPrice,
      pricePerMinute: data.pricePerMinute,
      companyName: data.companyName || null,
      status: "active",
      startDate: new Date(),
      freeTrialType: data.freeTrialType || "none",
      freeTrialMonths: data.freeTrialMonths || 0,
    },
  });

  revalidatePath("/admin-portal/billing");
  revalidatePath(`/admin-portal/clients/${clientId}`);
}
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add src/app/\(dashboard\)/admin-portal/billing/actions.ts
git commit -m "feat: add admin billing actions for admin-portal"
```

---

### Task 17: Billing overview page

**Files:**
- Create: `src/app/(dashboard)/admin-portal/billing/page.tsx`
- Create: `src/components/admin-portal/billing-overview.tsx`

- [ ] **Step 1: Create billing overview component**

"use client" component showing:
- **4 KPI cards**: MRR, factures impayées, montant impayé, abonnements actifs
- **Client list with billing summary**: table/cards showing each client's subscription status, latest invoice, alert badges
- Actions per client: generate invoice, mark invoice paid/sent, manage subscription

- [ ] **Step 2: Create server page**

```typescript
// src/app/(dashboard)/admin-portal/billing/page.tsx
import { Header } from "@/components/layout/header";
import { BillingOverview } from "@/components/admin-portal/billing-overview";
import { fetchBillingOverview } from "./actions";

export default async function AdminPortalBillingPage() {
  const data = await fetchBillingOverview();
  return (
    <>
      <Header
        title="Facturation"
        description="Abonnements et factures de vos clients"
      />
      <BillingOverview data={data} />
    </>
  );
}
```

- [ ] **Step 3: Type-check and commit**

```bash
npx tsc --noEmit
git add src/app/\(dashboard\)/admin-portal/billing/ src/components/admin-portal/billing-overview.tsx
git commit -m "feat: add billing overview page for admin-portal"
```

---

### Task 18: Dashboard KPIs and actions

**Files:**
- Create: `src/app/(dashboard)/admin-portal/actions.ts`

- [ ] **Step 1: Create dashboard actions**

```typescript
// src/app/(dashboard)/admin-portal/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import {
  requireAdminPortal,
  getAccessibleClientIds,
  getAccessibleClientOrgIds,
} from "@/lib/admin-access";
import { formatCentimes } from "@/lib/billing";

export async function getDashboardStats() {
  const ctx = await requireAdminPortal();
  const isSuperAdmin = ctx.userRole === "super_admin";
  const clientIds = await getAccessibleClientIds(ctx.userId, isSuperAdmin);
  const orgIds = await getAccessibleClientOrgIds(ctx.userId, isSuperAdmin);

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    activeClients,
    totalClients,
    subscriptions,
    activeProspects,
    convertedProspects,
    totalProspects,
    contractsPending,
    paymentAlerts,
    overdueInvoices,
    nextActions,
    recentClients,
  ] = await Promise.all([
    prisma.adminClient.count({
      where: { clientId: { in: clientIds }, status: "active" },
    }),
    prisma.adminClient.count({
      where: { clientId: { in: clientIds } },
    }),
    prisma.subscription.findMany({
      where: { orgId: { in: orgIds }, status: "active" },
      select: { monthlyPrice: true },
    }),
    prisma.prospect.count({
      where: {
        adminId: ctx.userId,
        stage: { notIn: ["converted", "lost"] },
      },
    }),
    prisma.prospect.count({
      where: {
        adminId: ctx.userId,
        stage: "converted",
        updatedAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.prospect.count({
      where: {
        adminId: ctx.userId,
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.adminClient.count({
      where: { clientId: { in: clientIds }, contractStatus: "sent" },
    }),
    prisma.adminClient.count({
      where: { clientId: { in: clientIds }, paymentStatus: "failed" },
    }),
    prisma.invoice.count({
      where: { orgId: { in: orgIds }, status: "overdue" },
    }),
    prisma.prospect.findMany({
      where: {
        adminId: ctx.userId,
        nextActionDate: { not: null },
        stage: { notIn: ["converted", "lost"] },
      },
      orderBy: { nextActionDate: "asc" },
      take: 5,
      select: {
        id: true,
        name: true,
        company: true,
        nextAction: true,
        nextActionDate: true,
        stage: true,
      },
    }),
    prisma.adminClient.findMany({
      where: { clientId: { in: clientIds } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        client: { select: { id: true, name: true, company: true } },
      },
    }),
  ]);

  const mrr = subscriptions.reduce((sum, s) => sum + s.monthlyPrice, 0);
  const conversionRate =
    totalProspects > 0
      ? Math.round((convertedProspects / totalProspects) * 100)
      : 0;

  return {
    kpis: {
      activeClients,
      totalClients,
      mrr,
      mrrFormatted: formatCentimes(mrr),
      activeProspects,
      conversionRate,
    },
    alerts: {
      contractsPending,
      paymentAlerts: paymentAlerts + overdueInvoices,
    },
    nextActions,
    recentClients,
  };
}
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add src/app/\(dashboard\)/admin-portal/actions.ts
git commit -m "feat: add dashboard stats actions for admin-portal"
```

---

### Task 19: Dashboard page

**Files:**
- Create: `src/app/(dashboard)/admin-portal/page.tsx`
- Create: `src/components/admin-portal/dashboard-kpis.tsx`
- Create: `src/components/admin-portal/dashboard-widgets.tsx`

- [ ] **Step 1: Create KPI cards component**

"use client" component rendering 4 KPI cards in a grid:
1. Clients actifs (emerald gradient)
2. MRR (indigo gradient)
3. Prospects en cours (violet gradient)
4. Taux de conversion (amber gradient)

Follow the card pattern from the insights page KPIs.

- [ ] **Step 2: Create widgets component**

"use client" component showing:
- **Contrats en attente** card with count + link
- **Paiements en alerte** card with count + link
- **Prochaines actions** list (prospect name, action, date, overdue indicator)
- **Derniers clients** list (name, company, date)

Each item links to its detail page.

- [ ] **Step 3: Create dashboard server page**

```typescript
// src/app/(dashboard)/admin-portal/page.tsx
import { Header } from "@/components/layout/header";
import { DashboardKpis } from "@/components/admin-portal/dashboard-kpis";
import { DashboardWidgets } from "@/components/admin-portal/dashboard-widgets";
import { getDashboardStats } from "./actions";

export default async function AdminPortalDashboardPage() {
  const stats = await getDashboardStats();
  return (
    <>
      <Header
        title="Portail Admin"
        description="Vue d'ensemble de votre activité"
      />
      <div className="space-y-6 p-8">
        <DashboardKpis kpis={stats.kpis} />
        <DashboardWidgets
          alerts={stats.alerts}
          nextActions={stats.nextActions}
          recentClients={stats.recentClients}
        />
      </div>
    </>
  );
}
```

- [ ] **Step 4: Add quick action buttons**

In the dashboard page, add two buttons at the top: "Nouveau client" and "Nouveau prospect", linking to their respective creation pages.

- [ ] **Step 5: Type-check and commit**

```bash
npx tsc --noEmit
git add src/app/\(dashboard\)/admin-portal/page.tsx src/components/admin-portal/dashboard-kpis.tsx src/components/admin-portal/dashboard-widgets.tsx
git commit -m "feat: add admin-portal dashboard with KPIs and widgets"
```

---

### Task 20: Settings page (minimal)

**Files:**
- Create: `src/app/(dashboard)/admin-portal/settings/page.tsx`

- [ ] **Step 1: Create settings page**

A simple server page showing the admin's profile info (name, email, role). Placeholder for future settings.

```typescript
// src/app/(dashboard)/admin-portal/settings/page.tsx
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdminPortal } from "@/lib/admin-access";

export default async function AdminPortalSettingsPage() {
  const ctx = await requireAdminPortal();

  return (
    <>
      <Header title="Paramètres" description="Configuration de votre espace admin" />
      <div className="p-8">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-slate-900">Profil</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium text-slate-400">Nom</p>
                <p className="mt-0.5 text-slate-700">{ctx.userName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Rôle</p>
                <p className="mt-0.5 text-slate-700">{ctx.userRole === "super_admin" ? "Super Admin" : "Administrateur"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/admin-portal/settings/
git commit -m "feat: add admin-portal settings page (minimal)"
```

---

### Task 21: Final type-check and integration test

- [ ] **Step 1: Full type-check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 2: Dev server smoke test**

Run: `npm run dev`
Navigate to `/admin-portal` — should see the dashboard layout with sidebar.
Navigate to `/admin-portal/clients` — should see empty client list.
Navigate to `/admin-portal/prospects` — should see empty prospect list.
Navigate to `/admin-portal/billing` — should see billing overview.

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: admin-portal integration fixes"
```
