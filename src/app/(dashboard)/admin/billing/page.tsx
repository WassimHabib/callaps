import { verifySession } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BillingAdmin } from "./billing-admin";

async function requireSuperAdmin() {
  const session = await verifySession();
  if (!session) redirect("/sign-in");
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
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

  const organizations = await prisma.user.findMany({
    where: { approved: true, role: { in: ["client", "admin"] } },
    select: { id: true, name: true, company: true },
    orderBy: { name: "asc" },
  });

  return (
    <BillingAdmin
      subscriptions={JSON.parse(JSON.stringify(subscriptions))}
      invoices={JSON.parse(JSON.stringify(invoices))}
      organizations={organizations.map((u) => ({ id: u.id, name: u.company ?? u.name }))}
    />
  );
}
