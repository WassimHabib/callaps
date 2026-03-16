"use server";

import { getOrgContext } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { generateWeeklyReportForOrg } from "@/lib/weekly-report";
import { revalidatePath } from "next/cache";

export async function triggerWeeklyReport(): Promise<{
  success: boolean;
  message: string;
}> {
  const ctx = await getOrgContext();
  if (!hasPermission(ctx.role, "analytics:read")) {
    throw new Error("Permission denied");
  }

  const orgId = ctx.orgId || ctx.userId;

  try {
    const report = await generateWeeklyReportForOrg(orgId);
    if (!report) {
      return {
        success: false,
        message:
          "Aucun appel la semaine dernière — impossible de générer un bilan.",
      };
    }

    revalidatePath("/insights");
    return {
      success: true,
      message: "Bilan hebdomadaire généré avec succès !",
    };
  } catch (error) {
    console.error("[triggerWeeklyReport]", error);
    return {
      success: false,
      message: `Erreur lors de la génération : ${String(error).replace("Error: ", "")}`,
    };
  }
}
