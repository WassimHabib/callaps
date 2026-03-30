# API Callaps — Appels sortants

Documentation pour intégrer les appels IA sortants depuis votre application.

---

## 1. Authentification

Chaque requête doit inclure votre clé API dans le header HTTP :

```
Authorization: Bearer clps_votre_cle_api
```

> Votre clé API vous est fournie par votre gestionnaire Callaps. Conservez-la en sécurité et ne la partagez jamais côté client (navigateur). Utilisez-la uniquement côté serveur.

---

## 2. Lancer un appel

**Endpoint :**

```
POST https://app.callaps.com/api/v1/calls
Content-Type: application/json
```

**Paramètres du body JSON :**

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `agent_id` | string | ✅ Oui | Identifiant de l'agent IA (fourni par Callaps) |
| `to_number` | string | ✅ Oui | Numéro de téléphone à appeler au format E.164 (ex : `+33612345678`) |
| `name` | string | Non | Nom du contact — l'agent IA l'utilisera pendant la conversation |
| `from_number` | string | Non | Numéro appelant au format E.164. Si non fourni, le numéro par défaut de votre compte sera utilisé |
| `metadata` | object | Non | Données libres rattachées à l'appel (ex : source, page, identifiant client) |

---

## 3. Exemples d'intégration

### cURL

```bash
curl -X POST https://app.callaps.com/api/v1/calls \
  -H "Authorization: Bearer clps_votre_cle_api" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "votre_agent_id",
    "to_number": "+33612345678",
    "name": "Jean Dupont"
  }'
```

### JavaScript (Node.js / Next.js / Backend)

```javascript
const response = await fetch("https://app.callaps.com/api/v1/calls", {
  method: "POST",
  headers: {
    "Authorization": "Bearer clps_votre_cle_api",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    agent_id: "votre_agent_id",
    to_number: "+33612345678",
    name: "Jean Dupont",
    metadata: {
      source: "site_web",
      page: "/contact",
    },
  }),
});

const data = await response.json();
console.log(data);
```

### PHP

```php
$ch = curl_init('https://app.callaps.com/api/v1/calls');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer clps_votre_cle_api',
        'Content-Type: application/json',
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'agent_id'  => 'votre_agent_id',
        'to_number' => '+33612345678',
        'name'      => 'Jean Dupont',
    ]),
]);

$response = curl_exec($ch);
$data = json_decode($response, true);
curl_close($ch);
```

### Python

```python
import requests

response = requests.post(
    "https://app.callaps.com/api/v1/calls",
    headers={
        "Authorization": "Bearer clps_votre_cle_api",
        "Content-Type": "application/json",
    },
    json={
        "agent_id": "votre_agent_id",
        "to_number": "+33612345678",
        "name": "Jean Dupont",
    },
)

data = response.json()
print(data)
```

---

## 4. Réponse

### Succès (200)

```json
{
  "success": true,
  "call_id": "clxyz123...",
  "retell_call_id": "abc123...",
  "contact_id": "clxyz456...",
  "status": "pending"
}
```

| Champ | Description |
|-------|-------------|
| `call_id` | Identifiant unique de l'appel dans Callaps |
| `retell_call_id` | Identifiant technique de l'appel |
| `contact_id` | Identifiant du contact (créé automatiquement si nouveau) |
| `status` | Statut initial de l'appel (`pending`) |

### Erreurs

| Code HTTP | Message | Cause |
|-----------|---------|-------|
| 401 | `Missing or invalid Authorization header` | Header `Authorization: Bearer ...` absent ou mal formé |
| 401 | `Invalid API key` | Clé API invalide ou révoquée |
| 400 | `agent_id and to_number are required` | Paramètres obligatoires manquants |
| 400 | `to_number must be in E.164 format` | Numéro invalide — doit commencer par `+` suivi de 8 à 15 chiffres |
| 400 | `No from_number provided and no phone number configured` | Aucun numéro appelant disponible |
| 404 | `Agent not found or not published` | Agent inexistant, non publié ou n'appartenant pas à votre organisation |
| 500 | `Failed to create call` | Erreur interne — contactez le support |

---

## 5. Format E.164

Le numéro de téléphone doit respecter le format international E.164 :

- Commence par `+`
- Suivi du code pays puis du numéro
- Exemples :
  - France : `+33612345678`
  - Belgique : `+32470123456`
  - Suisse : `+41791234567`

> Ne pas inclure d'espaces, tirets ou parenthèses.

---

## 6. Bonnes pratiques

- **Côté serveur uniquement** : n'exposez jamais votre clé API dans du code frontend (HTML, JavaScript client). Faites toujours l'appel depuis votre serveur.
- **Gestion des erreurs** : vérifiez le code HTTP de retour et traitez les erreurs.
- **Metadata** : utilisez le champ `metadata` pour tracer la source de l'appel (page, formulaire, CRM, etc.). Ces données sont visibles dans votre tableau de bord Callaps.
- **Rate limit** : évitez d'envoyer plus de 10 appels par seconde.

---

## 7. Informations à obtenir de Callaps

Avant de commencer l'intégration, vous aurez besoin de :

| Information | Où la trouver |
|-------------|---------------|
| **Clé API** | Fournie par votre gestionnaire Callaps |
| **Agent ID** | Fourni par votre gestionnaire Callaps |
| **Numéro appelant** (optionnel) | Configuré par défaut sur votre compte |

---

*Support : contactez votre gestionnaire Callaps pour toute question technique.*
