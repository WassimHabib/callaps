# Remplacement de Clerk par une auth custom (bcrypt + JWT)

## Contexte

L'application utilise actuellement Clerk SSO pour l'authentification. La gestion des rôles est simple (admin, client, super_admin) et seul un admin peut donner des accès. Clerk est surdimensionné pour ce besoin. On le remplace par un système custom : bcrypt pour les mots de passe, jose pour les JWT, Resend pour les emails d'invitation.

## Objectif

- Supprimer la dépendance à Clerk
- Système d'invitation par email (admin crée les comptes)
- Connexion email + mot de passe avec JWT cookie
- Réinitialisation de mot de passe par email
- Conserver l'interface `OrgContext` existante pour minimiser l'impact

## Ce qui ne change pas

- Rôles : admin / client / super_admin
- Portail admin : clients, prospects, facturation
- `OrgContext` (interface publique)
- Fonctions `requireAdmin()`, `requireSuperAdmin()`, `orgFilter()`
- Impersonation super_admin via cookie `impersonate_org`
- Toutes les pages dashboard, API webhooks, Retell, etc.

---

## 1. Schéma Prisma

### Modifications du modèle User

```prisma
model User {
  id             String    @id @default(cuid())
  email          String    @unique
  name           String
  passwordHash   String?                          // null tant que l'invitation n'est pas acceptée
  role           UserRole  @default(client)
  approved       Boolean   @default(false)
  company        String?
  phone          String?
  inviteToken    String?   @unique                // token d'invitation (crypto.randomUUID)
  inviteExpiresAt DateTime?                       // expiration du token (48h)
  resetToken     String?   @unique                // token de réinitialisation mdp
  resetExpiresAt DateTime?                        // expiration du reset (1h)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // Relations inchangées
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

### Champ supprimé

- `clerkId` : supprimé (plus de lien avec Clerk)

---

## 2. Librairies

| Librairie | Usage | Justification |
|-----------|-------|---------------|
| `bcrypt` | Hash des mots de passe | Standard, 10 salt rounds |
| `jose` | Création/vérification JWT | Lib légère, edge-compatible (fonctionne dans le middleware Next.js) |
| `resend` | Emails d'invitation et reset | Déjà utilisé dans le projet |

### Variable d'environnement

- `JWT_SECRET` : clé secrète pour signer les JWT (min 32 caractères, à générer avec `openssl rand -base64 32`)

### Variables Clerk supprimées

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`

---

## 3. Module auth (`src/lib/auth.ts`)

### JWT

- **Payload** : `{ userId: string, role: UserRole, email: string }`
- **Expiration** : 7 jours
- **Cookie** : `auth_token`, HttpOnly, Secure (en prod), SameSite=Lax, Path=/
- **Signature** : HS256 via `jose`

### Fonctions exportées

```typescript
// Créer un JWT et le set dans un cookie
async function createSession(user: { id: string, role: UserRole, email: string }): Promise<void>

// Supprimer le cookie de session
async function destroySession(): Promise<void>

// Lire et vérifier le JWT depuis le cookie — retourne le payload ou null
async function verifySession(): Promise<JWTPayload | null>

// Interface OrgContext inchangée
const getOrgContext = cache(async (): Promise<OrgContext>)

// Fonctions existantes conservées telles quelles
async function getUserRole(): Promise<UserRole>
async function requireAdmin(): Promise<void>
async function requireSuperAdmin(): Promise<void>
async function requireAuth(): Promise<string>  // retourne userId
function orgFilter(ctx: OrgContext): { orgId?: string }
```

### Changements dans `getOrgContext()`

- Remplace `auth()` de Clerk par `verifySession()`
- Supprime l'auto-création de user (les users sont créés par l'admin)
- Supprime les références à `clerkId`, `clerkOrgId`, `orgRole`
- L'`orgId` pour les clients et admins devient `user.id` (comportement déjà en place comme fallback)
- Le champ `clerkId` est retiré de `OrgContext`

### Nouvelle interface OrgContext

```typescript
export interface OrgContext {
  userId: string;         // DB user ID
  userName: string;       // DB user name
  userRole: UserRole;     // admin | client | super_admin
  orgId: string | null;   // user.id pour client/admin, null ou impersonated pour super_admin
  role: EffectiveRole;    // org_admin | super_admin (simplifié, plus de Clerk org roles)
  isImpersonating: boolean;
  isSuperAdmin: boolean;
  approved: boolean;
}
```

