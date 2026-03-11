import { auth } from "@clerk/nextjs/server";
import { jsPDF } from "jspdf";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

const FRENCH_MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

/** Format centimes to "X,XX €" for PDF display */
function fmtEur(c: number): string {
  return (c / 100).toFixed(2).replace(".", ",") + " €";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // 1. Auth check
  const { userId: clerkId, orgId: clerkOrgId } = await auth();
  if (!clerkId) {
    return new Response(JSON.stringify({ error: "Non authentifié" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Get invoice by id
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { subscription: true },
  });

  if (!invoice) {
    return new Response(JSON.stringify({ error: "Facture introuvable" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Permission check: super_admin OR orgId matches
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    return new Response(JSON.stringify({ error: "Utilisateur introuvable" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const isSuperAdmin = user.role === "super_admin";
  const orgMatches = clerkOrgId && clerkOrgId === invoice.orgId;

  if (!isSuperAdmin && !orgMatches) {
    return new Response(JSON.stringify({ error: "Accès interdit" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 4. Generate PDF
  const { subscription } = invoice;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // --- Header ---
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURE", margin, y + 10);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const invoiceDate = invoice.createdAt.toLocaleDateString("fr-FR");
  doc.text(`N° ${invoice.invoiceNumber}`, pageWidth - margin, y, {
    align: "right",
  });
  doc.text(`Date : ${invoiceDate}`, pageWidth - margin, y + 5, {
    align: "right",
  });

  y += 25;

  // --- Separator ---
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // --- Emitter info (left) ---
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Émetteur", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text("WH Consulting", margin, y);
  y += 5;
  doc.text("SIRET : à définir", margin, y);
  y += 5;
  doc.text("Adresse : à définir", margin, y);

  // --- Client info (right) ---
  let clientY = y - 16;
  doc.setFont("helvetica", "bold");
  doc.text("Client", pageWidth - margin, clientY, { align: "right" });
  clientY += 6;
  doc.setFont("helvetica", "normal");
  doc.text(subscription.companyName, pageWidth - margin, clientY, {
    align: "right",
  });
  clientY += 5;
  if (subscription.companyAddress) {
    doc.text(subscription.companyAddress, pageWidth - margin, clientY, {
      align: "right",
    });
    clientY += 5;
  }
  if (subscription.companySiret) {
    doc.text(
      `SIRET : ${subscription.companySiret}`,
      pageWidth - margin,
      clientY,
      { align: "right" },
    );
    clientY += 5;
  }
  if (subscription.companyVat) {
    doc.text(
      `TVA : ${subscription.companyVat}`,
      pageWidth - margin,
      clientY,
      { align: "right" },
    );
  }

  y += 15;

  // --- Period ---
  const monthName = FRENCH_MONTHS[invoice.periodMonth - 1] ?? "";
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Période : ${monthName} ${invoice.periodYear}`,
    margin,
    y,
  );
  y += 12;

  // --- Table ---
  const colX = {
    desc: margin,
    qty: margin + contentWidth * 0.45,
    unit: margin + contentWidth * 0.6,
    amount: margin + contentWidth * 0.8,
  };

  // Table header
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y - 5, contentWidth, 8, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Description", colX.desc, y);
  doc.text("Quantité", colX.qty, y);
  doc.text("Prix unitaire", colX.unit, y);
  doc.text("Montant HT", colX.amount, y);
  y += 8;

  // Table separator
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y - 3, pageWidth - margin, y - 3);

  // Row 1: Subscription
  doc.setFont("helvetica", "normal");
  doc.text("Abonnement mensuel", colX.desc, y);
  doc.text("1", colX.qty, y);
  doc.text(fmtEur(subscription.monthlyPrice), colX.unit, y);
  doc.text(fmtEur(invoice.subscriptionAmount), colX.amount, y);
  y += 7;

  // Row 2: Minutes
  const totalMinutes = Math.ceil(invoice.minutesUsed / 60);
  doc.text("Minutes d'appel", colX.desc, y);
  doc.text(`${totalMinutes} min`, colX.qty, y);
  doc.text(fmtEur(subscription.pricePerMinute), colX.unit, y);
  doc.text(fmtEur(invoice.minutesAmount), colX.amount, y);
  y += 5;

  // Table bottom separator
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  // --- Totals (right-aligned) ---
  const totalsX = pageWidth - margin - 60;
  const totalsValX = pageWidth - margin;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Total HT :", totalsX, y);
  doc.text(fmtEur(invoice.totalHT), totalsValX, y, { align: "right" });
  y += 6;

  const tvaPercent = (invoice.tvaRate / 100).toFixed(2).replace(".", ",");
  doc.text(`TVA ${tvaPercent}% :`, totalsX, y);
  doc.text(fmtEur(invoice.tvaAmount), totalsValX, y, { align: "right" });
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total TTC :", totalsX, y);
  doc.text(fmtEur(invoice.totalTTC), totalsValX, y, { align: "right" });

  // --- Footer ---
  const footerY = doc.internal.pageSize.getHeight() - margin;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(130, 130, 130);
  doc.text("Merci pour votre confiance.", margin, footerY - 10);
  doc.text(
    "WH Consulting — SIRET : à définir — TVA non applicable, art. 293 B du CGI",
    margin,
    footerY - 5,
  );

  // 5. Return PDF response
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
    },
  });
}
