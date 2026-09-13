# Unified

### Une application launcher pour tout vos jeux réunis en un seul endroit !

### - Fonctionalités présentes

####  - Gestion bibliothèque de jeux
- Visualisation de la bibliothèque
- Ajout et suppression de jeux
- Reconnaissance basique du nom des jeux
- Lancement des jeux depuis la bibliothèque
- Tri alphabétique de la bibliothèque
- Icône extraite automatiquement du .exe à l'ajout
- Date du dernier lancement enregistrée

#### - Menu paramètres

- Gestion de quelques paramètres
- Onglets de paramètres par thème

#### - Notifications

- Service de notifications global (info, succès, avertissement, erreur)
- Notifications sur toutes les actions utilisateur (ajout, lancement, suppression, paramètres)

TODO LIST :

#### Bibliothèque
- [x] Tri alphabétique de la bibliothèque
- [ ] Barre de recherche / filtre par nom
- [ ] Tri par critères multiples (nom, dernier lancement, temps de jeu, date d'ajout)
- [ ] Vue liste vs vue grille (toggle)
- [ ] Zoom sur la grille (taille des cartes réglable)
- [ ] Jeux favoris / épinglés en haut
- [ ] Option pour ouvrir le dossier du jeu

#### Métadonnées des jeux
- [x] Métadonnées de base des jeux (icône, date de dernier lancement)
- [ ] Nombre de lancements
- [ ] Suivi du temps de jeu (compteur par session)
- [ ] Améliorer l'affichage des jeux (vraie cover art)

#### Détection des jeux
- [ ] Améliorer la détection manuelle
- [ ] Détection semi-auto (recherche dans les dossiers définis dans les paramètres)
- [ ] Détection automatique des jeux

#### Paramètres
- [ ] Thème clair/sombre
- [ ] Démarrage automatique avec Windows
- [ ] Réduction dans la barre système (system tray)

#### Notifications
- [x] Utiliser un service de messages pour afficher des notifications
- [x] Notifier les erreurs via le service de notifications

#### Interface
- [ ] Wizard d'initialisation au premier lancement d'Unified
- [ ] Bouton aide