Note : `clerkId` supprimé de l'interface. Tous les consommateurs de `OrgContext` qui référencent `clerkId` doivent être mis à jour (recherche globale nécessaire).

---

## 4. Middleware (`src/middleware.ts`)

Remplace `clerkMiddleware` par un middleware custom :

```typescript
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_ROUTES = [
  "/sign-in",
  "/invite",
  "/forgot-password",
  "/reset-password",
  "/api/webhooks",
  "/api/retell",
  "/api/agents",
  "/api/slack",
  "/api/whatsapp",
  "/api/v1",
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Routes publiques : laisser passer
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Vérifier le JWT
  const token = request.cookies.get("auth_token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    // Token invalide ou expiré
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
}
```

---

## 5. Pages et routes API

### Pages supprimées

- `/sign-up/[[...sign-up]]` — plus d'inscription publique
- `/pending` — plus nécessaire, les comptes sont créés approuvés par l'admin

### Pages modifiées

- `/sign-in` — formulaire custom email + mot de passe (garde le même design split-layout)

### Nouvelles pages

| Route | Description |
|-------|-------------|
| `/sign-in` | Formulaire email + mot de passe, POST vers `/api/auth/login` |
| `/invite/[token]` | Page "Définir votre mot de passe" pour les nouveaux comptes |
| `/forgot-password` | Formulaire email pour demander un reset |
| `/reset-password/[token]` | Page "Nouveau mot de passe" |

### Nouvelles routes API

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/auth/login` | POST | Vérifie email + mdp, crée session JWT |
| `/api/auth/logout` | POST | Supprime le cookie de session |
| `/api/auth/invite/accept` | POST | Accepte une invitation, set le mot de passe |
| `/api/auth/forgot-password` | POST | Envoie un email de reset |
| `/api/auth/reset-password` | POST | Réinitialise le mot de passe avec le token |

### Routes API supprimées

- `/api/webhooks/clerk` — plus de webhook Clerk

---

## 6. Flow d'invitation (admin portal)

### Modification de la création de client

Le formulaire existant dans `/admin-portal/clients/new` est modifié :

1. L'admin remplit le formulaire client (nom, email, entreprise, etc.)
2. Le server action `createClient` :
   - Crée le `User` avec `approved: true`, `role: "client"`, `passwordHash: null`
   - Génère `inviteToken` (crypto.randomUUID) + `inviteExpiresAt` (now + 48h)
   - Crée la relation `AdminClient`
   - Envoie l'email d'invitation via Resend avec le lien `/invite/[token]`
3. Le client reçoit l'email, clique, définit son mot de passe
4. Le compte est activé (`passwordHash` rempli, `inviteToken` effacé)

### Email d'invitation

Template simple via Resend :
- Sujet : "Vous avez été invité sur Callaps"
- Corps : nom de l'admin, lien d'invitation, expiration 48h
- Bouton CTA : "Définir mon mot de passe"

### Renvoyer une invitation

L'admin peut renvoyer une invitation depuis la page détail du client si `passwordHash` est null (invitation non acceptée). Cela régénère un nouveau token et renvoie l'email.

---

## 7. Flow de connexion

1. L'utilisateur va sur `/sign-in`
2. Saisit email + mot de passe
3. `POST /api/auth/login` :
   - Cherche le user par email
   - Vérifie `approved === true`
   - Vérifie `passwordHash` existe (invitation acceptée)
   - Compare avec `bcrypt.compare()`
   - Si OK : crée JWT, set cookie, retourne `{ success: true }`
   - Si KO : retourne `{ error: "Email ou mot de passe incorrect" }` (message générique, pas de leak)
4. Redirect côté client vers `/dashboard` ou `/admin-portal` selon le rôle

---

## 8. Flow de réinitialisation de mot de passe

1. `/forgot-password` : l'utilisateur saisit son email
2. `POST /api/auth/forgot-password` :
   - Cherche le user par email
   - Si trouvé : génère `resetToken` + `resetExpiresAt` (1h), envoie email
   - Toujours retourne succès (pas de leak d'existence de compte)
3. L'utilisateur clique sur le lien dans l'email → `/reset-password/[token]`
4. Saisit son nouveau mot de passe
5. `POST /api/auth/reset-password` :
   - Vérifie le token et l'expiration
   - Hash le nouveau mot de passe
   - Met à jour `passwordHash`, efface `resetToken`/`resetExpiresAt`

---

## 9. Migration depuis Clerk

### Stratégie : migration directe

Vu que l'admin contrôle tous les comptes, la migration est simple :

1. **Migration Prisma** : ajouter les nouveaux champs, rendre `clerkId` optionnel
2. **Implémenter** le nouveau système auth complet
3. **Supprimer** tout le code Clerk (middleware, provider, webhook, pages sign-in/sign-up Clerk)
4. **Envoyer des invitations** aux utilisateurs existants pour qu'ils définissent un mot de passe
5. **Migration finale** : supprimer le champ `clerkId`
6. **Désinstaller** `@clerk/nextjs` et `svix`

### Utilisateurs existants

Les users existants en DB gardent leur `clerkId` temporairement mais n'ont pas de `passwordHash`. L'admin leur renvoie une invitation depuis le portail. Ils définissent leur mot de passe et peuvent se connecter avec le nouveau système.

---

## 10. Layout racine

### Avant

```tsx
<ClerkProvider>
  <TooltipProvider>
    {children}
  </TooltipProvider>
