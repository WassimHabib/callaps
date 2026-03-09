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
import { Building2, Users } from "lucide-react";
import { getOrganizationMembers } from "../actions";
import { clerkClient } from "@clerk/nextjs/server";
import { OrgMemberActions } from "@/components/admin/org-member-actions";
import { AddMemberForm } from "@/components/admin/add-member-form";
import { DeleteOrgButton } from "@/components/admin/delete-org-button";

const ROLE_LABELS: Record<string, string> = {
  "org:admin": "Admin",
  "org:org_admin": "Admin",
  "org:manager": "Manager",
  "org:operator": "Opérateur",
  "org:viewer": "Lecteur",
  "org:member": "Membre",
};

export default async function OrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: id });
  const members = await getOrganizationMembers(id);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header
        title={org.name}
        description={`Organisation · ${members.length} membre${members.length > 1 ? "s" : ""}`}
      />
      <div className="p-6">
        {/* Stats */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card className="border-0 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                <Building2 className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{org.name}</p>
                <p className="text-xs text-slate-400">{org.slug || "—"}</p>
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
                  {members.length}
                </p>
                <p className="text-xs text-slate-500">Membres</p>
              </div>
            </div>
          </Card>
          <Card className="border-0 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <p className="text-xs text-slate-400">
                Créée le{" "}
                {new Date(org.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="mt-3">
              <DeleteOrgButton orgId={id} orgName={org.name} />
            </div>
          </Card>
        </div>

        {/* Add member */}
        <Card className="mb-6 border-0 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            Ajouter un membre
          </h3>
          <AddMemberForm orgId={id} />
        </Card>

        {/* Members table */}
        <Card className="border-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-500">
                  Membre
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500">
                  Rôle
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500">
                  Ajouté le
                </TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-500">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-12 text-center text-sm text-slate-400"
                  >
                    Aucun membre
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.id} className="group">
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-xs text-slate-400">{member.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="border-0 bg-indigo-50 text-xs font-semibold text-indigo-600">
                        {ROLE_LABELS[member.role] || member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-400">
                        {new Date(member.createdAt).toLocaleDateString(
                          "fr-FR",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <OrgMemberActions
                        orgId={id}
                        userId={member.userId}
                        currentRole={member.role}
                        memberName={`${member.firstName} ${member.lastName}`}
                      />
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
