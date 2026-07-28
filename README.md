# APIFTP — relais Upload → FTP

Cette API reçoit une image en HTTPS depuis l'app mobile et la dépose sur le serveur FTP.
Les identifiants FTP ne vivent JAMAIS dans le code, uniquement dans les variables
d'environnement du serveur qui héberge cette API.

## 1. Tester en local

```bash
npm install
cp .env.example .env
# éditez .env avec vos vraies infos (nouveau compte FTP)
npm start
```

Test avec curl :

```bash
curl -X POST http://localhost:3000/api/upload-image \
  -H "x-api-key: VOTRE_CLE_API" \
  -F "image=@/chemin/vers/une/photo.jpg"
```

Réponse attendue : `{"success":true,"filename":"..."}`

## 2. Déployer

Deux pistes possibles selon vos contraintes (voir discussion) :

- **Render.com (gratuit)** : simple, mais le service s'endort après 15 min d'inactivité
  (30-60s de réveil au 1er appel suivant).
- **Oracle Cloud Always Free** : gratuit et toujours allumé, mais nécessite de configurer
  une vraie VM Linux (SSH, Node.js, pm2, Nginx + HTTPS via Let's Encrypt).
- **Alternative payante (~5-7€/mois)** : simplicité + rapidité garantie (VPS classique ou Render payant).

Dans tous les cas, le code (`server.js`) reste identique — seule la méthode de déploiement change.

## 3. Variables d'environnement à configurer côté hébergeur

- `API_KEY`
- `FTP_HOST`
- `FTP_USER`
- `FTP_PASS`
- `FTP_SECURE` (true/false)
- `FTP_REMOTE_DIR`

## 4. Code côté app Capacitor

```ts
async function uploadImage(fileUri: string) {
  const API_URL = 'https://votre-url-apiftp.example.com/api/upload-image';
  const API_KEY = 'VOTRE_CLE_API';

  const blob = await fetch(fileUri).then(r => r.blob());
  const formData = new FormData();
  formData.append('image', blob, 'photo.jpg');

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'x-api-key': API_KEY },
    body: formData
  });

  if (!response.ok) {
    throw new Error('Échec de l\'upload');
  }

  return response.json();
}
```

### Note sur la clé API côté app

Cette clé sera visible si l'app est décompilée — c'est acceptable ici car elle ne
donne accès qu'à une action limitée (upload), jamais au FTP directement, et elle est
révocable/changeable à tout moment sans rien casser d'autre.

## 5. Sécurité (recommandé)

- Compte FTP dédié avec accès restreint au seul dossier `/images`
- Rate limiting (`express-rate-limit`) pour éviter le spam d'uploads
- CORS restreint si vous avez aussi une version web
