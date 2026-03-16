# Admin Portal — Gestion Clients & Prospects

## Contexte

Wevlap est une plateforme SaaS de voice AI. Actuellement, le super_admin gère tous les clients depuis `/admin/`. On ajoute un **portail admin** (`/admin-portal/`) pour les admins revendeurs et gestionnaires internes, leur permettant de gérer leurs propres clients et prospects de manière autonome.

## Modèle business

- **Super admin** : administrateur plateforme (toi)
- **Admin** : revendeur indépendant OU gestionnaire interne. Gère un portefeuille de clients.
- **Client** : utilisateur final qui utilise la plateforme (agents IA, campagnes, etc.)

Un admin peut être propriétaire de clients ou avoir un accès partagé (read/manage) aux clients d'un autre admin.

---

## Sous-projets

Ce design couvre le **sous-projet 1** d'un ensemble plus large :

| # | Sous-projet | Statut |
|---|-------------|--------|
| 1 | Hiérarchie Admin/Client + CRM + Pipeline Prospects + Facturation | Ce document |
| 2 | Signature électronique des contrats | Futur |
| 3 | Formulaire web d'acquisition prospects | Futur |
| 4 | Vue kanban pipeline + étapes personnalisables | Futur |

---

## Modèles de données

### `AdminClient` — Relation admin -> client

```prisma
model AdminClient {
  id              String   @id @default(cuid())
  adminId         String
  admin           User     @relation("AdminClients", fields: [adminId], references: [id])
  clientId        String
  client          User     @relation("ClientOfAdmin", fields: [clientId], references: [id])
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
}
```

### `AdminClientShare` — Partage d'accès entre admins

```prisma
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
}
```

### `Prospect` — Pipeline de conversion

```prisma
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
  estimatedValue  Int?      // centimes
  notes           String?
  convertedToId   String?
  convertedTo     User?     @relation("ConvertedProspect", fields: [convertedToId], references: [id])
  metadata        Json      @default("{}")
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  activities      ProspectActivity[]

  @@index([adminId])
  @@index([stage])
}
```

### `ProspectActivity` — Historique des interactions

```prisma
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
}
```

### Relations à ajouter sur User

```prisma
// Ajouter au modèle User existant :
adminClients      AdminClient[]       @relation("AdminClients")
clientOfAdmin     AdminClient[]       @relation("ClientOfAdmin")
sharedClients     AdminClientShare[]  @relation("SharedAdminClients")
prospects         Prospect[]          @relation("AdminProspects")
prospectActivities ProspectActivity[] @relation("ProspectActivities")
convertedProspects Prospect[]          @relation("ConvertedProspect")
```

---

## Routes et pages

### Portail Admin — `/admin-portal/`

Accessible aux users avec `role === "admin"` ou `role === "super_admin"`.

| Route | Description |
|-------|-------------|
| `/admin-portal` | Dashboard agrégé |
| `/admin-portal/clients` | Liste des clients |
| `/admin-portal/clients/new` | Créer un client |
| `/admin-portal/clients/[id]` | Fiche client détaillée |
| `/admin-portal/prospects` | Pipeline prospects |
| `/admin-portal/prospects/new` | Saisir un prospect |
| `/admin-portal/prospects/[id]` | Fiche prospect |
| `/admin-portal/billing` | Facturation clients |
| `/admin-portal/settings` | Paramètres admin |

### Sidebar admin-portal

Navigation dédiée, distincte des sidebars client et super_admin :
- Dashboard
- Mes Clients
- Prospects
- Facturation
- Paramètres

### Layout

`/admin-portal/layout.tsx` :
- Vérifie `role === "admin" || role === "super_admin"`
- Utilise la sidebar admin-portal
- Bandeau d'impersonation si l'admin est dans l'espace d'un client

---

## Dashboard agrégé (`/admin-portal`)

### KPIs (4 cartes)

| KPI | Calcul |
|-----|--------|
| Clients actifs | `AdminClient` avec `status: "active"` pour cet admin |
| MRR | Somme des `Subscription.monthlyPrice` des clients de l'admin |
| Prospects en cours | `Prospect` dont `stage` ni "converted" ni "lost" |
| Taux de conversion | Prospects convertis / total prospects (30 jours) |

### Widgets

- **Contrats en attente** : Clients avec `contractStatus: "sent"`
- **Paiements en alerte** : Clients avec `paymentStatus: "failed"` ou factures `overdue`
- **Prochaines actions** : 5 prochaines `nextActionDate` des prospects
- **Derniers clients** : 5 derniers `AdminClient` créés

