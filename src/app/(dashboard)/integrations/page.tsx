import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Globe, Webhook, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const availableIntegrations = [
  {
    type: "google_calendar",
    name: "Google Calendar",
    description: "Synchronisez les RDV pris par vos agents avec Google Calendar",
    icon: Calendar,
    available: false,
  },
  {
    type: "webhook",
    name: "Webhooks",
    description: "Recevez les événements en temps réel sur votre serveur",
    icon: Webhook,
    available: true,
  },
  {
    type: "zapier",
    name: "Zapier / Make",
    description: "Connectez vos agents à des milliers d'applications",
    icon: Globe,
    available: false,
  },
];

export default async function IntegrationsPage() {
  const clerkId = await requireAuth();
  const user = await prisma.user.findUnique({ where: { clerkId } });

  if (!user) {
    return (
      <div>
        <Header title="Intégrations" />
        <div className="flex items-center justify-center p-12">
          <p className="text-muted-foreground">Compte en cours de configuration...</p>
        </div>
      </div>
    );
  }

  const userIntegrations = await prisma.integration.findMany({
    where: { userId: user.id },
  });

  return (
    <div>
      <Header title="Intégrations" description="Connectez vos outils" />
      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {availableIntegrations.map((integration) => {
            const Icon = integration.icon;
            const isConnected = userIntegrations.some(
              (ui) => ui.type === integration.type
            );
            return (
              <Card
                key={integration.type}
                className="transition-shadow duration-200 hover:shadow-md"
              >
                <CardHeader className="flex flex-row items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {integration.name}
                      </CardTitle>
                    </div>
                  </div>
                  {isConnected ? (
                    <Badge>Connecté</Badge>
                  ) : !integration.available ? (
                    <Badge variant="secondary">Bientôt</Badge>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {integration.description}
                  </p>
                  {integration.available && !isConnected && (
                    <Button variant="outline" size="sm">
                      <Plus className="mr-2 h-3 w-3" />
                      Configurer
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
