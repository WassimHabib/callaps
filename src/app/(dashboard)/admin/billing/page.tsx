import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BillingAdmin } from "./billing-admin";

async function requireSuperAdmin() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const user = await prisma.user.findFirst({ where: { clerkId: userId } });
  if (!user || user.role !== "super_admin") redirect("/dashboard");
  return user;
}

export default async function AdminBillingPage() {
  await requireSuperAdmin();

  const [subscriptions, invoices] = await Promise.all([
    prisma.subscription.findMany({
      include: { _count: { select: { invoices: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.findMany({
      include: { subscription: { select: { companyName: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const { clerkClient } = await import("@clerk/nextjs/server");
  const clerk = await clerkClient();
  const orgsResponse = await clerk.organizations.getOrganizationList({ limit: 100 });
  const organizations = orgsResponse.data.map((o) => ({ id: o.id, name: o.name }));

  return (
    <BillingAdmin
      subscriptions={JSON.parse(JSON.stringify(subscriptions))}
      invoices={JSON.parse(JSON.stringify(invoices))}
      organizations={organizations}
    />
  );
}
