# Voice Cloning Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow Callaps users to clone their voice via Retell AI and use it for their voice agents.

**Architecture:** New Prisma model `ClonedVoice` tracks cloned voices per org. Server actions handle CRUD via Retell API (`POST /create-voice`, `DELETE /delete-voice`). A new `/voices` page lets users manage cloned voices, and the existing voice selector shows cloned voices in a "Mes voix" section.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Retell AI REST API, React 19, shadcn/ui (base-ui), Tailwind CSS 4

---

## File Structure

### Files to create

| File | Responsibility |
|------|---------------|
| `src/app/(dashboard)/voices/page.tsx` | Server component — fetch cloned voices, render VoiceList |
| `src/app/(dashboard)/voices/actions.ts` | Server actions — CRUD for cloned voices via Retell API |
| `src/components/voices/voice-list.tsx` | Client component — voice cards grid, delete, share toggle |
| `src/components/voices/clone-voice-dialog.tsx` | Client component — dialog with name, gender, file upload |

### Files to modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `ClonedVoice` model |
| `src/lib/retell.ts` | Add `createVoice()` and `deleteVoice()` functions |
| `src/components/layout/app-sidebar.tsx` | Add "Voix" link to `clientLinks` |
| `src/components/agents/voice-selector.tsx` | Add "Mes voix" section at top + "Cloner" link |

---

## Task 1: Prisma schema — add ClonedVoice model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add ClonedVoice model to schema**

Add at the end of `prisma/schema.prisma`:

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
  @@map("cloned_voices")
}
```

- [ ] **Step 2: Generate migration**

Run: `npx prisma migrate dev --name add_cloned_voice`
Expected: Migration created successfully, client regenerated.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add ClonedVoice Prisma model"
```

---

## Task 2: Retell API — createVoice and deleteVoice

**Files:**
- Modify: `src/lib/retell.ts`

- [ ] **Step 1: Add createVoice function**

Add after the existing `listVoices()` function in `src/lib/retell.ts`:

```typescript
export async function createVoice(formData: FormData): Promise<{ voice_id: string }> {
  const res = await fetch(`${RETELL_BASE_URL}/create-voice`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Retell createVoice failed: ${res.status} ${error}`);
  }

  return res.json();
}

export async function deleteVoice(voiceId: string): Promise<void> {
  const res = await fetch(`${RETELL_BASE_URL}/delete-voice/${voiceId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Retell deleteVoice failed: ${res.status} ${error}`);
  }
}
```

Note: `createVoice` uses raw `Authorization` header (no `Content-Type`) because the body is `FormData` — the browser/Node sets `multipart/form-data` with boundary automatically. Do NOT set `Content-Type` manually.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/retell.ts
git commit -m "feat: add createVoice and deleteVoice to Retell API wrapper"
```

---

## Task 3: Server actions — voice CRUD

**Files:**
- Create: `src/app/(dashboard)/voices/actions.ts`

Reference files:
- `src/lib/auth.ts` — `getOrgContext()` for auth, `orgFilter()` for scoping
- `src/lib/retell.ts` — `createVoice()`, `deleteVoice()`
- `src/lib/prisma.ts` — Prisma client instance

- [ ] **Step 1: Create actions file with all 4 server actions**

Create `src/app/(dashboard)/voices/actions.ts`:

