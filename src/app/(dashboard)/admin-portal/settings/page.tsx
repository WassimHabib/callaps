import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdminPortal } from "@/lib/admin-access";

export default async function AdminPortalSettingsPage() {
  const ctx = await requireAdminPortal();

  return (
    <>
      <Header title="Paramètres" description="Configuration de votre espace admin" />
      <div className="p-8">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-slate-900">Profil</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium text-slate-400">Nom</p>
                <p className="mt-0.5 text-slate-700">{ctx.userName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Rôle</p>
                <p className="mt-0.5 text-slate-700">{ctx.userRole === "super_admin" ? "Super Admin" : "Administrateur"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
