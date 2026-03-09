import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, User } from "lucide-react";

export default async function SettingsPage() {
  const clerkId = await requireAuth();
  const user = await prisma.user.findUnique({ where: { clerkId } });

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header title="Paramètres" description="Gérez votre compte" />
      <div className="mx-auto max-w-2xl space-y-6 p-8">
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="p-8">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg shadow-slate-500/20">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Informations du compte
                </h2>
                <p className="text-sm text-slate-500">
                  Vos informations personnelles
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[13px] font-medium text-slate-700">Nom</Label>
                <Input
                  defaultValue={user?.name ?? ""}
                  disabled
                  className="h-11 rounded-xl border-slate-200 bg-slate-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-medium text-slate-700">Email</Label>
                <Input
                  defaultValue={user?.email ?? ""}
                  disabled
                  className="h-11 rounded-xl border-slate-200 bg-slate-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-medium text-slate-700">Entreprise</Label>
                <Input
                  defaultValue={user?.company ?? ""}
                  disabled
                  className="h-11 rounded-xl border-slate-200 bg-slate-50"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 rounded-xl bg-slate-50 p-4">
              <Settings className="h-4 w-4 text-slate-400" />
              <p className="text-[12px] text-slate-500">
                Pour modifier vos informations, contactez votre administrateur.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