```typescript
"use server";

import { getOrgContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createVoice, deleteVoice } from "@/lib/retell";
import { revalidatePath } from "next/cache";

const MAX_VOICES_PER_ORG = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function listClonedVoices() {
  const ctx = await getOrgContext();
  if (!ctx.orgId && !ctx.isSuperAdmin) throw new Error("No org");

  const voices = await prisma.clonedVoice.findMany({
    where: {
      OR: [
        // Own org voices
        ...(ctx.orgId ? [{ orgId: ctx.orgId }] : []),
        // Shared voices from other orgs
        { shared: true },
        // Super admin sees all
        ...(ctx.isSuperAdmin ? [{}] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  return voices;
}

export async function createClonedVoice(formData: FormData) {
  const ctx = await getOrgContext();
  if (!ctx.orgId) throw new Error("No org");

  const name = formData.get("name") as string;
  const gender = formData.get("gender") as string;
  const file = formData.get("file") as File;

  if (!name || !gender || !file) {
    throw new Error("Nom, genre et fichier audio requis");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Le fichier ne doit pas dépasser 10 MB");
  }

  // Check org limit
  const count = await prisma.clonedVoice.count({
    where: { orgId: ctx.orgId },
  });
  if (count >= MAX_VOICES_PER_ORG) {
    throw new Error(`Limite de ${MAX_VOICES_PER_ORG} voix clonées atteinte`);
  }

  // Call Retell API
  const retellForm = new FormData();
  retellForm.append("voice_name", `${name} (${ctx.orgId})`);
  retellForm.append("voice_file", file);

  const result = await createVoice(retellForm);

  // Save to DB
  const voice = await prisma.clonedVoice.create({
    data: {
      orgId: ctx.orgId,
      name,
      retellVoiceId: result.voice_id,
      gender,
      createdBy: ctx.userId,
    },
  });

  revalidatePath("/voices");
  return voice;
}

export async function deleteClonedVoice(id: string) {
  const ctx = await getOrgContext();
  if (!ctx.orgId && !ctx.isSuperAdmin) throw new Error("No org");

  const voice = await prisma.clonedVoice.findUnique({ where: { id } });
  if (!voice) throw new Error("Voix introuvable");

  // Only owner org, admin, or super_admin can delete
  const isOwner = ctx.orgId === voice.orgId;
  const isAdmin = ctx.userRole === "admin" || ctx.userRole === "super_admin";
  if (!isOwner && !isAdmin) throw new Error("Non autorisé");

  // Delete from Retell
  await deleteVoice(voice.retellVoiceId);

  // Delete from DB
  await prisma.clonedVoice.delete({ where: { id } });

  revalidatePath("/voices");
}

export async function toggleVoiceSharing(id: string) {
  const ctx = await getOrgContext();
  if (ctx.userRole !== "admin" && ctx.userRole !== "super_admin") {
    throw new Error("Non autorisé : accès admin requis");
  }

  const voice = await prisma.clonedVoice.findUnique({ where: { id } });
  if (!voice) throw new Error("Voix introuvable");

  await prisma.clonedVoice.update({
    where: { id },
    data: { shared: !voice.shared },
  });

  revalidatePath("/voices");
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/voices/actions.ts
git commit -m "feat: server actions for cloned voice CRUD"
```

---

## Task 4: Clone voice dialog component

**Files:**
- Create: `src/components/voices/clone-voice-dialog.tsx`

Reference files:
- `src/components/admin-portal/prospect-form.tsx` — pattern for form + dialog + `useTransition`
- `src/components/ui/dialog.tsx` — Dialog, DialogTrigger use base-ui `render` prop (NOT `asChild`)
- `src/components/ui/select.tsx` — base-ui Select: `onValueChange` is `(value: string | null, event) => void`

- [ ] **Step 1: Create clone-voice-dialog component**

Create `src/components/voices/clone-voice-dialog.tsx`:

```typescript
"use client";

import { useState, useTransition, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClonedVoice } from "@/app/(dashboard)/voices/actions";
import { Plus, Upload } from "lucide-react";

interface CloneVoiceDialogProps {
  disabled?: boolean;
}

export function CloneVoiceDialog({ disabled }: CloneVoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("Female");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setName("");
    setGender("Female");
    setFile(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleSubmit() {
    if (!name.trim()) {
      setError("Le nom est requis");
      return;
    }
    if (!file) {
      setError("Le fichier audio est requis");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Le fichier ne doit pas dépasser 10 MB");
      return;
    }

    setError(null);
    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("gender", gender);
    formData.append("file", file);

    startTransition(async () => {
      try {
        await createClonedVoice(formData);
        reset();
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors du clonage");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" className="gap-1.5" disabled={disabled} />
        }
      >
        <Plus className="h-4 w-4" />
        Cloner une voix
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cloner une voix</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Nom de la voix *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Ma voix, Voix du patron..."
            />
          </div>

          {/* Gender */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Genre</label>
            <Select value={gender} onValueChange={(v) => v && setGender(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Female">Femme</SelectItem>
                <SelectItem value="Male">Homme</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File upload */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Fichier audio *
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-slate-200 p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50"
            >
              <Upload className="h-5 w-5 text-slate-400" />
              <div className="min-w-0 flex-1">
                {file ? (
                  <p className="truncate text-sm font-medium text-slate-700">
                    {file.name}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">
                    Cliquez pour sélectionner un fichier audio ou vidéo (max 10 MB)
                  </p>
                )}
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,video/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !name.trim() || !file}
            >
              {isPending ? "Clonage en cours..." : "Cloner"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/voices/clone-voice-dialog.tsx
git commit -m "feat: clone voice dialog component"
```

---

## Task 5: Voice list component

**Files:**
- Create: `src/components/voices/voice-list.tsx`

Reference files:
- `src/components/admin-portal/client-list.tsx` — pattern for card grid with actions
- base-ui Dialog: uses `render` prop, NOT `asChild`

- [ ] **Step 1: Create voice-list component**

