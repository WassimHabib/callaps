import { requireAdmin } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Users, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getOrganizations } from "./actions";
import { CreateOrgForm } from "@/components/admin/create-org-form";

export default async function AdminOrganizationsPage() {
  await requireAdmin();
  const organizations = await getOrganizations();

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header
        title="Organisations"
        description="Créez et gérez les organisations clients"
      />
      <div className="p-6">
        {/* Stats + Create */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-0 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                  <Building2 className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {organizations.length}
                  </p>
                  <p className="text-xs text-slate-500">Organisations</p>
                </div>
              </div>
            </Card>
            <Card className="border-0 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {organizations.reduce(
                      (sum, o) => sum + (o.membersCount ?? 0),
                      0
                    )}
                  </p>
                  <p className="text-xs text-slate-500">Membres au total</p>
                </div>
              </div>
            </Card>
          </div>

          <CreateOrgForm />
        </div>

        {/* Table */}
        <Card className="border-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-500">
                  Organisation
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500">
                  Slug
                </TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-500">
                  Membres
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500">
                  Créée le
                </TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-500">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-sm text-slate-400"
                  >
                    Aucune organisation. Créez-en une pour commencer.
                  </TableCell>
                </TableRow>
              ) : (
                organizations.map((org) => (
                  <TableRow key={org.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                          <Building2 className="h-4 w-4 text-violet-600" />
                        </div>
                        <p className="text-sm font-medium text-slate-900">
                          {org.name}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-500">
                        {org.slug || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="border-0 bg-blue-50 text-xs font-semibold text-blue-600">
                        {org.membersCount ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-400">
                        {new Date(org.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/organizations/${org.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg text-xs opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          Gérer
                        </Button>
                      </Link>
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
