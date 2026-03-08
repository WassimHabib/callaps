import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

export default async function SettingsPage() {
  const clerkId = await requireAuth();
  const user = await prisma.user.findUnique({ where: { clerkId } });

  return (
    <div>
      <Header title="Paramètres" description="Gérez votre compte" />
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Informations du compte</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input defaultValue={user?.name ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input defaultValue={user?.email ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Entreprise</Label>
              <Input defaultValue={user?.company ?? ""} disabled />
            </div>
            <p className="text-xs text-muted-foreground">
              Pour modifier vos informations, contactez votre administrateur.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
