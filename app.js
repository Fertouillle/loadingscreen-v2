const el = (id) => document.getElementById(id);

const ui = {
  bg: el("bg"),

  srvName: el("srvName"),
  mapName: el("mapName"),
  gmName: el("gmName"),

  signalChip: el("signalChip"),
  statusText: el("statusText"),
  bootLine: el("bootLine"),

  progressFill: el("progressFill"),
  progressPct: el("progressPct"),
  progressFiles: el("progressFiles"),
  progressStatus: el("progressStatus"),

  phase: el("phase"),
  steam64: el("steam64"),
  channelEcho: el("channelEcho"),

  cycDate: el("cycDate"),
  tempExt: el("tempExt"),
  transportId: el("transportId"),
  imperialId: el("imperialId"),

  doctrineLine: el("doctrineLine"),
  tipLine: el("tipLine"),

  milClock: el("milClock"),
  milLine: el("milLine"),
  milSub: el("milSub"),

  newsClock: el("newsClock"),
  newsLine: el("newsLine"),
  newsSub: el("newsSub"),

  audioBtn: el("audioBtn"),
  ambience: el("ambience")
};

let filesNeeded = 0;
let filesDownloaded = 0;
let lastPct = 0;

const AUDIO_DEFAULT_VOLUME = 0.08;
const AUDIO_RETRY_DELAY_MS = 15000;

function pad2(n){ return String(n).padStart(2, "0"); }

