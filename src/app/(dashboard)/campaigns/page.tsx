import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Plus, Bot, Users } from "lucide-react";
import Link from "next/link";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Brouillon", variant: "secondary" },
  scheduled: { label: "Planifiée", variant: "outline" },
  running: { label: "En cours", variant: "default" },
  paused: { label: "En pause", variant: "secondary" },
  completed: { label: "Terminée", variant: "outline" },
};

export default async function CampaignsPage() {
  const clerkId = await requireAuth();
  const user = await prisma.user.findUnique({ where: { clerkId } });

  if (!user) {
    return (
      <div>
        <Header title="Campagnes" />
        <div className="flex items-center justify-center p-12">
          <p className="text-muted-foreground">Compte en cours de configuration...</p>
        </div>
      </div>
    );
  }

  const campaigns = await prisma.campaign.findMany({
    where: { userId: user.id },
    include: {
      agent: { select: { name: true } },
      _count: { select: { contacts: true, calls: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <Header title="Campagnes" description="Gérez vos campagnes d'appels" />
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {campaigns.length} campagne{campaigns.length > 1 ? "s" : ""}
          </p>
          <Link href="/campaigns/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle campagne
            </Button>
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <Megaphone className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Aucune campagne</h3>
            <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
              Créez votre première campagne pour commencer à appeler vos contacts.
            </p>
            <Link href="/campaigns/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Créer une campagne
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => {
              const status = statusLabels[campaign.status] ?? statusLabels.draft;
              return (
                <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
                  <Card className="h-full transition-all duration-200 hover:shadow-md">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">
                          {campaign.name}
                        </CardTitle>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {campaign.description && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {campaign.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Bot className="h-3 w-3" />
                          {campaign.agent.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {campaign._count.contacts} contacts
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
