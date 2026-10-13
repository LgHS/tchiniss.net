// Couleurs qui remplacent la couleur par fréquence quand le statut sort du
// fonctionnement normal. "actif" (et tout statut non listé ici) utilise la
// couleur de la fréquence à la place, voir couleurFrequence().
const STATUT_COULEURS = {
  test: "#fbbf24",
  déploiement: "#f97316",
  maintenance: "#ef4444",
  projet: "#06b6d4",
  "hors-service": "#6b7280",
};

const FREQUENCE_COULEURS = {
  868: "#21c55d",
  433: "#3b82f6",
};
const COULEUR_FREQUENCE_DEFAUT = "#9ca3af";

const COULEUR_SITE_MULTIPLE = "#a855f7";
const RAYON_PAR_DEFAUT_M = 700;
const RAYON_MIN_PIXELS = 6;

function couleurStatut(statut) {
  return STATUT_COULEURS[statut] || COULEUR_FREQUENCE_DEFAUT;
}

function couleurFrequence(freq) {
  return FREQUENCE_COULEURS[freq] ?? COULEUR_FREQUENCE_DEFAUT;
}

function couleurRelais(relais) {
  if (relais.statut && relais.statut !== "actif" && STATUT_COULEURS[relais.statut]) {
    return STATUT_COULEURS[relais.statut];
  }
  return couleurFrequence(relais.frequence_mhz);
}

function echapper(valeur) {
  const div = document.createElement("div");
  div.textContent = valeur ?? "";
  return div.innerHTML;
}

function formaterDate(dateIso) {
  const [annee, mois, jour] = dateIso.split("-");
  if (!annee || !mois || !jour) return dateIso;
  return `${jour}/${mois}/${annee}`;
}

function ligneBridge(relaisA, relaisB) {
  return `<div class="popup-bridge">🌉 <strong>${echapper(relaisA.nom)}</strong> &harr; <strong>${echapper(relaisB.nom)}</strong></div>`;
}

function contenuRelais(relais, relaisParId, masquerLigneBridge) {
  const antenne = relais.antenne || {};
  const hardware = relais.hardware || {};
  const pont = !masquerLigneBridge && relais.bridge_avec ? relaisParId.get(relais.bridge_avec) : null;
  const lignes = [
    `<strong>${echapper(relais.nom)}</strong>`,
    pont ? ligneBridge(relais, pont) : null,
    relais.type ? `Type : ${echapper(relais.type)}` : null,
    relais.statut ? `Statut : ${echapper(relais.statut)}` : null,
    relais.proprietaire ? `Propriétaire : ${echapper(relais.proprietaire)}` : null,
    relais.frequence_mhz != null ? `Fréquence : ${echapper(relais.frequence_mhz)} MHz` : null,
    relais.date_deploiement ? `Déployé le : ${echapper(formaterDate(relais.date_deploiement))}` : null,
    relais.altitude_m != null
      ? `Altitude : ${echapper(relais.altitude_m)} m${relais.hauteur_installation_m != null ? ` (+${echapper(relais.hauteur_installation_m)} m hauteur installation)` : ""}`
      : null,
    antenne.type
      ? `Antenne : ${echapper(antenne.type)}${antenne.gain_dbi ? ` (${echapper(antenne.gain_dbi)} dBi)` : ""}`
      : null,
    hardware.modele ? `Matériel : ${echapper(hardware.modele)}` : null,
    hardware.firmware ? `Firmware : ${echapper(hardware.firmware)}` : null,
    hardware.alimentation ? `Alimentation : ${echapper(hardware.alimentation)}` : null,
    hardware.batterie_mah != null ? `Batterie : ${echapper(hardware.batterie_mah)} mAh` : null,
  ].filter(Boolean);

  let html = lignes.join("<br>");
  if (relais.description) {
    html += `<br><br>${echapper(relais.description)}`;
  }
  return html;
}

function trouverPaireBridgeeDansGroupe(membres, relaisParId) {
  for (const relais of membres) {
    if (!relais.bridge_avec) continue;
    const partenaire = relaisParId.get(relais.bridge_avec);
    if (partenaire && membres.includes(partenaire)) {
      return [relais, partenaire];
    }
  }
  return null;
}