### Actions rapides

Boutons : "Nouveau client" + "Nouveau prospect"

---

## Fiche client (`/admin-portal/clients/[id]`)

### En-tête
- Nom, entreprise, email, téléphone
- Badge statut (onboarding / active / suspended / churned)
- Bouton "Accéder à l'espace" (impersonation via cookie existant)

### Sections

**1. Informations générales**
- Coordonnées, SIRET, date de création
- Admin propriétaire + admins partagés (avec bouton "Partager l'accès")
- Notes libres éditables

**2. Contrat & Paiement**
- Statut contrat : draft -> sent -> signed -> expired (avec dates)
- Upload/lien PDF du contrat
- Statut paiement : pending -> authorized -> active -> failed
- Méthode de paiement
- Historique des changements de statut

**3. Abonnement & Facturation**
- Abonnement actuel (prix, essai gratuit)
- L'admin peut créer/modifier l'abonnement
- Liste des factures avec statut
- Bouton "Générer facture"
- Total facturé, total payé, solde

**4. Activité**
- Stats d'utilisation (appels, agents, campagnes)
- Dernier login
- Timeline événements

### Actions (dropdown)
- Modifier les infos
- Changer le statut
- Envoyer le contrat
- Accéder à l'espace
- Supprimer le client

---

## Création client (`/admin-portal/clients/new`)

### Formulaire

1. **Informations** : Nom, email, téléphone, entreprise, SIRET (optionnel)
2. **Abonnement** (optionnel) : Prix mensuel, prix/minute, essai gratuit
3. **Contrat** (optionnel) : Upload PDF ou lien

### Au submit

1. Crée `User` en DB avec `role: "client"`, `approved: true`
2. Envoie invitation Clerk pour que le client crée son mot de passe
3. Crée `AdminClient` avec `status: "onboarding"`, `contractStatus: "draft"`
4. Crée `Subscription` si abonnement renseigné
5. Redirige vers fiche client

---

## Pipeline Prospects (`/admin-portal/prospects`)

### Étapes et couleurs

| Étape | Slug | Couleur |
|-------|------|---------|
| Prospect | `prospect` | slate |
| Contacté | `contacted` | blue |
| Démo planifiée | `demo_scheduled` | indigo |
| Démo faite | `demo_done` | violet |
| Proposition envoyée | `proposal_sent` | amber |
| Négociation | `negotiation` | orange |
| Converti | `converted` | emerald |
| Perdu | `lost` | red |

### Vue liste avec filtres