</ClerkProvider>
```

### Après

```tsx
<TooltipProvider>
  {children}
</TooltipProvider>
```

Le `ClerkProvider` est simplement supprimé. Aucun remplacement nécessaire car le JWT est géré via cookies côté serveur.

---

## 11. Sécurité

- **Mots de passe** : bcrypt avec 10 salt rounds
- **JWT** : signé HS256, HttpOnly cookie, Secure en prod, SameSite=Lax
- **Tokens d'invitation** : crypto.randomUUID (UUID v4), expiration 48h
- **Tokens de reset** : crypto.randomUUID, expiration 1h
- **Rate limiting** : non inclus dans cette itération (à ajouter si nécessaire)
- **Messages d'erreur** : génériques pour éviter l'énumération de comptes
- **CSRF** : SameSite=Lax protège contre les attaques CSRF basiques ; les mutations utilisent POST

---

## 12. Fichiers impactés

### Fichiers à modifier

| Fichier | Changement |
|---------|------------|
| `prisma/schema.prisma` | Ajouter champs auth, supprimer clerkId |
| `src/lib/auth.ts` | Réécrire avec JWT (jose), supprimer imports Clerk |
| `src/middleware.ts` | Remplacer clerkMiddleware par vérification JWT |
| `src/app/layout.tsx` | Supprimer ClerkProvider |
| `src/app/sign-in/[[...sign-in]]/page.tsx` | Formulaire custom email+mdp |
| `src/app/(dashboard)/admin-portal/clients/actions.ts` | Ajouter logique d'invitation |
| `src/app/(dashboard)/admin-portal/clients/new/page.tsx` | Déclencher invitation à la création |
| `src/app/(dashboard)/admin-portal/clients/[id]/page.tsx` | Bouton "Renvoyer invitation" |
| `package.json` | Ajouter bcrypt + jose, supprimer @clerk/nextjs + svix |
| `.env` / `.env.local` | Ajouter JWT_SECRET, supprimer variables Clerk |

### Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `src/app/invite/[token]/page.tsx` | Page d'acceptation d'invitation |
| `src/app/forgot-password/page.tsx` | Page demande de reset |
| `src/app/reset-password/[token]/page.tsx` | Page nouveau mot de passe |
| `src/app/api/auth/login/route.ts` | API login |
| `src/app/api/auth/logout/route.ts` | API logout |
| `src/app/api/auth/invite/accept/route.ts` | API acceptation invitation |
| `src/app/api/auth/forgot-password/route.ts` | API demande reset |
| `src/app/api/auth/reset-password/route.ts` | API reset mot de passe |
| `src/lib/email/invite.tsx` | Template email invitation |
| `src/lib/email/reset-password.tsx` | Template email reset |

### Fichiers à supprimer

| Fichier | Raison |
|---------|--------|
| `src/app/sign-up/[[...sign-up]]/page.tsx` | Plus d'inscription publique |
| `src/app/pending/page.tsx` | Plus de page d'attente d'approbation |
| `src/app/api/webhooks/clerk/route.ts` | Plus de webhook Clerk |

### Recherche globale nécessaire

- `clerkId` : supprimer toutes les références
- `@clerk/nextjs` : supprimer tous les imports
- `currentUser` / `auth()` de Clerk : remplacer par `verifySession()` / `getOrgContext()`
- `ClerkProvider` : supprimer
- `SignIn` / `SignUp` de Clerk : supprimer
