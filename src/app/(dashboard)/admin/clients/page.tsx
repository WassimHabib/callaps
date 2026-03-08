import { requireAdmin } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function AdminClientsPage() {
  await requireAdmin();

  const clients = await prisma.user.findMany({
    where: { role: "client" },
    include: {
      _count: { select: { campaigns: true, agents: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <Header title="Clients" description="Gestion des comptes clients" />
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {clients.length} client{clients.length > 1 ? "s" : ""}
          </p>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau client
          </Button>
        </div>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead>Agents</TableHead>
                <TableHead>Campagnes</TableHead>
                <TableHead>Inscription</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Aucun client pour le moment
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.company || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {client._count.agents}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {client._count.campaigns}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.createdAt.toLocaleDateString("fr-FR")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
