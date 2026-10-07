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

**Important** : `position.lat`/`position.lon` doivent être volontairement approximatifs (pas l'adresse exacte de l'antenne). La carte affiche un cercle de rayon `rayon_m` (700 m par défaut) plutôt qu'un point précis, justement pour ne pas révéler d'emplacement exact.

**Sites multi-relais** : si plusieurs relais partagent la même position (même site, par ex. deux fréquences sur le même pylône), la carte les regroupe automatiquement en un seul cercle, avec le détail de chaque relais dans la popup, plutôt que d'afficher des cercles superposés illisibles.

**Couleur des cercles** (voir `js/carte.js`, fonction `couleurRelais`) :

1. Site multi-relais → **mauve** (`#a855f7`), toujours, peu importe le statut des relais qui le composent.
2. Sinon, si le statut est `test`, `déploiement`, `maintenance`, `projet` ou `hors-service` → couleur dédiée à ce statut (`test` ambre, `déploiement` orange, `maintenance` rouge, `projet` cyan, `hors-service` gris).
3. Sinon (statut `actif`, ou non renseigné) → couleur de la fréquence (`868` MHz vert, `433` MHz bleu, autre fréquence gris neutre par défaut).

## Générateur de nom de module

La page `nommage.html` construit un nom conforme à la convention `BE-{commune}-{libre}-tchs.be`, où `{commune}` est un code LOCODE à 3 lettres choisi dans `data/locode_be.json` (recherche par nom de commune).

La limite est celle de MeshCore pour un nom annoncé : **31 octets** (23 si la localisation est incluse dans l'annonce). Le formulaire calcule en direct le nombre d'octets restants pour la partie libre, et **bloque la saisie** une fois le budget atteint. Une fréquence optionnelle peut être ajoutée en suffixe (ex: `-433`) pour distinguer deux modules sur un même site, ou une case « pont 868 ↔ 433 » qui ajoute `-BR` à la place (les deux options sont exclusives).

## Développement local

Ouvrir `index.html` dans un navigateur, ou servir le dossier avec un serveur statique quelconque, par ex. :

```sh
python3 -m http.server
```

## Liens

- Wiki du projet : https://wiki.liegehacker.space/shelves/tchinissnet
- Contact : ping@lghs.be
