import { getOrgContext, orgFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Globe, Webhook, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const availableIntegrations = [
  {
    type: "google_calendar",
    name: "Google Calendar",
    description: "Synchronisez les RDV pris par vos agents avec Google Calendar",
    icon: Calendar,
    gradient: "from-blue-500 to-cyan-400",
    shadow: "shadow-blue-500/20",
    available: false,
  },
  {
    type: "webhook",
    name: "Webhooks",
    description: "Recevez les événements en temps réel sur votre serveur",
    icon: Webhook,
    gradient: "from-indigo-500 to-violet-400",
    shadow: "shadow-indigo-500/20",
    available: true,
  },
  {
    type: "zapier",
    name: "Zapier / Make",
    description: "Connectez vos agents à des milliers d'applications",
    icon: Globe,
    gradient: "from-amber-500 to-orange-400",
    shadow: "shadow-amber-500/20",
    available: false,
  },
];

export default async function IntegrationsPage() {
  const ctx = await getOrgContext();

  const userIntegrations = await prisma.integration.findMany({
    where: { userId: ctx.userId },
  });

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header title="Intégrations" description="Connectez vos outils" />
      <div className="p-8">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {availableIntegrations.map((integration) => {
            const Icon = integration.icon;
            const isConnected = userIntegrations.some(
              (ui) => ui.type === integration.type
            );
            return (
              <Card
                key={integration.type}
                className="group border-0 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${integration.gradient} shadow-lg ${integration.shadow}`}
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {integration.name}
                        </h3>
                      </div>
                    </div>
                    {isConnected ? (
                      <Badge className="rounded-lg border-0 bg-emerald-50 text-[11px] font-medium text-emerald-600">
                        Connecté
                      </Badge>
                    ) : !integration.available ? (
                      <Badge className="rounded-lg border-0 bg-slate-100 text-[11px] font-medium text-slate-500">
                        Bientôt
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm text-slate-500">
                    {integration.description}
                  </p>
                  {integration.available && !isConnected && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 rounded-lg border-slate-200"
                    >
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
