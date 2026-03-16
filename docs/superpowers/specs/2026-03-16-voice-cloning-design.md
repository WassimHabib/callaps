# Voice Cloning — Design Spec

## Objectif

Permettre aux utilisateurs de Callaps de cloner leur voix via Retell AI et de l'utiliser pour leurs agents IA vocaux.

## Approche retenue

Approche A — Voix clonées stockées uniquement côté Retell. On appelle l'API Retell pour créer/supprimer les voix, et on garde une table Prisma `ClonedVoice` pour le contrôle d'accès, le partage entre orgs, et la limite par organisation.

## Modèle de données

```prisma
model ClonedVoice {
  id            String   @id @default(cuid())
  orgId         String
  name          String
  retellVoiceId String   @unique
  gender        String   // "Male" | "Female"
  createdBy     String
  shared        Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([orgId])
}
```

- Limite : 3 voix clonées par org (vérifiée côté server action)
- `shared = true` : voix visible par toutes les orgs (toggle réservé admin/super_admin)

## API Retell

Ajouts dans `src/lib/retell.ts` :

- `createVoice(formData: FormData)` — `POST /create-voice` (multipart/form-data : `voice_name` + `voice_file`)
- `deleteVoice(voiceId: string)` — `DELETE /delete-voice/{voiceId}`

Contraintes fichier : formats audio/video, max 10 MB.

## Pages & composants

### Page `/voices`

Nouvelle page dans le dashboard client, ajoutée à la sidebar.

**Contenu :**
- Compteur "X/3 voix utilisées"
- Liste des voix clonées de l'org (cards : nom, genre, date de création)
- Bouton "Cloner une voix" → dialog :
  - Champ nom (obligatoire)
  - Sélecteur genre (Male/Female)
  - Upload fichier audio (max 10 MB)
  - Bouton créer
- Bouton supprimer sur chaque voix (dialog de confirmation)
- Pour admin/super_admin : toggle "Partager" sur chaque voix

### Sélecteur de voix (modification de l'existant)

Modification de `src/components/agents/voice-selector.tsx` :

- Ajouter une section "Mes voix" en haut de la liste (avant les voix catalogue)
- Inclut : voix clonées de l'org + voix partagées (`shared: true`)
- Lien raccourci "Cloner une voix" → `/voices`

## Server actions

Fichier : `src/app/(dashboard)/voices/actions.ts`

| Action | Description | Accès |
|--------|-------------|-------|
| `listClonedVoices()` | Voix de l'org + voix partagées | Tous |
| `createClonedVoice(formData)` | Vérifie limite 3/org, upload Retell, sauvegarde DB | Tous |
| `deleteClonedVoice(id)` | Supprime Retell + DB (propriétaire ou admin) | Propriétaire / admin |
| `toggleVoiceSharing(id)` | Toggle `shared` | admin / super_admin |

## Fichiers à créer

```
prisma/migrations/XXXX_add_cloned_voice/migration.sql
src/app/(dashboard)/voices/page.tsx
src/app/(dashboard)/voices/actions.ts
src/components/voices/voice-list.tsx
src/components/voices/clone-voice-dialog.tsx
```

## Fichiers à modifier

```
prisma/schema.prisma          — ajouter model ClonedVoice
src/lib/retell.ts              — ajouter createVoice(), deleteVoice()
src/components/layout/app-sidebar.tsx  — ajouter lien "Voix" dans clientLinks
src/components/agents/voice-selector.tsx — section "Mes voix" + lien cloner
```

## Limites & contraintes

- Max 3 voix clonées par org
- Fichier audio max 10 MB
- Formats acceptés : audio/*, video/*
- Pas de stockage fichier côté Callaps (Retell uniquement)
- Pas de preview audio pour les voix clonées (dépend de ce que Retell retourne)
