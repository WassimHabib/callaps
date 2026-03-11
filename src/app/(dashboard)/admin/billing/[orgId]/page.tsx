import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getCurrentMonthUsage } from "@/lib/billing";
import { OrgBillingDetail } from "./org-billing-detail";

async function requireSuperAdmin() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const user = await prisma.user.findFirst({ where: { clerkId: userId } });
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

  const [subscription, invoices, usage] = await Promise.all([
    prisma.subscription.findUnique({ where: { orgId } }),
    prisma.invoice.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    }),
    getCurrentMonthUsage(orgId),
  ]);

  const clerk = await clerkClient();
  const org = await clerk.organizations.getOrganization({
    organizationId: orgId,
  });

  return (
    <OrgBillingDetail
      orgId={orgId}
      orgName={org.name}
      subscription={JSON.parse(JSON.stringify(subscription))}
      invoices={JSON.parse(JSON.stringify(invoices))}
      usage={usage}
    />
  );
}