function getISOWeek(date){
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getCycDateString(now = new Date()){
  const week = pad2(getISOWeek(now));
  const dd = pad2(now.getDate());
  const mm = pad2(now.getMonth() + 1);
  const yy = pad2(now.getFullYear() % 100);
  return `CYC-${week}.${dd}${mm}.${yy}`;
}

function randInt(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function cryptoInt(maxExclusive){
  if (window.crypto && crypto.getRandomValues){
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % maxExclusive;
  }
  return randInt(0, maxExclusive - 1);
}

function shuffle(arr){
  for (let i = arr.length - 1; i > 0; i--){
    const j = cryptoInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function genTempC(){
  const m = new Date().getMonth() + 1;
  const ranges = {
    1: [-6, 8], 2: [-5, 10], 3: [0, 14], 4: [6, 18],
    5: [10, 23], 6: [14, 28], 7: [17, 32], 8: [18, 33],
    9: [12, 26], 10: [7, 19], 11: [1, 13], 12: [-3, 9]
  };
  const r = ranges[m] || [0, 20];
  return randInt(r[0], r[1]);
}

function genTransportId(){
  const bytes = new Uint8Array(4);
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < 4; i++) bytes[i] = randInt(0, 255);
  const hex = [...bytes].map(x => x.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `TRN-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

function fnv1a32(str){
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++){
    h ^= str.charCodeAt(i);
    h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
  }
  return h >>> 0;
}

function steam64ToImperialId(steam64){
  const s = String(steam64 || "0");
  const h = fnv1a32(s);
  const sector = (h % 999).toString().padStart(3, "0");
  const reg = ((h >>> 8) & 0xFFFFFF).toString(16).toUpperCase().padStart(6, "0");
  return `ISB-${sector} / REG-${reg}`;
}

function formatPlanet(mapName){
  const s = String(mapName || "UNKNOWN").replace(/_/g, " ").replace(/-/g, " ");
  return s.toUpperCase();
}

function setProgress(pct){
  pct = Math.max(0, Math.min(100, pct));
  if (pct < lastPct) return;
  lastPct = pct;
  if (ui.progressFill) ui.progressFill.style.width = pct.toFixed(0) + "%";
  if (ui.progressPct) ui.progressPct.textContent = pct.toFixed(0) + "%";
}

function setFilesText(){
  if (ui.progressFiles) ui.progressFiles.textContent = `${filesDownloaded}/${filesNeeded} fichiers`;
}

function setStatusLine(text){
  if (ui.statusText) ui.statusText.textContent = text;
}

function setPhase(text){
  if (ui.phase) ui.phase.textContent = text;
  if (ui.progressStatus) ui.progressStatus.textContent = text;
}

function setSignalBoot(){
  if (!ui.signalChip) return;
  ui.signalChip.textContent = "SIGNAL: IMPERIAL CONTROL";
  ui.signalChip.classList.add("alert");
  ui.signalChip.classList.remove("ok");
}

function setSignalLocked(){
  if (!ui.signalChip) return;
  ui.signalChip.textContent = "SIGNAL: LOCKED";
  ui.signalChip.classList.remove("alert");
  ui.signalChip.classList.add("ok");
}

function applyBackground(){
  const img = new Image();
  img.onload = () => {
    if (ui.bg) ui.bg.classList.add("bg-ready");
  };
  img.onerror = () => {};
  img.src = "assets/img/bg.jpg";
}

function glitchTextOnce(node){
  if (!node) return;
  const original = node.textContent;
  const chars = "█▓▒░#@%&*";
  const len = original.length;
  if (len < 6) return;
  const start = cryptoInt(len);
  const span = Math.min(7, Math.max(2, cryptoInt(8)));
  const arr = original.split("");
  for (let i = start; i < Math.min(len, start + span); i++){
    arr[i] = chars[cryptoInt(chars.length)];
  }
  node.textContent = arr.join("");
  setTimeout(() => { node.textContent = original; }, 90 + cryptoInt(140));
}

const bootRotation = [
  "[SYS] Initialisation des modules…",
  "[SEC] Vérification des clés d’accès…",
  "[NET] Synchronisation des protocoles impériaux…",
  "[ENC] Chiffrement du canal sécurisé…",
  "[AUTH] Accréditations confirmées…",
  "[OK ] Liaison établie. Autorisation en cours…"
];

const doctrineRotation = [
  "Respect de la chaîne de commandement. Discipline = crédibilité.",
  "Communications brèves. Ordres clairs. Exécution immédiate.",
  "Tolérance zéro sur les perturbations de canal sécurisé.",
  "Posture militaire exigée. Présence impériale maintenue.",
  "Rigueur, contrôle, autorité. L’Empire ne négocie pas."
];

const commsRotation = [
  "Canal sécurisé actif. Débit stable.",
  "Relais secondaire en veille. Aucune anomalie détectée.",
  "Brouillage externe : faible. Surveillance continue.",
  "Trafic HoloNet filtré. Priorité au réseau militaire.",
  "Fenêtre de transmission établie. Encryption active."
];

const militaryFeedBase = [
  "Patrouilles de stormtroopers en déploiement sur les secteurs périphériques.",
  "Transmission cryptée en provenance du Haut Commandement.",
  "Ordres stratégiques en cours de distribution aux unités opérationnelles.",
  "Flotte impériale en position orbitale. Fenêtre d’intervention ouverte.",
  "Contrôle des couloirs de navigation : restrictions temporaires appliquées.",
  "Inspection ISB annoncée. Toute irrégularité sera sanctionnée.",
  "Interception de signaux non-identifiés : brouillage en cours.",
  "Activation de protocoles de confinement sur installations sensibles.",
  "Renforcement des postes de contrôle. Vérifications d’identités intensifiées.",
  "Escouades de reconnaissance déployées. Zone sous surveillance impériale.",
  "Briefing tactique transmis aux officiers. Priorités opérationnelles mises à jour.",
  "Convoyage logistique en approche. Escorte requise.",
  "Restriction d’accès aux hangars. Autorisations nécessaires.",
  "Contrôle des communications : canaux non-autorisés neutralisés.",
  "Mouvement de troupes signalé. Coordination inter-unités requise.",
  "Ravitaillement en munitions : distribution planifiée.",
  "Message codé du Commandement : niveau de vigilance relevé.",
  "État-major : rapport de situation attendu. Délais stricts.",
  "Surveillance des points de passage : intensification immédiate.",
  "Réallocation des effectifs : renforts redirigés vers zones sensibles.",
  "Procédure de fouille renforcée : contrôle des cargaisons et identités.",
  "Alerte locale : suspect(s) signalé(s) près d’un relais de transmission.",
  "Zone d’exclusion temporaire : accès restreint aux personnels autorisés.",
  "Analyse balistique en cours suite à un incident sur le périmètre.",
  "Opération de ratissage : quadrillage progressif des axes secondaires.",
  "Interdiction de décollage : hangars sous verrouillage administratif.",
  "Signal de détresse intercepté : authenticité en cours de vérification.",
  "Préparation d’extraction : protocole de sécurité activé.",
  "Réseau militaire : priorisation des paquets opérationnels (QOS).",
  "Relais secondaire prêt : bascule sur incident de trafic.",
  "NOTE ISB : individu référencé « M » signalé dans plusieurs archives scellées. Activités criminelles confirmées. Surveillance impériale maintenue."
];

const holonetNewsBase = [
  "HOLO-NET : circulation densifiée dans le district administratif. Patrouilles renforcées.",
  "HOLO-NET : campagne de recrutement civique lancée. Objectif : stabilisation sectorielle.",
  "HOLO-NET : ouverture d’un nouveau centre de distribution. Priorité aux familles de militaires.",
  "HOLO-NET : modernisation des infrastructures énergétiques. Interventions planifiées cette semaine.",
  "HOLO-NET : hausse des contrôles douaniers. Délais de transit variables.",
  "HOLO-NET : incident sur une infrastructure civile. Une piste rebelle est envisagée.",
  "HOLO-NET : arrestations après diffusion de tracts dissidents. Enquête en cours.",
  "HOLO-NET : cérémonie d’hommage aux forces impériales prévue au centre-ville.",
  "HOLO-NET : déploiement de drones de sécurité dans les zones à forte affluence.",
  "HOLO-NET : baisse des incidents sur les axes principaux après renforcement des contrôles.",
  "HOLO-NET : couvre-feu localisé annoncé suite à des troubles isolés.",
  "HOLO-NET : saisie de marchandises non-déclarées. Rappel des procédures en vigueur.",
  "HOLO-NET : perturbation de transport signalée. Retour à la normale en cours.",
  "HOLO-NET : extension des services médicaux sur le secteur. Capacité augmentée.",
  "HOLO-NET : ouverture d’un point de ravitaillement d’urgence. Accès sous contrôle.",
  "HOLO-NET : programme de reconstruction annoncé pour certaines zones endommagées.",
  "HOLO-NET : marché central sous contrôle : vérifications aléatoires renforcées.",
  "HOLO-NET : rapport météo : vents violents en périphérie. Prudence recommandée.",
  "HOLO-NET : sensibilisation citoyenne : communications non-autorisées passibles de sanctions.",
  "HOLO-NET : audit des permis de circulation. Mise à jour obligatoire des dossiers.",
  "HOLO-NET : nouvelles restrictions sur les colis non-scannés. Contrôle systématique.",
  "HOLO-NET : rénovation des voies principales. Déviations temporaires.",
  "HOLO-NET : campagne d’affichage : “Sécurité & Stabilité”.",
  "HOLO-NET : hausse de fréquentation des centres administratifs. Guichets prolongés.",
  "HOLO-NET : incident mineur neutralisé par les forces de maintien de l’ordre.",
  "HOLO-NET : découverte de matériel non homologué. Saisie et analyse.",
  "HOLO-NET : rappel : rassemblements non déclarés interdits sur voie publique.",
  "HOLO-NET : optimisation des réseaux d’eau. Coupures planifiées et annoncées.",
  "HOLO-NET : ouverture d’une antenne d’assistance logistique. Priorité aux zones isolées.",
  "HOLO-NET : enquête en cours après perturbation HoloNet. Relais de secours activés."
];

let bootIdx = 0;
let rotIdx = 0;

function startBootSequence(){
  setInterval(() => {
    bootIdx = (bootIdx + 1) % bootRotation.length;
    if (ui.bootLine) ui.bootLine.textContent = bootRotation[bootIdx];
    if (cryptoInt(12) === 0 && ui.bootLine) glitchTextOnce(ui.bootLine);
  }, 1700);
}

function startRotations(){
  setInterval(() => {
    rotIdx = (rotIdx + 1) % doctrineRotation.length;
    if (ui.doctrineLine) ui.doctrineLine.textContent = doctrineRotation[rotIdx];
    if (ui.tipLine) ui.tipLine.textContent = commsRotation[rotIdx % commsRotation.length];
    if (cryptoInt(10) === 0 && ui.tipLine) glitchTextOnce(ui.tipLine);
  }, 5200);
}

function updateCycClock(){
  if (ui.cycDate) ui.cycDate.textContent = getCycDateString(new Date());
}

function seedSessionFields(){
  const t = genTempC();
  if (ui.tempExt) ui.tempExt.textContent = (t >= 0 ? "+" : "") + t + "°C";
  if (ui.transportId) ui.transportId.textContent = genTransportId();
}

function updateFeedClock(node){
  if (!node) return;
  const now = new Date();
  const hh = pad2(now.getHours());
  const mm = pad2(now.getMinutes());
  node.textContent = `CYC ${getCycDateString(now)} • ${hh}:${mm}`;
}

function startFeed(lineNode, subNode, clockNode, base, subPool, intervalMs){
  if (!lineNode || !subNode || !clockNode) return;
  const feed = shuffle(base.slice());
  let idx = 0;

  const push = () => {
    lineNode.textContent = feed[idx];
    subNode.textContent = subPool[cryptoInt(subPool.length)];
    if (cryptoInt(11) === 0) glitchTextOnce(lineNode);
    idx = (idx + 1) % feed.length;
    updateFeedClock(clockNode);
  };

  push();
  setInterval(push, intervalMs);
  setInterval(() => updateFeedClock(clockNode), 30000);
}

let audioWanted = true;

function setAudioButton(){
  if (!ui.audioBtn) return;
  ui.audioBtn.textContent = audioWanted ? "AUDIO: ON" : "AUDIO: OFF";
}

function tryPlayAudio(){
  const a = ui.ambience;
  if (!a) return;

  a.volume = AUDIO_DEFAULT_VOLUME;

  if (!audioWanted){
    if (!a.paused) a.pause();
    return;
  }

  const p = a.play();
  if (p && typeof p.then === "function"){
    p.then(() => {
      setAudioButton();
    }).catch(() => {
      setAudioButton();
    });
  } else {
    setAudioButton();
  }
}

function stopAudio(){
  const a = ui.ambience;
  if (!a) return;
  a.pause();
}

if (ui.audioBtn){
  ui.audioBtn.addEventListener("click", () => {
    audioWanted = !audioWanted;
    if (!audioWanted) stopAudio();
    else tryPlayAudio();
    setAudioButton();
  });
}

applyBackground();
setSignalBoot();
seedSessionFields();
updateCycClock();
startBootSequence();
startRotations();

setInterval(updateCycClock, 60 * 1000);
setTimeout(setSignalLocked, 2200);

startFeed(
  ui.milLine,
  ui.milSub,
  ui.milClock,
  militaryFeedBase,
  [
    "Protocole sécurisé actif. Priorité aux transmissions opérationnelles.",
    "État-major : surveillance continue des incidents.",
    "Canal réservé. Toute perturbation sera neutralisée.",
    "Ordres transmis aux unités. Exécution attendue.",
    "Réseau militaire : chiffrement renforcé."
  ],
  3800
);

startFeed(
  ui.newsLine,
  ui.newsSub,
  ui.newsClock,
  holonetNewsBase,
  [
    "Bulletin public : diffusion en continu.",
    "Journal : suivi des opérations et annonces officielles.",
    "HoloNet : informations validées par les autorités.",
    "Média : reportage en cours sur les secteurs civils.",
    "Annonce : directives citoyennes actualisées."
  ],
  4100
);

setAudioButton();
tryPlayAudio();
setTimeout(() => {
  tryPlayAudio();
}, AUDIO_RETRY_DELAY_MS);

window.GameDetails = function(servername, serverurl, mapname, maxplayers, steamid, gamemode){
  if (ui.srvName) ui.srvName.textContent = servername ? String(servername).toUpperCase() : "CANAL-SECURE";
  if (ui.mapName) ui.mapName.textContent = formatPlanet(mapname);
  if (ui.gmName) ui.gmName.textContent = gamemode ? String(gamemode).toUpperCase() : "OPÉRATION ACTIVE";

  if (ui.steam64) ui.steam64.textContent = steamid || "—";
  if (ui.imperialId) ui.imperialId.textContent = steam64ToImperialId(steamid || "0");
  if (ui.channelEcho) ui.channelEcho.textContent = "SECURE";
};

window.SetStatusChanged = function(status){
  const s = String(status || "");
  const low = s.toLowerCase();

  if (low.includes("sending client info")){
    setPhase("CLIENT INFO");
    setStatusLine("[SYS] Envoi des informations d’identification…");
  } else if (low.includes("retrieving server info")){
    setPhase("SERVER INFO");
    setStatusLine("[SYS] Récupération des données de liaison…");
  } else if (low.includes("workshop")){
    setPhase("WORKSHOP");
    setStatusLine("[DL] Synchronisation des ressources…");
  } else if (low.includes("mounting")){
    setPhase("MOUNT");
    setStatusLine("[SYS] Montage des modules…");
  } else {
    setPhase("LOADING");
    setStatusLine(`[SYS] ${s}`);
  }
};

window.SetFilesNeeded = function(needed){
  filesNeeded = Number(needed) || 0;
  setFilesText();
};

window.SetFilesTotal = function(total){
  filesNeeded = Number(total) || filesNeeded;
  setFilesText();
};

window.SetFilesDownloaded = function(downloaded){
  filesDownloaded = Number(downloaded) || 0;
  setFilesText();
  if (filesNeeded > 0) setProgress((filesDownloaded / filesNeeded) * 100);
};

window.DownloadingFile = function(fileName){
  const f = String(fileName || "ressource");
  setPhase("DOWNLOAD");
  setStatusLine(`[DL] Téléchargement: ${f}`);

  if (filesNeeded > 0){
    filesDownloaded = Math.min(filesNeeded, filesDownloaded + 1);
    setFilesText();
    setProgress((filesDownloaded / filesNeeded) * 100);
  } else {
    setProgress(Math.min(95, lastPct + 2));
  }
};
