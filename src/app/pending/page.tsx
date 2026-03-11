import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { Clock, Shield, Headphones } from "lucide-react";
import { SignOutBtn } from "./sign-out-button";

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

  if (user.approved) redirect("/dashboard");
  if (user.role === "super_admin") redirect("/dashboard");

  const firstName = user.name.split(" ")[0];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Decorative background */}
      <div className="absolute -left-40 top-1/4 h-80 w-80 rounded-full bg-indigo-100/40 blur-3xl" />
      <div className="absolute -right-40 bottom-1/4 h-80 w-80 rounded-full bg-violet-100/30 blur-3xl" />

      <div className="relative z-10 mx-4 w-full max-w-lg">
        {/* Logo */}
        <div className="mb-10 flex justify-center">
          <Image
            src="/logo-light.png"
            alt="Callaps"
            width={180}
            height={54}
            className="object-contain"
            priority
          />
        </div>

        {/* Main card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-10 shadow-xl shadow-slate-200/50">
          {/* Animated clock icon */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm">
            <Clock className="h-10 w-10 text-amber-500" />
          </div>

          <h1 className="mt-8 text-center text-2xl font-bold text-slate-900">
            Bienvenue {firstName} !
          </h1>

          <p className="mt-2 text-center text-base text-slate-500">
            Votre compte est en cours de validation.
          </p>

          {/* Status steps */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-4 rounded-2xl bg-emerald-50/80 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-900">Inscription réussie</p>
                <p className="text-xs text-emerald-600">Votre compte a bien été créé</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl bg-amber-50/80 p-4 ring-1 ring-amber-200/50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                <Shield className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">Validation en cours</p>
                <p className="text-xs text-amber-600">Un administrateur vérifie votre demande</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 opacity-40">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                <Headphones className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Accès à la plateforme</p>
                <p className="text-xs text-slate-400">Créez vos agents IA et lancez vos campagnes</p>
              </div>
            </div>
          </div>

          {/* Sign out */}
          <div className="mt-8">
            <SignOutBtn />
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-400">
          Besoin d&apos;aide ? Contactez-nous à{" "}
          <a href="mailto:support@callaps.ai" className="text-indigo-500 hover:underline">
            support@callaps.ai
          </a>
        </p>
      </div>
    </div>
  );
}
