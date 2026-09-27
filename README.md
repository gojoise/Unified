<div align="center">

<img src="" alt="Logo Unified" width="120" />

# Unified

### Tous vos jeux réunis en un seul endroit.

<br />

![Version](https://img.shields.io/badge/version-0.1.0-6750A4?style=for-the-badge)
![Statut](https://img.shields.io/badge/statut-en%20développement-F9A825?style=for-the-badge)
![Plateforme](https://img.shields.io/badge/plateforme-Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)

![Electron](https://img.shields.io/badge/Electron-30-47848F?style=flat-square&logo=electron&logoColor=white)
![Vue](https://img.shields.io/badge/Vue-3.4-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)
![Vuetify](https://img.shields.io/badge/Vuetify-3.7-1867C0?style=flat-square&logo=vuetify&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)

</div>

---

<div align="center">

<table>
  <tr>
    <td align="right"><b>Version actuelle</b></td>
    <td><code>0.1.0</code></td>
  </tr>
  <tr>
    <td align="right"><b>Statut</b></td>
    <td>🚧 En développement actif</td>
  </tr>
  <tr>
    <td align="right"><b>Plateforme</b></td>
    <td>Windows 10 / 11 (x64)</td>
  </tr>
  <tr>
    <td align="right"><b>Dernière mise à jour</b></td>
    <td>Septembre 2026</td>
  </tr>
</table>

</div>

---

## 📖 Sommaire

- [Fonctionnalités](#-fonctionnalités)
- [Aperçu](#-aperçu)
- [Installation](#-installation)
- [Développement](#-développement)
- [Architecture](#-architecture)
- [Stockage des données](#-stockage-des-données)
- [Roadmap](#-roadmap)
- [Historique des versions](#-historique-des-versions)
- [Licence](#-licence)

---

## ✨ Fonctionnalités

### 🎮 Bibliothèque de jeux

| Fonctionnalité | Description |
| --- | --- |
| Visualisation | Grille de toutes vos entrées de bibliothèque |
| Ajout / suppression | Sélection d'un `.exe`, avec dialogue de confirmation optionnel à la suppression |
| Reconnaissance du nom | Déduction automatique du titre depuis l'exécutable |
| Lancement | Démarrage du jeu directement depuis la grille |
| Favoris | Étoile sur la vignette, jeux épinglés en tête de grille |
| Tri alphabétique | Bibliothèque ordonnée par nom, favoris d'abord |
| Icône automatique | Icône extraite du `.exe` au moment de l'ajout |
| Dernier lancement | Date du dernier démarrage enregistrée par jeu |
| Voir le dossier | Ouverture de l'explorateur sur l'exécutable, depuis le menu ⋮ de la vignette |

### 🔍 Détection des jeux

| Fonctionnalité | Description |
| --- | --- |
| Ajout manuel | Sélection directe d'un `.exe` |
| Détection semi-auto | Recherche dans les emplacements configurés, avec validation avant ajout |
| Sources reconnues | Manifestes **Steam** (`appmanifest_*.acf`), **GOG** (`goggame-*.info`) et **Xbox / Microsoft Store** (`MicrosoftGame.Config`), sinon heuristique de dossier |
| Jeux Xbox | Nom d'affichage, logo et exécutable lus dans le manifeste ; les packs de DLC sont écartés |
| Choix de l'exécutable | Le binaire principal est élu par score ; les autres restent proposés en alternative |
| Correction avant ajout | Titre éditable, exécutable interchangeable, dossier excluable des prochains scans |
| Déduplication | Jeux déjà en bibliothèque, emplacements imbriqués et dossiers ignorés sont écartés |
| Mémoire des refus | Les candidats laissés décochés ne sont plus reproposés — réinitialisable dans les paramètres |

Quatre façons de lancer une recherche :

1. **À l'ajout d'un emplacement** — scan ciblé sur le dossier qui vient d'être choisi
2. **Vignette « Rechercher des jeux »** dans la bibliothèque
3. **Bouton « Scanner maintenant »** dans les paramètres
4. **Au démarrage** si le scan automatique est activé — silencieux, avec une notification cliquable en cas de nouveautés

À la validation, **« Ajouter »** enregistre les jeux cochés et retient les décochés pour ne plus les proposer ; **« Plus tard »** ne mémorise rien. Deux listes séparées gardent la trace des refus, chacune réinitialisable depuis les paramètres :

| Mémoire | Alimentée par | Effet |
| --- | --- | --- |
| Jeux écartés | Candidats décochés à la validation | Le dossier n'est plus proposé |
| Dossiers exclus | Action « Ne plus proposer » du menu ⋮ | Le dossier n'est plus proposé |

### 🪟 Fenêtre

| Comportement | Détail |
| --- | --- |
| Géométrie mémorisée | Taille, position et état maximisé repris d'une session à l'autre |
| Garde-fou d'affichage | La position n'est restaurée que si la fenêtre retombe sur un écran branché |
| Dimensions | 1280 × 720 au premier lancement, minimum 960 × 540 |
| Barre système | Icône de notification avec « Ouvrir Unified », « Ouvrir le wiki » et « Quitter » |
| Au lancement d'un jeu | Ne rien faire, réduire, fermer dans le tray ou quitter — au choix dans les paramètres |
| Instance unique | Relancer Unified ramène la fenêtre existante au lieu d'en ouvrir une seconde |

### ⌨️ Raccourcis clavier

Actifs uniquement lorsque la fenêtre d'Unified a le focus — rien n'est capté au niveau du système.

| Raccourci | Action |
| --- | --- |
| `Ctrl` + `I` | Ouvrir les outils de développement |
| `F1` | Ouvrir le wiki GitHub |
| `Ctrl` + `Q` | Quitter l'application |

### ⚙️ Paramètres

Menu dédié accessible depuis la bibliothèque, réparti en trois onglets. Chaque changement est persisté immédiatement.

| Onglet | Paramètres |
| --- | --- |
| **Général** | Notifications, confirmation avant suppression, emplacements de recherche (+ « Scanner maintenant »), scan au démarrage, réinitialisation des mémoires de recherche |
| **Apparence** | Thème sombre |
| **Système** | Mises à jour automatiques, lancement au démarrage de Windows, minimisation dans le tray, comportement au lancement d'un jeu |

> ⚠️ Le thème sombre, les mises à jour automatiques et le lancement au démarrage de Windows sont présents dans l'interface et persistés, mais pas encore appliqués — voir la [roadmap](#-roadmap).

### 🔔 Notifications

- Service de notifications global : `info`, `succès`, `avertissement`, `erreur`
- Retour utilisateur sur toutes les actions (ajout, lancement, suppression, paramètres)
- Remontée systématique des erreurs du processus principal vers l'interface

---

## 🖼 Aperçu

> _Captures d'écran à venir._
>
> <!-- ![Bibliothèque](docs/screenshots/library.png) -->
> <!-- ![Paramètres](docs/screenshots/settings.png) -->

---

## 📦 Installation

### Depuis les sources

```bash
# Cloner le dépôt
git clone https://github.com/gojoise/Unified.git
cd Unified

# Installer les dépendances
npm install

# Lancer l'application
npm run dev
```

### Prérequis

- **Windows 10 / 11** (x64)
- **Node.js** 18 ou supérieur
- **npm** 9 ou supérieur

---

## 🛠 Développement

| Commande | Description |
| --- | --- |
| `npm run dev` | Démarre Vite + Electron avec rechargement à chaud |
| `npm run build` | Vérifie les types (`vue-tsc`), construit et empaquette via `electron-builder` |
| `npm run preview` | Prévisualise le build de production |
| `npm run format` | Formate les fichiers `.ts` et `.vue` de `src/` avec Prettier |

`npm run build` génère un installeur NSIS dans `release/{version}/` :

```
release/0.1.0/Unified-Windows-0.1.0-Setup.exe
```

> ⚠️ Unified ne cible actuellement que **Windows x64**. Le support Linux et macOS n'est pas assuré.

---

## 🏗 Architecture

Unified est une application **Electron + Vue 3** répartie sur deux processus isolés.

```
Unified/
├── electron/                 # Processus principal (backend)
│   ├── main.ts               # BrowserWindow, raccourcis clavier, handlers IPC
│   ├── libraryManager.ts     # CRUD de la bibliothèque, détection du titre
│   ├── gameScanner.ts        # Détection semi-automatique (scan des emplacements)
│   ├── settings.ts           # Lecture / écriture des paramètres
│   ├── windowState.ts        # Mémorisation de la géométrie de la fenêtre
│   └── preload.ts            # Contrat d'API exposé au renderer (window.ipcRenderer)
│
├── src/                      # Processus de rendu (frontend Vue)
│   ├── main.ts               # Bootstrap Vue + Vuetify + Vue Router
│   ├── components/           # Un .vue par écran, sa logique dans le .component.ts voisin
│   │   ├── unified.vue       # Racine <v-app> avec <router-view>
│   │   ├── library.vue       # Grille de jeux
│   │   ├── scan-dialog.vue   # Validation des candidats détectés
│   │   └── settings.vue      # Paramètres par onglets
│   ├── services/             # Composables (library, favorites, scan, settings, notification, shell)
│   ├── types/                # Types partagés du renderer (scan, paramètres)
│   └── assets/               # Feuilles de style par écran
│
├── public/                   # Ressources statiques (logo, icônes)
└── electron-builder.json5    # Configuration d'empaquetage
```

### Flux de données

```
Composant Vue
     ↓
Composable (useLibrary / useFavorites / useSettings…)
     ↓
window.ipcRenderer.<méthode>(...)      (pont déclaré dans preload.ts)
     ↓  IPC
Processus principal
     ↓
Fichier JSON sur disque
```

Le retour suit le chemin inverse : le processus principal émet sur l'IPC, le composable met à jour son état réactif, et l'interface se rafraîchit.

### Contraintes techniques

- **Isolation du contexte activée** : toute communication renderer ↔ main passe obligatoirement par le pont `preload` (`window.ipcRenderer`)
- **TypeScript strict** sur l'ensemble du projet
- **Vuetify 3 exclusivement** pour l'interface — pas de Tailwind ni de framework CSS additionnel
- Routes : `/` (bibliothèque) et `/settings` (paramètres)

---

## 💾 Stockage des données

Les données sont conservées en clair dans le dossier utilisateur d'Electron :

| Fichier | Contenu |
| --- | --- |
| `user-library.json` | Liste des jeux, chemins, icônes, dates de lancement, favoris |
| `settings.json` | Préférences, emplacements de recherche, jeux écartés et dossiers exclus |
| `window-state.json` | Taille, position et état maximisé de la fenêtre |

Ces fichiers se trouvent dans :

```
%APPDATA%\Unified\
```

> 💡 Ces fichiers survivent à une désinstallation (`deleteAppDataOnUninstall: false`) — pratique pour réinstaller sans perdre sa bibliothèque.

---

## 🗺 Roadmap

### 🎮 Bibliothèque

- [x] Tri alphabétique de la bibliothèque
- [ ] Barre de recherche / filtre par nom
- [ ] Tri par critères multiples (nom, dernier lancement, temps de jeu, date d'ajout)
- [ ] Vue liste vs vue grille (toggle)
- [ ] Zoom sur la grille (taille des cartes réglable)
- [x] Jeux favoris / épinglés en haut
- [x] Option pour ouvrir le dossier du jeu

### 🏷 Métadonnées des jeux

- [x] Métadonnées de base (icône, date de dernier lancement)
- [ ] Nombre de lancements
- [ ] Suivi du temps de jeu (compteur par session)
- [ ] Améliorer l'affichage des jeux (vraie cover art)

### 🔍 Détection des jeux

- [ ] Améliorer la détection manuelle
- [x] Détection semi-auto (recherche dans les dossiers définis dans les paramètres)
- [ ] Détection automatique des jeux
- [ ] Reconnaître un emplacement pointé trop haut (dossier contenant des dossiers de jeux)
- [ ] Surveillance des emplacements (détection sans relancer l'application)
- [ ] Reconnaissance des jeux via émulateur (ROMs et émulateur associé)

### ⚙️ Paramètres

- [ ] Thème clair / sombre
- [ ] Démarrage automatique avec Windows
- [x] Réduction dans la barre système (system tray)
- [x] Comportement au lancement d'un jeu (ne rien faire / réduire / fermer dans le tray / quitter)

### 🔔 Notifications

- [x] Service de messages pour afficher des notifications
- [x] Remontée des erreurs via le service de notifications

### 🖥 Interface

- [ ] Wizard d'initialisation au premier lancement
- [ ] Bouton aide

---

## 📌 Historique des versions

### `0.1.0` — Septembre 2026

_Version en cours de développement._

- Bibliothèque de jeux : ajout, suppression, lancement, tri alphabétique
- Jeux favoris épinglés en tête de grille
- Action « Voir le dossier » depuis le menu de la vignette
- Détection semi-automatique : scan des emplacements configurés, validation avant ajout, mémoire des refus
- Détection du titre par manifeste Steam / GOG / Xbox, avec repli sur l'arborescence
- Extraction automatique de l'icône depuis le `.exe`
- Enregistrement de la date de dernier lancement
- Menu de paramètres par onglets
- Réduction dans la barre système et comportement configurable au lancement d'un jeu
- Mémorisation de la taille, de la position et de l'état maximisé de la fenêtre
- Raccourcis clavier limités à la fenêtre de l'application
- Service de notifications global

---

## 📄 Licence

Aucune licence n'est encore définie pour ce projet. Tant qu'un fichier `LICENSE` n'est pas ajouté, tous droits réservés par défaut.

<div align="center">
<br />

Développé par [**gojoise**](https://github.com/gojoise)

</div>
