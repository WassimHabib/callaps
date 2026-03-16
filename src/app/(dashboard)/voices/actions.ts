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
        ...(ctx.orgId ? [{ orgId: ctx.orgId }] : []),
        { shared: true },
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

  const isOwner = ctx.orgId === voice.orgId;
  const isAdmin = ctx.userRole === "admin" || ctx.userRole === "super_admin";
  if (!isOwner && !isAdmin) throw new Error("Non autorisé");

  await deleteVoice(voice.retellVoiceId);
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
