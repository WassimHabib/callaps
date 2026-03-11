"use client";

import { useState, useTransition, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Upload,
  Contact2,
  Phone,
  Mail,
  Building2,
  Tag,
  X,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  createContact,
  importContactsCSV,
  fetchContacts,
} from "@/app/(dashboard)/contacts/actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ContactItem = Awaited<ReturnType<typeof fetchContacts>>[number];

interface ContactsClientProps {
  initialContacts: ContactItem[];
  allTags: string[];
}

// ---------------------------------------------------------------------------
// Score helpers
// ---------------------------------------------------------------------------
function scoreBadge(score: number | null, label: string | null) {
  if (score === null && !label) return null;

  const l = (label || "").toLowerCase();
  if (l === "hot" || (score !== null && score >= 80)) {
    return (
      <Badge className="border-0 bg-red-50 text-red-600 text-[11px]">
        Hot
      </Badge>
    );
  }
  if (l === "warm" || (score !== null && score >= 50)) {
    return (
      <Badge className="border-0 bg-amber-50 text-amber-600 text-[11px]">
        Warm
      </Badge>
    );
  }
  return (
    <Badge className="border-0 bg-blue-50 text-blue-600 text-[11px]">
      Cold
    </Badge>
  );
}

function formatDate(d: Date | string | null) {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// CSV Parser
// ---------------------------------------------------------------------------
function parseCSV(text: string): { name: string; phone: string; email?: string; company?: string }[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0].toLowerCase();
  const separator = headerLine.includes(";") ? ";" : ",";
  const headers = headerLine.split(separator).map((h) => h.trim().replace(/^["']|["']$/g, ""));

  // Map common column names
  const nameIdx = headers.findIndex((h) =>
    ["name", "nom", "prenom", "prénom", "full_name", "fullname", "contact"].includes(h)
  );
  const phoneIdx = headers.findIndex((h) =>
    ["phone", "telephone", "téléphone", "tel", "mobile", "numero", "numéro", "phone_number"].includes(h)
  );
  const emailIdx = headers.findIndex((h) =>
    ["email", "e-mail", "mail", "courriel"].includes(h)
  );
  const companyIdx = headers.findIndex((h) =>
    ["company", "entreprise", "société", "societe", "organization", "organisation"].includes(h)
  );

  if (phoneIdx === -1) return [];

  const results: { name: string; phone: string; email?: string; company?: string }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(separator).map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const phone = cols[phoneIdx]?.trim();
    if (!phone) continue;

    results.push({
      name: nameIdx >= 0 ? (cols[nameIdx] || "Inconnu") : "Inconnu",
      phone,
      email: emailIdx >= 0 ? cols[emailIdx] || undefined : undefined,
      company: companyIdx >= 0 ? cols[companyIdx] || undefined : undefined,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ContactsClient({ initialContacts, allTags }: ContactsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [contacts] = useState(initialContacts);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formTags, setFormTags] = useState("");

  // Import dialog
  const [importOpen, setImportOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<
    { name: string; phone: string; email?: string; company?: string }[]
  >([]);
  const [importResult, setImportResult] = useState<{ imported: number } | null>(null);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Client-side filtering
  const filtered = useMemo(() => {
    let result = contacts;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.phone.toLowerCase().includes(s) ||
          (c.email && c.email.toLowerCase().includes(s)) ||
          (c.company && c.company.toLowerCase().includes(s))
      );
    }
    if (tagFilter) {
      result = result.filter((c) => c.tags.includes(tagFilter));
    }
    return result;
  }, [contacts, search, tagFilter]);

  // Create contact handler
  const handleCreate = useCallback(() => {
    if (!formName.trim() || !formPhone.trim()) return;
    startTransition(async () => {
      try {
        await createContact({
          name: formName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim() || undefined,
          company: formCompany.trim() || undefined,
          tags: formTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        });
        setCreateOpen(false);
        setFormName("");
        setFormPhone("");
        setFormEmail("");
        setFormCompany("");
        setFormTags("");
        router.refresh();
      } catch (err) {
        console.error("Erreur création contact:", err);
      }
    });
  }, [formName, formPhone, formEmail, formCompany, formTags, router, startTransition]);

  // CSV file handler
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImportError("");
      setImportResult(null);

      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setImportError(
            "Fichier invalide. Assurez-vous que le CSV contient au moins une colonne 'phone' ou 'téléphone'."
          );
          setCsvPreview([]);
          return;
        }
        setCsvPreview(parsed);
      };
      reader.readAsText(file);
    },
    []
  );

  // Import handler
  const handleImport = useCallback(() => {
    if (csvPreview.length === 0) return;
    startTransition(async () => {
      try {
        const result = await importContactsCSV(csvPreview);
        setImportResult(result);
        setCsvPreview([]);
        router.refresh();
      } catch (err) {
        setImportError(err instanceof Error ? err.message : "Erreur lors de l'import");
      }
    });
  }, [csvPreview, router, startTransition]);

  return (
    <>
      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Rechercher un contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72 pl-9"
            />
          </div>
          {allTags.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="h-8 rounded-lg border border-input bg-transparent px-3 text-sm text-slate-700 outline-none"
              >
                <option value="">Tous les tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
              {tagFilter && (
                <button
                  onClick={() => setTagFilter("")}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          <p className="text-sm text-slate-500">
            {filtered.length} contact{filtered.length > 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setImportOpen(true);
              setImportResult(null);
              setImportError("");
              setCsvPreview([]);
            }}
          >
            <Upload className="mr-2 h-4 w-4" />
            Importer CSV
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25"
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un contact
          </Button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25">
            <Contact2 className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">
            Aucun contact
          </h3>
          <p className="mb-6 mt-1 max-w-sm text-center text-sm text-slate-500">
            Ajoutez votre premier contact ou importez-les depuis un fichier CSV.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setImportOpen(true);
                setImportResult(null);
                setImportError("");
                setCsvPreview([]);
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              Importer CSV
            </Button>
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25"
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un contact
            </Button>
          </div>
        </div>
      ) : (
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead className="text-xs font-medium text-slate-500">
                    Nom
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">
                    Téléphone
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">
                    Email
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">
                    Entreprise
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">
                    Tags
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 text-center">
                    Appels
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 text-center">
                    Score
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">
                    Dernière interaction
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((contact) => (
                  <TableRow
                    key={contact.id}
                    className="cursor-pointer border-slate-50 transition-colors hover:bg-slate-50/80"
                  >
                    <TableCell>
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="flex items-center gap-2 font-medium text-slate-900 hover:text-indigo-600"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-xs font-bold text-indigo-600">
                          {contact.name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        {contact.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {contact.phone}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {contact.email ? (
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {contact.email}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {contact.company ? (
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          {contact.company}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.length > 0 ? (
                          contact.tags.slice(0, 3).map((tag) => (
                            <Badge
                              key={tag}
                              className="border-0 bg-slate-100 text-slate-600 text-[10px] font-normal"
                            >
                              <Tag className="mr-1 h-2.5 w-2.5" />
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                        {contact.tags.length > 3 && (
                          <Badge className="border-0 bg-slate-100 text-slate-500 text-[10px] font-normal">
                            +{contact.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm text-slate-600">
                      {contact._count.calls}
                    </TableCell>
                    <TableCell className="text-center">
                      {scoreBadge(contact.score, contact.scoreLabel)}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {formatDate(contact.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Contact Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un contact</DialogTitle>
            <DialogDescription>
              Renseignez les informations du nouveau contact.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="create-name">Nom *</Label>
              <Input
                id="create-name"
                placeholder="Jean Dupont"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-phone">Téléphone *</Label>
              <Input
                id="create-phone"
                placeholder="+33 6 12 34 56 78"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="jean@entreprise.fr"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-company">Entreprise</Label>
              <Input
                id="create-company"
                placeholder="Nom de l'entreprise"
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-tags">Tags (séparés par des virgules)</Label>
              <Input
                id="create-tags"
                placeholder="prospect, paris, tech"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isPending || !formName.trim() || !formPhone.trim()}
              className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
            >
              {isPending ? "Création..." : "Créer le contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Importer des contacts</DialogTitle>
            <DialogDescription>
              Importez vos contacts depuis un fichier CSV. Le fichier doit contenir au minimum une
              colonne &quot;phone&quot; ou &quot;téléphone&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* File upload */}
            <div className="grid gap-2">
              <Label>Fichier CSV</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-6 py-8 transition-colors hover:border-indigo-300 hover:bg-indigo-50/30"
              >
                <FileSpreadsheet className="h-8 w-8 text-slate-400" />
                <p className="text-sm text-slate-500">
                  Cliquez pour sélectionner un fichier CSV
                </p>
                <p className="text-xs text-slate-400">
                  Colonnes acceptées : Name/Nom, Phone/Téléphone, Email, Company/Entreprise
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Error */}
            {importError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {importError}
              </div>
            )}

            {/* Success */}
            {importResult && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {importResult.imported} contact{importResult.imported > 1 ? "s" : ""} importé
                {importResult.imported > 1 ? "s" : ""} avec succès.
              </div>
            )}

            {/* Preview */}
            {csvPreview.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">
                  Aperçu ({csvPreview.length} contact{csvPreview.length > 1 ? "s" : ""})
                </p>
                <div className="max-h-48 overflow-auto rounded-lg border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-100">
                        <TableHead className="text-xs">Nom</TableHead>
                        <TableHead className="text-xs">Téléphone</TableHead>
                        <TableHead className="text-xs">Email</TableHead>
                        <TableHead className="text-xs">Entreprise</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvPreview.slice(0, 10).map((c, i) => (
                        <TableRow key={i} className="border-slate-50">
                          <TableCell className="text-xs">{c.name}</TableCell>
                          <TableCell className="text-xs">{c.phone}</TableCell>
                          <TableCell className="text-xs">{c.email || "—"}</TableCell>
                          <TableCell className="text-xs">{c.company || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {csvPreview.length > 10 && (
                    <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-400">
                      ... et {csvPreview.length - 10} autres contacts
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Fermer
            </Button>
            {csvPreview.length > 0 && !importResult && (
              <Button
                onClick={handleImport}
                disabled={isPending}
                className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
              >
                {isPending
                  ? "Import en cours..."
                  : `Importer ${csvPreview.length} contact${csvPreview.length > 1 ? "s" : ""}`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