function contenuBridgeDetaille(relaisA, relaisB, relaisParId) {
  return `
    <div class="popup-bridge-entete">🌉 Bridge</div>
    <div class="popup-bridge-cote-a-cote">
      <div class="popup-bridge-colonne">${contenuRelais(relaisA, relaisParId, true)}</div>
      <div class="popup-bridge-fleche">&harr;</div>
      <div class="popup-bridge-colonne">${contenuRelais(relaisB, relaisParId, true)}</div>
    </div>
  `;
}

function contenuPopupSite(membres, relaisParId) {
  if (membres.length === 1) {
    return contenuRelais(membres[0], relaisParId, false);
  }

  const paireBridgee = trouverPaireBridgeeDansGroupe(membres, relaisParId);
  const idsPaireBridgee = new Set(paireBridgee ? paireBridgee.map((r) => r.id) : []);
  const autres = membres.filter((r) => !idsPaireBridgee.has(r.id));

  const blocs = [];
  if (!paireBridgee || autres.length > 0) {
    blocs.push(`<strong>${membres.length} relais sur ce site</strong>`);
  }
  if (paireBridgee) {
    blocs.push(contenuBridgeDetaille(paireBridgee[0], paireBridgee[1], relaisParId));
  }
  blocs.push(...autres.map((r) => contenuRelais(r, relaisParId, false)));

  return blocs.join("<hr>");
}

function afficherErreur(message) {
  const conteneur = document.getElementById("map");
  conteneur.innerHTML = `<p class="map-error">${echapper(message)}</p>`;
}

const ORDRE_STATUTS = ["projet", "déploiement", "actif", "test", "maintenance", "hors-service"];

let carteLeaflet = null;
let entrees = []; // { membres: [relais...], cercle }

function creerCaseFiltre(groupe, valeur, libelle, couleur) {
  const label = document.createElement("label");
  label.className = "filtre-item";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = true;
  input.dataset.groupe = groupe;
  input.dataset.valeur = valeur;
  input.addEventListener("change", appliquerFiltres);
  label.appendChild(input);

  if (couleur) {
    const pastille = document.createElement("span");
    pastille.className = "dot";
    pastille.style.background = couleur;
    label.appendChild(pastille);
  }

  label.append(" " + libelle);
  return label;
}

function construireFiltres(listeRelais) {
  const statutsPresents = new Set(listeRelais.map((r) => r.statut).filter(Boolean));
  const statuts = ORDRE_STATUTS.filter((s) => statutsPresents.has(s));

  const frequences = [
    ...new Set(listeRelais.map((r) => r.frequence_mhz).filter((f) => f != null)),
  ].sort((a, b) => a - b);

  const conteneurStatuts = document.getElementById("filtre-statuts");
  const conteneurFrequences = document.getElementById("filtre-frequences");

  statuts.forEach((statut) => {
    conteneurStatuts.appendChild(creerCaseFiltre("statut", statut, statut, couleurStatut(statut)));
  });

  frequences.forEach((freq) => {
    conteneurFrequences.appendChild(
      creerCaseFiltre("frequence", String(freq), `${freq} MHz`, couleurFrequence(freq))
    );
  });
}

function appliquerFiltres() {
  const statutsActifs = new Set(
    [...document.querySelectorAll('input[data-groupe="statut"]:checked')].map((i) => i.dataset.valeur)
  );
  const frequencesActives = new Set(
    [...document.querySelectorAll('input[data-groupe="frequence"]:checked')].map((i) => i.dataset.valeur)
  );

  entrees.forEach(({ membres, cercle }) => {
    const visible = membres.some((relais) => {
      const statutOk = !relais.statut || statutsActifs.has(relais.statut);
      const frequenceOk = relais.frequence_mhz == null || frequencesActives.has(String(relais.frequence_mhz));
      return statutOk && frequenceOk;
    });

    if (visible && !carteLeaflet.hasLayer(cercle)) {
      cercle.addTo(carteLeaflet);
    } else if (!visible && carteLeaflet.hasLayer(cercle)) {
      carteLeaflet.removeLayer(cercle);
    }
  });
}

