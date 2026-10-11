# Tchiniss.net

Site statique du projet **Tchiniss.net**, [Liège Hackerspace](https://lghs.be) : déploiement et exploration d'un réseau mesh (chat local + IoT) sur la région du Grand Liège.

## Stack

HTML/CSS/JS statique, sans build step.

## Structure

```
index.html          Page d'accueil
carte.html           Carte des relais
nommage.html         Générateur de nom de module
css/style.css        Styles communs
css/carte.css         Styles de la carte
css/nommage.css       Styles du générateur de nom
js/carte.js          Logique de la carte (Leaflet)
js/nommage.js        Logique du générateur de nom
data/relais.json     Données des relais (voir ci-dessous)
data/locode_be.json  Liste des communes belges (code LOCODE + nom)
assets/              Images, favicon, etc.
```

## Carte des relais

La carte (`carte.html`) affiche les relais déclarés dans `data/relais.json`, un tableau d'objets avec ce schéma :

```json
{
  "id": "identifiant-unique",
  "nom": "Nom affiché",
  "type": "Répéteur | Compagnon",
  "statut": "projet | déploiement | actif | test | maintenance | hors-service",
  "proprietaire": "Liège Hackerspace",
  "frequence_mhz": 868,
  "date_deploiement": "2026-10-07",
  "position": {
    "lat": 50.6326,
    "lon": 5.5797,
    "rayon_m": 700
  },
  "altitude_m": 90,
  "antenne": {
    "type": "Yagi directive",
    "gain_dbi": 10,
    "polarisation": "verticale"
  },
  "hardware": {
    "modele": "Heltec V4",
    "firmware": "MeshCore",
    "alimentation": "solaire",
    "batterie_mah": 11600
  },
  "description": "Texte libre affiché dans la popup."
}
```

**Champs obligatoires** (sans ça, le relais n'apparaît pas sur la carte) : `position.lat`, `position.lon`.

**Fortement recommandés** (techniquement optionnels, mais le relais devient inexploitable sans) : `id` (clé interne unique, jamais affichée), `nom` (titre de la popup).

**Optionnels** (affichés dans la popup seulement si présents) : `type`, `statut`, `proprietaire`, `frequence_mhz`, `date_deploiement` (format `AAAA-MM-JJ`), `bridge_avec` (voir ci-dessous), `position.rayon_m` (défaut 700 m si absent), `altitude_m`, `antenne.*`, `hardware.*`, `description`.

**Bridge** (`bridge_avec`) : identifiant (`id`) d'un autre relais avec lequel celui-ci forme un pont fonctionnel (ex: un même appareil relayant entre 868 et 433 MHz). À renseigner sur les deux entrées, chacune pointant vers l'`id` de l'autre. **Attention** : le fait que deux relais partagent la même position ne signifie pas qu'ils sont bridgés — ce sont deux informations indépendantes. Affichage :
- Positions différentes : une ligne mauve en pointillés relie les deux cercles sur la carte, avec « 🌉 NomA ↔ NomB » en infobulle au survol.
- Même site (déjà regroupés dans un seul cercle) : la popup affiche le détail complet des deux relais **côte à côte, en deux colonnes**, séparées par une flèche ↔.

**Important** : `position.lat`/`position.lon` doivent être volontairement approximatifs (pas l'adresse exacte de l'antenne). La carte affiche un cercle de rayon `rayon_m` (700 m par défaut) plutôt qu'un point précis, justement pour ne pas révéler d'emplacement exact.

**Gabarit pour ajouter un relais** : copier ce bloc dans le tableau de `data/relais.json` (après la dernière entrée, précédée d'une virgule) et ajuster/retirer les champs selon le relais réel.

```json
{
  "id": "identifiant-unique-slug",
  "nom": "BE-XXX-NomDuRelais-tchs.be",
  "type": "Répéteur",
  "statut": "actif",
  "proprietaire": "Nom du propriétaire",
  "frequence_mhz": 868,
  "date_deploiement": "2026-01-01",
  "position": {
    "lat": 50.0000000,
    "lon": 5.0000000,
    "rayon_m": 700
  },
  "altitude_m": 90,
  "antenne": {
    "type": "Yagi directive",
    "gain_dbi": 10,
    "polarisation": "verticale"
  },
  "hardware": {
    "modele": "RAK4631",
    "firmware": "MeshCore",
    "alimentation": "solaire",
    "batterie_mah": 11600
  },
  "description": "Texte libre affiché dans la popup (optionnel)."
}
```

**Sites multi-relais** : si plusieurs relais partagent la même position (même site, par ex. deux fréquences sur le même pylône), la carte les regroupe automatiquement en un seul cercle, avec le détail de chaque relais dans la popup, plutôt que d'afficher des cercles superposés illisibles.

**Couleur des cercles** (voir `js/carte.js`, fonctions `couleurRelais` et `groupeEstPonte`) :

1. Site dont au moins un relais a un `bridge_avec` valide → **mauve** (`#a855f7`), peu importe le statut. La simple présence de plusieurs relais sur un site, sans `bridge_avec`, ne déclenche pas cette couleur.
2. Sinon, si le statut du relais principal du site est `test`, `déploiement`, `maintenance`, `projet` ou `hors-service` → couleur dédiée à ce statut (`test` ambre, `déploiement` orange, `maintenance` rouge, `projet` cyan, `hors-service` gris).
3. Sinon (statut `actif`, ou non renseigné) → couleur de la fréquence (`868` MHz vert, `433` MHz bleu, autre fréquence gris neutre par défaut).

## Générateur de nom de module

La page `nommage.html` construit un nom conforme à la convention `BE-{commune}-{libre}-tchs.be`, où `{commune}` est un code LOCODE à 3 lettres choisi dans `data/locode_be.json` (recherche par nom de commune).

La limite est celle de MeshCore pour un nom annoncé : **31 octets** (23 si la localisation est incluse dans l'annonce). Le formulaire calcule en direct le nombre d'octets restants pour la partie libre, et **bloque la saisie** une fois le budget atteint. Un bouton « Copier » copie le nom généré dans le presse-papiers.

Une fréquence optionnelle peut être ajoutée en suffixe (ex: `-433`) pour distinguer deux modules sur un même site, ou un sélecteur « Bridge » qui ajoute `-B4` (bridge 433) ou `-B8` (bridge 868) à la place (ces deux options sont exclusives).

## Développement local

Ouvrir `index.html` dans un navigateur, ou servir le dossier avec un serveur statique quelconque, par ex. :

```sh
python3 -m http.server
```

## Liens

- Wiki du projet : https://wiki.liegehacker.space/shelves/tchinissnet
- Contact : ping@lghs.be
