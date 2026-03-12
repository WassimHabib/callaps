# Callaps — Plateforme IA d'appels automatisés

## Vue d'ensemble

Callaps est une plateforme SaaS B2B qui permet aux professionnels de créer et déployer des agents vocaux IA pour automatiser leurs appels téléphoniques entrants et sortants. De la prise de rendez-vous à la qualification de leads, Callaps transforme chaque appel en donnée exploitable.

---

## Fonctionnalités complètes

### 1. Agents Vocaux IA

- **Création d'agents personnalisés** avec prompt système configurable (personnalité, ton, instructions)
- **+60 voix disponibles** (Cartesia, Minimax, ElevenLabs, OpenAI, Retell) — voix françaises, anglaises, espagnoles, allemandes, arabes avec aperçu audio
- **Choix du modèle LLM** (GPT-4.1 par défaut)
- **Configuration vocale** : vitesse, température émotionnelle, langue
- **Premier message** statique ou dynamique selon le contexte
- **Durée max d'appel**, timeout de silence, détection de répondeur
- **Message de sécurité** configurable avec nombre max de tentatives
- **Enregistrement des appels** activable/désactivable
- **Fonctions appelables pendant l'appel** :
  - Mettre fin à l'appel
  - Transférer vers un autre numéro
  - Vérifier la disponibilité d'un agenda
  - Prendre un rendez-vous
  - Navigation IVR (DTMF)
  - Appels API HTTP personnalisés
- **Analyse post-appel** avec prompt personnalisé et webhook
- **Support MCP** (Model Context Protocol) pour étendre les capacités

---

### 2. Campagnes d'appels

- **Création de campagne** : nom, description, agent, contacts, numéros de téléphone
- **Import CSV** des contacts (glisser-déposer, détection automatique des colonnes)
- **Planification avancée** :
  - Sélection des jours d'appel (lun–dim)
  - Plage horaire (ex: 9h–17h)
  - Mode fuseau horaire fixe ou auto-détecté par contact
  - +17 fuseaux horaires supportés
- **Relances automatiques** : nombre max de tentatives, intervalle en heures
- **Contrôle du débit** : X appels par Y minutes (ex: 20 appels/min) pour éviter le blocage télécom
- **Statuts de campagne** : brouillon, planifiée, en cours, en pause, terminée
- **Suivi en temps réel** : progression, contacts appelés, taux de réussite

---

### 3. Workflows post-appel

- **Déclencheurs** : appel terminé, lead chaud/tiède/froid, pas de réponse, demande de rappel
- **Actions automatiques** :
  - Notification par email
  - SMS de suivi
  - Planifier un rappel
  - Tagger le contact
  - Exclure des futures campagnes
- **Workflows multiples** par campagne, activables/désactivables individuellement

---

### 4. CRM & Gestion des contacts

- **Base de données contacts** complète (nom, téléphone, email, entreprise, notes)
- **Système de tags** pour organiser et filtrer
- **Métadonnées JSON** pour stocker des données personnalisées
- **Lead scoring automatique** (0–100) avec labels : chaud, tiède, froid
- **Raison du score** et prochaine action recommandée
- **Recherche et filtrage** par nom, téléphone, email, entreprise, tags
- **Historique d'appels** par contact

---

### 5. Historique & Analyse des appels

- **Suivi complet** : statut, durée, horodatage début/fin
- **Transcript intégral** de chaque appel
- **Résumé IA** généré automatiquement
- **Analyse de sentiment** (positif, neutre, négatif)
- **Résultat de l'appel** (succès, échec, pas de réponse)
- **URL d'enregistrement** pour réécouter
- **Filtrage par campagne** et recherche
- **Synchronisation** avec l'API Retell AI

---

### 6. Insights IA — Analyse des demandes & recommandations

- **Extraction automatique des demandes** depuis chaque transcript via Claude Haiku
  - Catégorisation intelligente (ex: "fiche_de_paie", "rendez_vous_dermato")
  - Niveau d'urgence (faible, normal, urgent)
  - Détails contextuels extraits du transcript
- **Dashboard Insights** (`/insights`) avec deux onglets :
  - **Analyse des demandes** : KPIs, graphique barres top catégories, courbe de tendance, table détaillée paginée
  - **Bilans & Recommandations** : rapports hebdomadaires avec recommandations IA
- **Sélecteur de période** : 7 jours, 30 jours, 90 jours
- **Évolution** vs période précédente (% de variation)
- **Rapport hebdomadaire automatique** (chaque lundi) :
  - KPIs de la semaine (appels, demandes, complétion, durée, sentiment)
  - Top catégories de demandes
  - 3 à 5 recommandations IA personnalisées selon le métier
  - Types : optimisation, opportunité, alerte
- **Email hebdomadaire** avec template HTML professionnel et lien vers le dashboard
- **Détection intelligente du métier** : utilise le profil entreprise ou infère depuis les demandes

---

### 7. Statistiques & Reporting

- **KPIs principaux** : total appels, taux de réussite, durée moyenne, sentiment dominant
- **Graphique d'appels** sur 30 jours (total vs complétés)
- **Distribution du sentiment** (positif/neutre/négatif)
- **Meilleures heures d'appel** (quand les appels réussissent le plus)
- **Distribution des durées** (< 15s, 15-30s, 30s-1m, 1-2m, 2-3m, 3-5m, > 5m)
- **Top campagnes** par performance

---

### 8. Rendez-vous

