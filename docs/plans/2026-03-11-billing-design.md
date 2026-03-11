# Système de Facturation Callaps — Design

## Objectif

Permettre au super_admin de gérer les abonnements clients (montant mensuel + prix/minute) et de générer des factures conformes. Les clients voient leurs factures et consommation, et téléchargent les PDF.

## Décisions

- **Paiement** : facturation manuelle (pas de Stripe pour l'instant)
- **Cycle** : mensuel classique (1er au dernier jour du mois)
- **Mois offert** : le commercial choisit ce qu'il offre (abonnement, minutes, ou les deux)
- **Prix/minute** : tarif unique par client (pas de paliers)
- **Factures** : conformes avec infos légales, téléchargeables en PDF
- **Visibilité** : super_admin gère tout, clients (org_admin) voient factures + conso + PDF

## Modèles Prisma

### Subscription
- `id`, `orgId` (unique), `monthlyPrice` (centimes), `pricePerMinute` (centimes)
- `freeTrialType`: none | subscription_only | minutes_only | both
- `freeTrialMonths` (défaut 1)
- `startDate`, `status`: active | paused | cancelled
- `companyName`, `companyAddress`, `companySiret`, `companyVat` (infos légales client)
- `createdAt`, `updatedAt`

### Invoice
- `id`, `invoiceNumber` (séquentiel: INV-2026-0001)
- `orgId`, `subscriptionId`
- `periodMonth`, `periodYear`
- `subscriptionAmount` (centimes), `minutesUsed` (secondes), `minutesAmount` (centimes)
- `totalHT`, `tvaRate`, `tvaAmount`, `totalTTC` (centimes)
- `status`: draft | sent | paid | overdue
- `paidAt` (nullable)
- `createdAt`

## Pages

### Admin
- `/admin/billing` — liste abonnements + bouton générer factures du mois + liste factures
- `/admin/billing/[orgId]` — détail client : modifier abo, historique factures, marquer payé

### Client
- `/billing` — consommation mois en cours + liste factures + téléchargement PDF

## API
- `GET /api/invoices/[id]/pdf` — génère et retourne le PDF de la facture

## Calcul facturation
1. Récupérer toutes les Calls du mois pour l'orgId
2. Sommer les durées (secondes → minutes, arrondi au supérieur)
3. Multiplier par pricePerMinute
4. Vérifier si mois offert (comparer mois courant vs startDate + freeTrialMonths)
5. Appliquer la réduction selon freeTrialType
6. Ajouter TVA (20% par défaut)
7. Créer l'Invoice
