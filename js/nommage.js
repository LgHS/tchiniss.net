const PREFIXE = "BE-";
const SUFFIXE = "-tchs.be";
const LIMITE_OCTETS = 31;
const LIMITE_OCTETS_AVEC_LOCALISATION = 23;
let locodes = [];
let communeSelectionnee = null;
let resultatsCourants = [];
let indexActif = -1;
let pays = [];

function octets(texte) {
  return new TextEncoder().encode(texte).length;
}

function tronquerParOctets(texte, maxOctets) {
  let resultat = "";
  for (const caractere of texte) {
    const essai = resultat + caractere;
    if (octets(essai) > maxOctets) break;
    resultat = essai;
  }
  return resultat;
}

function normaliser(texte) {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function peupleCommunes(liste) {
  locodes = [...liste].sort((a, b) => a.NAME.localeCompare(b.NAME, "fr"));
}

function filtrerCommunes(texte) {
  const requete = normaliser(texte.trim());
  if (!requete) return locodes;
  return locodes.filter((c) => normaliser(c.NAME).includes(requete) || normaliser(c.LOCODE).includes(requete));
}

function surbrillance(index) {
  const items = document.querySelectorAll("#commune-liste .dropdown-item");
  items.forEach((el) => el.classList.remove("actif"));
  if (index >= 0 && items[index]) {
    items[index].classList.add("actif");
    items[index].scrollIntoView({ block: "nearest" });
  }
}

function afficherListe(resultats) {
  resultatsCourants = resultats;
  indexActif = -1;
  const liste = document.getElementById("commune-liste");
  liste.innerHTML = "";

  if (resultats.length === 0) {
    const vide = document.createElement("li");
    vide.className = "dropdown-item-vide";
    vide.textContent = "Aucune commune trouvée";
    liste.appendChild(vide);
  } else {
    resultats.forEach((entree) => {
      const item = document.createElement("li");
      item.className = "dropdown-item";
      item.setAttribute("role", "option");
      item.innerHTML = `${entree.NAME} <small>(${entree.LOCODE})</small>`;
      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        selectionnerCommune(entree);
      });
      liste.appendChild(item);
    });
  }

  liste.hidden = false;
  document.getElementById("commune-recherche").setAttribute("aria-expanded", "true");
}

function masquerListe() {
  document.getElementById("commune-liste").hidden = true;
  document.getElementById("commune-recherche").setAttribute("aria-expanded", "false");
  indexActif = -1;
}

function selectionnerCommune(entree) {
  communeSelectionnee = entree;
  document.getElementById("commune-recherche").value = `${entree.NAME} (${entree.LOCODE})`;
  masquerListe();
  miseAJour();
}

function emojiDrapeau(code2) {
  return [...code2.toUpperCase()].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join("");
}

function peuplePays(liste) {
  pays = liste;
  const select = document.getElementById("pays");
  liste.forEach((p) => {
    const option = document.createElement("option");
    option.value = p.code;
    option.textContent = `${emojiDrapeau(p.code)} ${p.nom}`;
    select.appendChild(option);
  });
  select.value = "BE";
}

function miseAJour() {
  if (document.getElementById("type-companion").checked) {
    miseAJourCompanion();
  } else {
    miseAJourRepeteur();
  }
}

function miseAJourCompanion() {
  const code = document.getElementById("pays").value || "BE";
  const drapeau = emojiDrapeau(code);

  const fixe = octets(`${drapeau}-${SUFFIXE}`);
  const restant = Math.max(0, LIMITE_OCTETS - fixe);

  const champPseudo = document.getElementById("pseudo");
  const brut = champPseudo.value;
  const tronque = tronquerParOctets(brut, restant);
  if (tronque !== brut) {
    champPseudo.value = tronque;
  }

  const nom = `${drapeau}-${tronque || "..."}${SUFFIXE}`;
  const nbOctets = octets(nom);
  const depasse = nbOctets > LIMITE_OCTETS;

  document.getElementById("resultat-nom").textContent = nom;
  document.getElementById("resultat-nom").classList.toggle("resultat-erreur", depasse);

  const compteur = document.getElementById("resultat-compteur");
  compteur.textContent = `${nbOctets} / ${LIMITE_OCTETS} octets${depasse ? ", trop long, raccourcis le pseudo" : ""}`;
  compteur.classList.toggle("aide-erreur", depasse);

  const compteurPseudo = document.getElementById("pseudo-compteur");
  compteurPseudo.textContent = `${octets(tronque)} / ${restant} octet(s) utilisés pour le pseudo`;
}

