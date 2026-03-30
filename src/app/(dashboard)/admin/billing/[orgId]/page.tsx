import { verifySession } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getCurrentMonthUsage } from "@/lib/billing";
import { OrgBillingDetail } from "./org-billing-detail";

async function requireSuperAdmin() {
  const session = await verifySession();
  if (!session) redirect("/sign-in");
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.role !== "super_admin") redirect("/dashboard");
  return user;
}

export default async function OrgBillingPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  await requireSuperAdmin();

  const { orgId } = await params;

  const [subscription, invoices, usage, orgUser] = await Promise.all([
    prisma.subscription.findUnique({ where: { orgId } }),
    prisma.invoice.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    }),
    getCurrentMonthUsage(orgId),
    prisma.user.findUnique({
      where: { id: orgId },
      select: { name: true, company: true },
    }),
  ]);

  const orgName = orgUser?.company ?? orgUser?.name ?? orgId;

  return (
    <OrgBillingDetail
      orgId={orgId}
      orgName={orgName}
      subscription={JSON.parse(JSON.stringify(subscription))}
      invoices={JSON.parse(JSON.stringify(invoices))}
      usage={usage}
    />
  );
}
