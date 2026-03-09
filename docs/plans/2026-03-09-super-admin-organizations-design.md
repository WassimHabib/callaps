# Super Admin + Clerk Organizations — Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajouter un systeme multi-tenant avec super admin plateforme, organisations Clerk, roles granulaires, et impersonation.

**Architecture:** Super admin au niveau plateforme (role DB), organisations via Clerk Organizations avec 4 roles internes, impersonation par cookie pour le super admin.

**Tech Stack:** Clerk Organizations API, Next.js middleware, Prisma, cookies Next.js

---

## Section 1 — Architecture des roles

### Niveau plateforme
- **`super_admin`** : role stocke dans `User.role` en DB (enum Prisma)
- Voit tous les clients, toutes les organisations, toutes les ressources
- Peut impersonner n'importe quelle organisation

### Niveau organisation (via Clerk)
4 roles geres par Clerk Organizations, pas en DB :

| Role | Description |
|------|-------------|
| `org_admin` | Gestion complete de l'organisation (membres, facturation, tout) |
| `manager` | CRUD agents + campagnes, lancement campagnes, lecture analytics |
| `operator` | Lancement campagnes existantes, lecture agents/campagnes |
| `viewer` | Lecture seule sur tout |

### Flux d'acces
1. User se connecte via Clerk
2. `getOrgContext()` verifie : super_admin ? → acces total (ou org impersonnee). Sinon → recup org active Clerk + role org
3. Toutes les requetes DB filtrent par `orgId`

---

## Section 2 — Modele de donnees

### Modifications Prisma

```prisma
enum UserRole {
  client
  admin
  super_admin
}

model Agent {
  // ... champs existants
  orgId String  // Clerk Organization ID
}

model Campaign {
  // ... champs existants
  orgId String  // Clerk Organization ID
}
```

### Principes
- **Pas de table Organization en DB** — Clerk gere les orgs (nom, membres, roles)
- **`orgId`** ajoute sur Agent et Campaign pour le filtrage multi-tenant
- **Permissions en code** (`src/lib/permissions.ts`), pas en DB — map statique role → permissions

---

## Section 3 — Permissions & Impersonation

### Permissions statiques

```typescript
// src/lib/permissions.ts
const PERMISSIONS = {
  org_admin: ["agents:*", "campaigns:*", "members:*", "analytics:read", "billing:*"],
  manager:   ["agents:*", "campaigns:*", "analytics:read"],
  operator:  ["agents:read", "campaigns:read", "campaigns:launch"],
  viewer:    ["agents:read", "campaigns:read", "analytics:read"],
} as const;
```

### Impersonation

- Cookie `impersonate_org` contient l'`orgId` cible
- Seul `super_admin` peut definir ce cookie
- `getOrgContext()` verifie : si super_admin + cookie → retourne l'org du cookie
- **Bandeau rouge** en haut de page quand impersonation active : "Vous voyez l'organisation X — [Quitter]"
- Le bouton "Quitter" supprime le cookie

### Helper `getOrgContext()`

```typescript
async function getOrgContext(): Promise<{
  orgId: string;
  role: OrgRole | "super_admin";
  isImpersonating: boolean;
}> {
  const user = await currentUser();

  // Super admin
  if (dbUser.role === "super_admin") {
    const impersonatedOrg = cookies().get("impersonate_org");
    if (impersonatedOrg) {
      return { orgId: impersonatedOrg.value, role: "super_admin", isImpersonating: true };
    }
    // Super admin sans impersonation → dashboard admin global
  }

  // User normal → org active Clerk
  const org = auth().orgId;
  const role = auth().orgRole;
  return { orgId: org, role, isImpersonating: false };
}
```