function miseAJourRepeteur() {
  const statutCommune = document.getElementById("commune-statut");

  if (communeSelectionnee) {
    statutCommune.textContent = `Code retenu : ${communeSelectionnee.LOCODE}`;
    statutCommune.classList.remove("aide-erreur");
  } else {
    statutCommune.textContent = "Sélectionnez une commune dans la liste.";
    statutCommune.classList.toggle("aide-erreur", document.getElementById("commune-recherche").value.trim() !== "");
  }

  const bridge = document.getElementById("bridge").checked;
  const avecFrequence = !bridge && document.getElementById("avec-frequence").checked;
  const frequence = document.getElementById("frequence").value.trim();
  const code = communeSelectionnee ? communeSelectionnee.LOCODE : "???";

  const suffixeStatut = bridge ? "-BR" : avecFrequence && frequence ? `-${frequence}` : "";
  const fixeHorsLibre = octets(`${PREFIXE}${code}-${SUFFIXE}${suffixeStatut}`);
  const restant = Math.max(0, LIMITE_OCTETS - fixeHorsLibre);

  const champLibre = document.getElementById("libre");
  const libreBrut = champLibre.value;
  const libreTronque = tronquerParOctets(libreBrut, restant);
  if (libreTronque !== libreBrut) {
    champLibre.value = libreTronque;
  }
  const libre = libreTronque.trim();

  const nom = `${PREFIXE}${code}-${libre || "..."}${SUFFIXE}${suffixeStatut}`;

  const nbOctets = octets(nom);
  const depasse = nbOctets > LIMITE_OCTETS;

  document.getElementById("resultat-nom").textContent = nom;
  document.getElementById("resultat-nom").classList.toggle("resultat-erreur", depasse);

  const compteur = document.getElementById("resultat-compteur");
  compteur.textContent = `${nbOctets} / ${LIMITE_OCTETS} octets${depasse ? ", trop long, raccourcis la partie libre" : ""}`;
  compteur.classList.toggle("aide-erreur", depasse);

  const compteurLibre = document.getElementById("libre-compteur");
  compteurLibre.textContent = `${octets(libreTronque)} / ${restant} octet(s) utilisés pour la partie libre`;
}

const champCommune = document.getElementById("commune-recherche");

champCommune.addEventListener("input", () => {
  communeSelectionnee = null;
  afficherListe(filtrerCommunes(champCommune.value));
  miseAJour();
});

champCommune.addEventListener("focus", () => {
  afficherListe(filtrerCommunes(champCommune.value));
});

champCommune.addEventListener("blur", () => {
  masquerListe();
});

champCommune.addEventListener("keydown", (e) => {
  const liste = document.getElementById("commune-liste");
  if (liste.hidden) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    indexActif = Math.min(indexActif + 1, resultatsCourants.length - 1);
    surbrillance(indexActif);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    indexActif = Math.max(indexActif - 1, 0);
    surbrillance(indexActif);
  } else if (e.key === "Enter") {
    if (indexActif >= 0 && resultatsCourants[indexActif]) {
      e.preventDefault();
      selectionnerCommune(resultatsCourants[indexActif]);
    }
  } else if (e.key === "Escape") {
    masquerListe();
  }
});

document.getElementById("avec-frequence").addEventListener("change", (e) => {
  document.getElementById("frequence").disabled = !e.target.checked;
  miseAJour();
});

document.getElementById("bridge").addEventListener("change", (e) => {
  const caseFrequence = document.getElementById("avec-frequence");
  const actif = e.target.checked;
  caseFrequence.disabled = actif;
  if (actif) {
    caseFrequence.checked = false;
    document.getElementById("frequence").disabled = true;
  }
  miseAJour();
});

["libre", "frequence"].forEach((id) => {
  document.getElementById(id).addEventListener("input", miseAJour);
});

["pays", "pseudo"].forEach((id) => {
  document.getElementById(id).addEventListener("input", miseAJour);
});

["type-repeteur", "type-companion"].forEach((id) => {
  document.getElementById(id).addEventListener("change", () => {
    const companion = document.getElementById("type-companion").checked;
    document.getElementById("form-repeteur").hidden = companion;
    document.getElementById("form-companion").hidden = !companion;
    miseAJour();
  });
});

document.getElementById("bouton-copier").addEventListener("click", async () => {
  const bouton = document.getElementById("bouton-copier");
  const nom = document.getElementById("resultat-nom").textContent;
  try {
    await navigator.clipboard.writeText(nom);
    bouton.textContent = "Copié !";
  } catch (erreur) {
    console.error("Erreur de copie :", erreur);
    bouton.textContent = "Erreur, copie manuelle";
  }
  setTimeout(() => {
    bouton.textContent = "Copier";
  }, 1500);
});

fetch("data/locode_be.json")
  .then((reponse) => {
    if (!reponse.ok) throw new Error("Réponse HTTP " + reponse.status);
    return reponse.json();
  })
  .then((liste) => {
    peupleCommunes(liste);
    miseAJour();
  })
  .catch((erreur) => {
    console.error("Erreur de chargement des communes :", erreur);
    document.getElementById("commune-statut").textContent = "Impossible de charger la liste des communes.";
    document.getElementById("commune-statut").classList.add("aide-erreur");
  });

fetch("data/pays.json")
  .then((reponse) => {
    if (!reponse.ok) throw new Error("Réponse HTTP " + reponse.status);
    return reponse.json();
  })
  .then((liste) => {
    peuplePays(liste);
    miseAJour();
  })
  .catch((erreur) => {
    console.error("Erreur de chargement des pays :", erreur);
  });