function cleSite(relais) {
  const { lat, lon } = relais.position || {};
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

function regrouperParSite(listeRelais) {
  const groupes = new Map();
  listeRelais.forEach((relais) => {
    const cle = cleSite(relais);
    if (cle === null) return;
    if (!groupes.has(cle)) groupes.set(cle, []);
    groupes.get(cle).push(relais);
  });
  return [...groupes.values()];
}

function construireIndexParId(listeRelais) {
  const index = new Map();
  listeRelais.forEach((relais) => {
    if (relais.id) index.set(relais.id, relais);
  });
  return index;
}

function groupeEstPonte(membres, relaisParId) {
  return membres.some((r) => r.bridge_avec && relaisParId.has(r.bridge_avec));
}

function dessinerLiaisonsBridge(listeRelais, relaisParId) {
  const dejaTracees = new Set();

  listeRelais.forEach((relais) => {
    if (!relais.bridge_avec) return;
    const partenaire = relaisParId.get(relais.bridge_avec);
    if (!partenaire || !relais.position || !partenaire.position) return;

    const cle = [relais.id, partenaire.id].sort().join("|");
    if (dejaTracees.has(cle)) return;
    dejaTracees.add(cle);

    const memePosition = cleSite(relais) === cleSite(partenaire);
    if (memePosition) return; // déjà dans le même cercle, pas besoin de ligne

    L.polyline(
      [
        [relais.position.lat, relais.position.lon],
        [partenaire.position.lat, partenaire.position.lon],
      ],
      {
        color: COULEUR_SITE_MULTIPLE,
        weight: 2,
        opacity: 0.8,
        dashArray: "6 6",
      }
    )
      .addTo(carteLeaflet)
      .bindTooltip(ligneBridge(relais, partenaire), { sticky: true });
  });
}

function metresParPixel(latitude, zoom) {
  return (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / Math.pow(2, zoom);
}

function ajusterRayonsVisibles() {
  const zoom = carteLeaflet.getZoom();
  entrees.forEach(({ cercle, rayonBase }) => {
    const latlng = cercle.getLatLng();
    const rayonMin = RAYON_MIN_PIXELS * metresParPixel(latlng.lat, zoom);
    cercle.setRadius(Math.max(rayonBase, rayonMin));
  });
}

function initCarte(listeRelais) {
  carteLeaflet = L.map("map");

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(carteLeaflet);

  const points = [];
  entrees = [];

  const relaisParId = construireIndexParId(listeRelais);
  const sites = regrouperParSite(listeRelais);

  sites.forEach((membres) => {
    const { lat, lon } = membres[0].position;
    const rayon = Math.max(...membres.map((r) => r.position.rayon_m || RAYON_PAR_DEFAUT_M));
    const ponte = groupeEstPonte(membres, relaisParId);
    const couleur = ponte ? COULEUR_SITE_MULTIPLE : couleurRelais(membres[0]);

    const cercle = L.circle([lat, lon], {
      radius: rayon,
      color: "#ffffff",
      weight: membres.length > 1 ? 2.5 : 1.5,
      opacity: 0.9,
      fillColor: couleur,
      fillOpacity: 0.55,
    })
      .addTo(carteLeaflet)
      .bindPopup(contenuPopupSite(membres, relaisParId), { maxWidth: 420, minWidth: 280 });

    entrees.push({ membres, cercle, rayonBase: rayon });
    points.push([lat, lon]);
  });

  dessinerLiaisonsBridge(listeRelais, relaisParId);
  carteLeaflet.on("zoomend", ajusterRayonsVisibles);

  if (points.length > 0) {
    carteLeaflet.fitBounds(points, { padding: [40, 40], maxZoom: 13 });
  } else {
    carteLeaflet.setView([50.6326, 5.5797], 10);
  }
  ajusterRayonsVisibles();

  construireFiltres(listeRelais);
}

fetch("data/relais.json")
  .then((reponse) => {
    if (!reponse.ok) throw new Error("Réponse HTTP " + reponse.status);
    return reponse.json();
  })
  .then(initCarte)
  .catch((erreur) => {
    console.error("Erreur de chargement des relais :", erreur);
    afficherErreur("Impossible de charger les données des relais.");
  });