Create `src/components/voices/voice-list.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CloneVoiceDialog } from "./clone-voice-dialog";
import { deleteClonedVoice, toggleVoiceSharing } from "@/app/(dashboard)/voices/actions";
import { Trash2, Share2, Mic } from "lucide-react";

interface ClonedVoice {
  id: string;
  orgId: string;
  name: string;
  retellVoiceId: string;
  gender: string;
  createdBy: string;
  shared: boolean;
  createdAt: Date;
}

interface VoiceListProps {
  voices: ClonedVoice[];
  orgVoiceCount: number;
  isAdmin: boolean;
  currentOrgId: string | null;
}

export function VoiceList({ voices, orgVoiceCount, isAdmin, currentOrgId }: VoiceListProps) {
  const limitReached = orgVoiceCount >= 3;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Mes voix clonées</h1>
          <p className="mt-1 text-sm text-slate-500">
            {orgVoiceCount}/3 voix utilisées
          </p>
        </div>
        <CloneVoiceDialog disabled={limitReached} />
      </div>

      {/* Limit warning */}
      {limitReached && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-700">
            Vous avez atteint la limite de 3 voix clonées. Supprimez une voix pour en créer une nouvelle.
          </p>
        </div>
      )}

      {/* Voice cards */}
      {voices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Mic className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            Aucune voix clonée pour le moment.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Clonez votre voix pour personnaliser vos agents IA.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {voices.map((voice) => (
            <VoiceCard
              key={voice.id}
              voice={voice}
              isAdmin={isAdmin}
              isOwn={voice.orgId === currentOrgId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VoiceCard({
  voice,
  isAdmin,
  isOwn,
}: {
  voice: ClonedVoice;
  isAdmin: boolean;
  isOwn: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      await deleteClonedVoice(voice.id);
      setDeleteOpen(false);
    });
  }

  function handleToggleShare() {
    startTransition(async () => {
      await toggleVoiceSharing(voice.id);
    });
  }

  const date = new Date(voice.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {voice.name}
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <Badge className="bg-slate-100 text-slate-600 text-[10px] border-0">
                {voice.gender === "Male" ? "Homme" : "Femme"}
              </Badge>
              {voice.shared && (
                <Badge className="bg-indigo-50 text-indigo-600 text-[10px] border-0">
                  Partagée
                </Badge>
              )}
              {!isOwn && (
                <Badge className="bg-violet-50 text-violet-600 text-[10px] border-0">
                  Externe
                </Badge>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-400">{date}</p>
          </div>

          {/* Actions — only for own voices or admin */}
          {(isOwn || isAdmin) && (
            <div className="flex items-center gap-1 shrink-0">
              {isAdmin && isOwn && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleShare}
                  disabled={isPending}
                  className="h-8 w-8 p-0"
                  title={voice.shared ? "Retirer le partage" : "Partager"}
                >
                  <Share2
                    className={`h-3.5 w-3.5 ${voice.shared ? "text-indigo-500" : "text-slate-400"}`}
                  />
                </Button>
              )}

              <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                      title="Supprimer"
                    />
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Supprimer cette voix ?</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-slate-600">
                    La voix <strong>{voice.name}</strong> sera définitivement
                    supprimée. Les agents qui l&apos;utilisent devront être reconfigurés.
                  </p>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setDeleteOpen(false)}
                      disabled={isPending}
                    >
                      Annuler
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isPending}
                    >
                      {isPending ? "Suppression..." : "Supprimer"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/voices/voice-list.tsx
git commit -m "feat: voice list component with delete and share"
```

---

## Task 6: Voices page

**Files:**
- Create: `src/app/(dashboard)/voices/page.tsx`

- [ ] **Step 1: Create voices page**

Create `src/app/(dashboard)/voices/page.tsx`:

```typescript
import { getOrgContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VoiceList } from "@/components/voices/voice-list";

export default async function VoicesPage() {
  const ctx = await getOrgContext();

  const voices = await prisma.clonedVoice.findMany({
    where: {
      OR: [
        ...(ctx.orgId ? [{ orgId: ctx.orgId }] : []),
        { shared: true },
        ...(ctx.isSuperAdmin ? [{}] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  const orgVoiceCount = ctx.orgId
    ? await prisma.clonedVoice.count({ where: { orgId: ctx.orgId } })
    : 0;

  const isAdmin = ctx.userRole === "admin" || ctx.userRole === "super_admin";

  return (
    <VoiceList
      voices={voices}
      orgVoiceCount={orgVoiceCount}
      isAdmin={isAdmin}
      currentOrgId={ctx.orgId}
    />
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/voices/page.tsx
git commit -m "feat: voices page"
```

