import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCampaign } from "../actions";
import { Megaphone } from "lucide-react";

export default async function NewCampaignPage() {
  const clerkId = await requireAuth();
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  const agents = await prisma.agent.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <Header title="Nouvelle campagne" description="Configurez votre campagne d'appels" />
      <div className="mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Megaphone className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Nouvelle campagne</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form action={createCampaign} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de la campagne</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ex: Relance clients Q1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Objectif de la campagne..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentId">Agent IA</Label>
                {agents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Vous devez d'abord créer un agent IA avant de lancer une campagne.
                  </p>
                ) : (
                  <Select name="agentId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="submit" size="lg" disabled={agents.length === 0}>
                  Créer la campagne
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