- Par étape (multi-select)
- Par source
- Par date de prochaine action (en retard, aujourd'hui, cette semaine)
- Recherche par nom/entreprise/téléphone

### Carte prospect

- Nom, entreprise, téléphone
- Badge étape + badge source
- Valeur estimée
- Prochaine action + date (indicateur rouge si en retard)
- Nombre d'interactions

### Fiche prospect (`/admin-portal/prospects/[id]`)

**En-tête** : Nom, entreprise, badges étape/source, valeur estimée

**Barre de progression** : Les 8 étapes horizontalement, étape actuelle en surbrillance. Boutons "Avancer" / "Marquer perdu".

**Sections :**
- **Informations** : Coordonnées, source, valeur estimée (éditables)
- **Prochaine action** : Texte + date, éditable
- **Raison de perte** : Visible si `stage: "lost"`, éditable
- **Historique** : Timeline `ProspectActivity` (appels, emails, notes, changements d'étape)
- **Ajouter interaction** : Formulaire rapide (type + description)

### Conversion vers client

Quand stage passe à "converted" :
- Dialog propose de créer le client
- Pré-remplit infos depuis le prospect
- Lie `Prospect.convertedToId` au nouveau client

---

## Facturation admin (`/admin-portal/billing`)

### KPIs

| KPI | Calcul |
|-----|--------|
| MRR total | Somme abonnements actifs |
| Factures impayées | Count factures overdue/sent |
| Montant impayé | Somme totalTTC impayées |
| Clients en essai | Count subscriptions en free trial |

### Liste clients avec résumé

- Nom, entreprise
- Abonnement (prix + statut)
- Dernière facture (montant + statut)
- Badge alerte si impayé

### Actions admin

- Créer/modifier abonnement
- Générer facture mensuelle
- Marquer facture envoyée/payée
- Mettre en pause/réactiver abonnement

Réutilise les fonctions existantes de `/src/lib/billing.ts`, scopées aux clients de l'admin.

---

## Permissions et sécurité

### Matrice d'accès

| Action | super_admin | admin (proprio) | admin (read) | admin (manage) | client |
|--------|:-----------:|:---------------:|:------------:|:--------------:|:------:|
| Voir fiche client | Oui | Oui | Oui | Oui | Non |
| Modifier infos/contrat | Oui | Oui | Non | Oui | Non |
| Gérer abonnement/factures | Oui | Oui | Non | Oui | Non |
| Impersonation | Oui | Oui | Oui | Oui | — |
| Supprimer client | Oui | Oui | Non | Non | — |
| Partager accès | Oui | Oui | Non | Non | — |

### Fonction utilitaire

```typescript
async function canAccessClient(adminId: string, clientId: string): Promise<{
  access: boolean;
  permission: "owner" | "manage" | "read" | null;
}>
```

Chaque server action vérifie l'accès via cette fonction avant d'agir.

### Middleware

- `/admin-portal/**` : `role === "admin" || role === "super_admin"`
- Le super_admin peut tout voir dans le portail admin
- L'admin ne voit que ses clients (propriétaire) + clients partagés

---

## Résolution orgId pour la facturation

Le modèle `Subscription` et `Invoice` utilisent `orgId` comme clé. Pour un client, `orgId` est résolu via `auth.ts` : `clerkOrgId || user.id`. On ajoute un champ `clientOrgId` sur `AdminClient` pour stocker directement l'orgId du client au moment de la création, évitant les lookups complexes.

```prisma
// Ajouter sur AdminClient :
clientOrgId     String   // orgId du client (= user.id si pas de Clerk org)
```

**Chemin de requête pour le MRR :**
```
AdminClient (adminId = currentAdmin) -> clientOrgId -> Subscription (orgId = clientOrgId)
```

**Chemin pour les factures :**
```
AdminClient (adminId = currentAdmin) -> clientOrgId -> Invoice (orgId = clientOrgId)
```

Au moment de la création client, `clientOrgId` est rempli avec `newUser.id` (car le client n'a pas de Clerk org à ce stade).

---

## Server actions (structure fichiers)

Toutes les opérations sont des **server actions** Next.js (pas d'API routes séparées). Fichiers :

| Fichier | Responsabilité |
|---------|---------------|
| `src/app/(dashboard)/admin-portal/actions.ts` | Dashboard KPIs, stats agrégées |
| `src/app/(dashboard)/admin-portal/clients/actions.ts` | CRUD clients, `canAccessClient`, partage, changement statut |
| `src/app/(dashboard)/admin-portal/prospects/actions.ts` | CRUD prospects, activités, changement d'étape, conversion |
| `src/app/(dashboard)/admin-portal/billing/actions.ts` | Abonnements, factures — appelle `billing.ts` avec vérif `canAccessClient` |

**Chaque server action :**
1. Appelle `getOrgContext()` pour identifier l'admin
2. Vérifie `role === "admin" || role === "super_admin"`
3. Pour les actions sur un client : appelle `canAccessClient(adminId, clientId)` et vérifie le niveau de permission requis
4. Appelle les fonctions métier existantes (billing.ts, etc.)

**Pas de modification** des server actions super_admin existantes dans `/admin/billing/actions.ts`. Les actions admin-portal sont indépendantes, elles appellent directement les fonctions utilitaires de `/src/lib/billing.ts`.

---

## Impersonation admin

L'impersonation existante (`startImpersonation` dans `/admin/impersonation-actions.ts`) appelle `requireSuperAdmin()`. On crée une **nouvelle action d'impersonation pour admins** :

```typescript
// src/app/(dashboard)/admin-portal/impersonation-actions.ts

export async function startAdminImpersonation(clientId: string) {
  const ctx = await getOrgContext();

  // Vérifie que c'est un admin ou super_admin
  if (ctx.userRole !== "admin" && ctx.userRole !== "super_admin") {
    throw new Error("Permission denied");
  }

  // Vérifie que l'admin a accès au client
  const access = await canAccessClient(ctx.userId, clientId);
  if (!access.access) {
    throw new Error("Permission denied");
  }

  // Réutilise le même mécanisme de cookie
  cookies().set("impersonate_org", clientId, { path: "/" });
  redirect("/dashboard");
}

export async function stopAdminImpersonation() {
  cookies().delete("impersonate_org");
  redirect("/admin-portal/clients");
}
```

Le mécanisme est identique (cookie `impersonate_org`), mais la **vérification d'accès** passe par `canAccessClient` au lieu de `requireSuperAdmin`. Le retour après impersonation redirige vers `/admin-portal/clients` au lieu de `/admin`.

---

## Invitation Clerk pour les nouveaux clients

Lors de la création d'un client, on utilise le **Backend API Clerk** :

```typescript
import { clerkClient } from "@clerk/nextjs/server";

// Option 1 : Créer une invitation (le client reçoit un email avec un lien)
await clerkClient.invitations.createInvitation({
  emailAddress: clientEmail,
  redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/sign-up`,
});
```

**Si l'email existe déjà dans Clerk** : on récupère le user existant au lieu de créer une invitation. Le `User` en base est créé avec le `clerkId` correspondant.

**Si Clerk n'est pas nécessaire** (l'admin gère tout) : on crée juste le `User` en DB avec `approved: true` et sans `clerkId`. Le client pourra s'inscrire plus tard via le flow normal et sera matché par email.

**Approche recommandée** : Créer le `User` en DB d'abord, puis envoyer l'invitation Clerk. Le webhook Clerk `user.created` existant matchera par email et liera le `clerkId`.

---

## Cas limites et erreurs

| Cas | Comportement |
|-----|-------------|
| Email client déjà existant dans User | Erreur "Ce client existe déjà" — proposer de le lier à l'admin via `AdminClient` |
| Conversion prospect échoue | Rollback : le prospect reste à son étape précédente, message d'erreur |
| Admin supprimé | Ses `AdminClient` sont réassignés au super_admin (migration/trigger) |
| Client partagé entre admins, un admin le supprime | Seul le propriétaire peut supprimer (permission "owner" requise) |
| Client avec abonnement actif supprimé | Confirmation obligatoire mentionnant l'abonnement actif, l'abonnement est mis en pause |

---

## Interaction entre statuts

`AdminClient.paymentStatus` est un **statut CRM géré manuellement** par l'admin (pour suivre l'autorisation de prélèvement, etc.). Il est distinct de :
- `Subscription.status` : statut technique de l'abonnement
- `Invoice.status` : statut de chaque facture

Ils ne sont **pas synchronisés automatiquement**. L'admin met à jour `paymentStatus` manuellement. Les widgets "Paiements en alerte" du dashboard combinent les deux sources :
- `AdminClient.paymentStatus === "failed"` OU
- `Invoice.status === "overdue"` pour les factures du client

---

## Structure des routes (route group)

Le portail admin vit **dans le route group `(dashboard)`** existant :

```
src/app/(dashboard)/admin-portal/
  layout.tsx           <- Vérifie role admin, sidebar admin-portal
  page.tsx             <- Dashboard
  actions.ts           <- KPIs, stats
  impersonation-actions.ts
  clients/
    page.tsx           <- Liste clients
    new/page.tsx       <- Création
    [id]/page.tsx      <- Fiche détaillée
    actions.ts
  prospects/
    page.tsx           <- Pipeline
    new/page.tsx       <- Nouveau prospect
    [id]/page.tsx      <- Fiche prospect
    actions.ts
  billing/
    page.tsx           <- Facturation
    actions.ts
  settings/
    page.tsx
```

Le layout `/admin-portal/layout.tsx` **remplace** la sidebar standard par une sidebar admin-portal. Il hérite du layout `(dashboard)` parent (qui gère l'auth Clerk de base).

**Protection** : La vérification de rôle se fait dans le layout server-side (pas dans le middleware Clerk, qui ne connaît pas les rôles DB). C'est le même pattern que `/admin/` qui utilise `requireSuperAdmin()` dans chaque page.

---

## Ce qui est réutilisé

- **Cookie impersonation** : mécanisme `impersonate_org` existant (nouvelle action d'accès pour admins)
- **Billing lib** : `/src/lib/billing.ts` — fonctions appelées directement depuis les actions admin-portal
- **Clerk** : invitation par email via Backend API
- **Permissions** : `/src/lib/permissions.ts` pour les rôles Clerk org (inchangé)
- **Layout (dashboard)** : Le route group `(dashboard)` parent est réutilisé

## Ce qui est hors scope (futurs sous-projets)

- Signature électronique des contrats
- Formulaire web d'acquisition prospects
- Vue kanban du pipeline
- Étapes de pipeline personnalisables
- Notifications (email/SMS) pour les relances prospects