---

## Task 7: Sidebar — add Voix link

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`

- [ ] **Step 1: Add Voix link to clientLinks**

In `src/components/layout/app-sidebar.tsx`, add `Mic` to the lucide-react imports (it's not already imported), then add a new entry to `clientLinks` after the "Historique appels" entry:

```typescript
{ href: "/voices", label: "Voix clonées", icon: Mic },
```

The `clientLinks` array should have this entry after `{ href: "/calls", ... }` and before `{ href: "/appointments", ... }`.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/app-sidebar.tsx
git commit -m "feat: add Voix clonées link to sidebar"
```

---

## Task 8: Voice selector — add "Mes voix" section

**Files:**
- Modify: `src/components/agents/voice-selector.tsx`

Important patterns to follow:
- base-ui Dialog uses `render` prop (NOT `asChild`)
- The component is `"use client"` — cannot import server actions directly for data fetching
- Cloned voices must be passed as props from a parent server component

- [ ] **Step 1: Add clonedVoices prop to VoiceSelector**

Modify `src/components/agents/voice-selector.tsx`:

1. Add to the `VoiceSelectorProps` interface:

```typescript
interface VoiceSelectorProps {
  value: string;
  provider: string;
  onSelect: (voiceId: string, provider: string) => void;
  clonedVoices?: Array<{
    id: string;
    name: string;
    retellVoiceId: string;
    gender: string;
  }>;
}
```

2. Add `clonedVoices = []` to the destructured props.

3. Add a "Mes voix" tab before the existing provider tabs. In the tabs section, add before the `{providers.map(...)}`:

```tsx
<button
  key="cloned"
  type="button"
  onClick={() => {
    setActiveTab("cloned");
    setSearch("");
    setFilterAccent("all");
    setFilterGender("all");
  }}
  className={cn(
    "whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
    activeTab === "cloned"
      ? "bg-indigo-50 text-indigo-600"
      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
  )}
>
  Mes voix {clonedVoices.length > 0 && `(${clonedVoices.length})`}
</button>
```

4. Update `filteredVoices` to handle the "cloned" tab — when `activeTab === "cloned"`, show cloned voices mapped to the `Voice` interface format:

```typescript
const clonedAsVoices: Voice[] = clonedVoices.map((cv) => ({
  id: cv.retellVoiceId,
  name: cv.name,
  provider: "clone",
  gender: cv.gender as "Male" | "Female",
  accent: "Custom",
  age: "Middle Aged" as const,
}));

const filteredVoices = useMemo(() => {
  if (activeTab === "cloned") {
    return clonedAsVoices.filter((v) => {
      if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterGender !== "all" && v.gender !== filterGender) return false;
      return true;
    });
  }
  return voices.filter((v) => {
    if (v.provider !== activeTab) return false;
    if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterAccent !== "all" && v.accent !== filterAccent) return false;
    if (filterGender !== "all" && v.gender !== filterGender) return false;
    return true;
  });
}, [activeTab, search, filterAccent, filterGender, clonedAsVoices]);
```

5. Update `selectedVoice` to also search cloned voices:

```typescript
const selectedVoice = voices.find((v) => v.id === value)
  || clonedAsVoices.find((v) => v.id === value);
```

6. In the footer, add a link to `/voices` page:

```tsx
<div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
  <div className="flex items-center gap-3">
    <p className="text-[11px] text-slate-400">
      {filteredVoices.length} voix disponibles
    </p>
    <a
      href="/voices"
      className="text-[11px] font-medium text-indigo-500 hover:text-indigo-600"
    >
      Gérer mes voix →
    </a>
  </div>
  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={() => setOpen(false)}
    className="rounded-lg text-[12px]"
  >
    Fermer
  </Button>
</div>
```

- [ ] **Step 2: Pass clonedVoices from parent server components**

Find all places that render `<VoiceSelector>` and pass cloned voices. The main location is `src/components/agents/agent-settings.tsx`. Since this is a client component, the cloned voices should be passed from the page-level server component down through props.

Check `src/app/(dashboard)/agents/[id]/page.tsx` (or equivalent) to add a query for cloned voices and pass them down.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/agents/voice-selector.tsx src/components/agents/agent-settings.tsx
git commit -m "feat: add cloned voices section to voice selector"
```

---

## Task 9: Type-check + integration verification

- [ ] **Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 2: Verify dev server**

Run: `npm run dev`
Navigate to:
- `/voices` — should show empty state with "Cloner une voix" button
- Click "Cloner une voix" — dialog should open with name, gender, file fields
- Check sidebar — "Voix clonées" should appear

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: voice cloning integration fixes"
```
