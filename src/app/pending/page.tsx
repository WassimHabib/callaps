import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { Clock, Mail } from "lucide-react";
import Link from "next/link";

export default async function PendingPage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) redirect("/sign-in");

  // Find or create user in DB
  let user = await prisma.user.findUnique({ where: { clerkId } });

  if (!user) {
    const clerkUser = await currentUser();
    if (!clerkUser) redirect("/sign-in");

    user = await prisma.user.upsert({
      where: { clerkId },
      create: {
        clerkId,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || "Utilisateur",
        role: "client",
        approved: false,
      },
      update: {},
    });
  }

  // Already approved → dashboard
  if (user.approved) redirect("/dashboard");
  if (user.role === "super_admin") redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="mx-4 w-full max-w-md text-center">
        <Image
          src="/logo-light.png"
          alt="Callaps"
          width={200}
          height={60}
          className="mx-auto object-contain"
          priority
        />

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>

          <h1 className="mt-6 text-xl font-semibold text-slate-900">
            Compte en attente de validation
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Votre inscription a bien été prise en compte. Un administrateur
            validera votre compte dans les plus brefs délais.
          </p>

          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
              <Mail className="h-4 w-4 shrink-0" />
              <span>Vous serez notifié une fois votre compte activé.</span>
            </div>
          </div>

          <Link
            href="/sign-in"
            className="mt-6 inline-block rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Retour à la connexion
          </Link>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          Un problème ? Contactez-nous à support@callaps.ai
        </p>
      </div>
    </div>
  );
}
