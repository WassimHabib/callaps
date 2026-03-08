import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Plus, Settings } from "lucide-react";
import Link from "next/link";

export default async function AgentsPage() {
  const clerkId = await requireAuth();
  const user = await prisma.user.findUnique({ where: { clerkId } });

  if (!user) {
    return (
      <div>
        <Header title="Agents IA" />
        <div className="flex items-center justify-center p-12">
          <p className="text-muted-foreground">Compte en cours de configuration...</p>
        </div>
      </div>
    );
  }

  const agents = await prisma.agent.findMany({
    where: { userId: user.id },
    include: { _count: { select: { campaigns: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <Header title="Agents IA" description="Configurez vos agents d'appels intelligents" />
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {agents.length} agent{agents.length > 1 ? "s" : ""}
          </p>
          <Link href="/agents/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouvel agent
            </Button>
          </Link>
        </div>

        {agents.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Aucun agent</h3>
            <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
              Créez votre premier agent IA pour commencer à lancer des campagnes d'appels.
            </p>
            <Link href="/agents/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Créer un agent
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Card
                key={agent.id}
                className="transition-all duration-200 hover:shadow-md"
              >
                <CardHeader className="flex flex-row items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {agent.language}
                      </p>
                    </div>
                  </div>
                  <Link href={`/agents/${agent.id}`}>
                    <Button variant="ghost" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {agent.description && (
                    <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                      {agent.description}
                    </p>
                  )}
                  <Badge variant="secondary">
                    {agent._count.campaigns} campagne
                    {agent._count.campaigns > 1 ? "s" : ""}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