- **Gestion complète** : patient, praticien, motif, date, durée, statut
- **Sources multiples** : agent IA, saisie manuelle, synchronisation Doctolib
- **Statuts** : confirmé, annulé, terminé, absent (no-show)
- **Intégration Doctolib** :
  - Vérification de disponibilité en temps réel
  - Prise de rendez-vous automatique par l'agent IA
  - Synchronisation bidirectionnelle

---

### 9. Intégrations

- **HubSpot CRM** : synchronisation contacts, activités d'appels, création de deals
- **Pipedrive CRM** : synchronisation leads, activités, gestion pipeline
- **Slack** : notifications en temps réel (leads chauds/tièdes, statuts d'appels, alertes)
- **Google Calendar** : vérification dispo, prise de RDV, synchronisation
- **Google Sheets** : import/export de contacts et résultats
- **Doctolib** : RDV médicaux (voir section Rendez-vous)
- **Webhooks personnalisés** :
  - URL et secret configurables
  - Événements : appel terminé, appel analysé, lead chaud/tiède/froid
  - Logs de livraison avec statut et réponse
  - Activation/désactivation par webhook

---

### 10. Numéros de téléphone

- **Gestion des numéros** Retell/Twilio
- **Appels entrants et sortants**
- **Routage d'agent** : assigner un agent IA aux appels entrants
- **Surnoms/labels** pour identifier facilement chaque numéro
- **Sélection multiple** par campagne

---

### 11. Facturation & Abonnement

- **Abonnement mensuel** avec prix par mois
- **Facturation à l'usage** : prix par minute d'appel
- **Essai gratuit** configurable : abonnement seul, minutes seules, ou les deux
- **Génération automatique de factures** mensuelles
- **Détail facture** : abonnement, minutes consommées, sous-total HT, TVA (20%), total TTC
- **Statuts** : brouillon, envoyée, payée, en retard
- **Export PDF** des factures
- **Suivi des paiements** avec date de paiement

---

### 12. Profil entreprise & Paramètres

- **Profil entreprise** : nom, activité, description, adresse, téléphone, email, site web
- **Horaires d'ouverture**
- **Ton de communication** : professionnel, amical, formel
- **Audience cible** et proposition de valeur unique
- **Informations utilisateur** (depuis Clerk)

---

### 13. Multi-tenant & Organisations

- **Organisations Clerk** avec sélecteur d'organisation
- **Isolation des données** par organisation
- **Tous les éléments scopés** : agents, campagnes, contacts, appels, RDV, factures, insights
- **Gestion des membres** par organisation

---

### 14. Rôles & Permissions

| Fonctionnalité | Admin Org | Manager | Opérateur | Lecteur |
|---|---|---|---|---|
| Agents IA | Tout | Tout | Lecture | Lecture |
| Campagnes | Tout | Tout | Lecture + Lancer | Lecture |
| Contacts | Tout | Tout | Lecture | Lecture |
| Statistiques | Lecture | Lecture | Lecture | Lecture |
| Membres | Tout | — | — | — |
| Facturation | Tout | — | — | — |
| Intégrations | Tout | Tout | — | — |
| Numéros | Tout | Tout | Lecture | — |
| Rendez-vous | Tout | Tout | Lecture | Lecture |

---

### 15. Administration (Super Admin)

- **Dashboard global** : clients, agents, campagnes, appels sur toute la plateforme
- **Gestion des organisations** et des clients
- **Monitoring** de tous les agents et campagnes
- **Statistiques cross-organisations**
- **Gestion de la facturation** globale
- **Impersonation** d'organisation pour le support

---

## Prompt de présentation

> Utilisez ce prompt pour présenter Callaps à un prospect ou partenaire :

---

**Callaps — L'agent vocal IA qui transforme vos appels en performance**

Imaginez un assistant téléphonique qui ne dort jamais, parle comme un humain, et transforme chaque appel en donnée exploitable.

**Callaps** est une plateforme d'agents vocaux IA conçue pour les professionnels — cabinets médicaux, comptables, agences immobilières, avocats, et bien d'autres. En quelques clics, vous créez un agent vocal personnalisé qui :

- **Répond à vos appels 24h/24** avec une voix naturelle parmi +60 voix disponibles
- **Lance des campagnes d'appels sortants** avec planification intelligente, relances automatiques et contrôle du débit
- **Prend des rendez-vous** directement dans votre agenda (Google Calendar, Doctolib)
- **Qualifie vos leads** automatiquement avec un scoring intelligent (chaud, tiède, froid)
- **Déclenche des actions** après chaque appel : emails, SMS, notifications Slack, mise à jour CRM

Mais Callaps va plus loin. Notre module **Insights IA** analyse chaque appel pour :

- **Identifier les demandes récurrentes** de vos clients (ex: 60% de vos appels concernent les fiches de paie)
- **Vous envoyer un bilan hebdomadaire** avec des KPIs clés et des recommandations personnalisées à votre métier
- **Vous alerter sur les tendances** : hausse de demandes, insatisfaction, opportunités à saisir

Le tout connecté à vos outils : **HubSpot, Pipedrive, Slack, Google Calendar, Google Sheets, Doctolib**, et des webhooks pour n'importe quelle intégration custom.

**Résultat ?** Moins d'appels manqués, plus de leads qualifiés, des données pour optimiser votre activité — et un temps précieux libéré pour vous concentrer sur votre coeur de métier.

Callaps est disponible en abonnement mensuel avec facturation à l'usage (par minute d'appel). Essai gratuit disponible.

**Prêt à transformer vos appels en performance ?**
