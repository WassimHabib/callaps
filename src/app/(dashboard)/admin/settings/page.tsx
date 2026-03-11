import { requireSuperAdmin, getOrgContext } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { Shield, Database, Users, Bot, Megaphone, Phone } from "lucide-react";

export default async function AdminSettingsPage() {
  await requireSuperAdmin();
  const ctx = await getOrgContext();

  const [userCount, agentCount, campaignCount, callCount] = await Promise.all([
    prisma.user.count(),
    prisma.agent.count(),
    prisma.campaign.count(),
    prisma.call.count(),
  ]);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header
        title="Paramètres"
        description="Configuration de la plateforme"
      />
      <div className="space-y-6 p-8">
        {/* Admin info */}
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/20">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {ctx.userName}
                </h3>
                <p className="text-sm text-slate-500">
                  Rôle :{" "}
                  <span className="font-medium text-indigo-600">
                    {ctx.userRole === "super_admin"
                      ? "Super Administrateur"
                      : "Administrateur"}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform overview */}
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Vue d&apos;ensemble de la plateforme
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 bg-white shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {userCount}
                  </p>
                  <p className="text-xs text-slate-500">Utilisateurs</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                  <Bot className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {agentCount}
                  </p>
                  <p className="text-xs text-slate-500">Agents IA</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                  <Megaphone className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {campaignCount}
                  </p>
                  <p className="text-xs text-slate-500">Campagnes</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 bg-white shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                  <Phone className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {callCount.toLocaleString("fr-FR")}
                  </p>
                  <p className="text-xs text-slate-500">Appels totaux</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Database info */}
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                <Database className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">
                  Base de données
                </h3>
                <p className="text-sm text-slate-500">
                  PostgreSQL sur Neon (driver serverless)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
