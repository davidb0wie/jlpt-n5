# 🇯🇵 Application JLPT N5

Application Progressive Web App (PWA) pour l'apprentissage du japonais niveau JLPT N5.

## 📚 Contenu

- **105 Kanji** essentiels avec lectures (onyomi/kunyomi) et exemples
- **14 Compteurs** japonais avec toutes les variations phonétiques
- **60+ Verbes** des 3 groupes avec conjugaisons

## ✨ Fonctionnalités

### Kanji
- **Flashcards** : Étudiez les kanji avec leurs lectures et exemples
- **Quiz** : Testez vos connaissances avec des questions à choix multiples
- **Liste** : Parcourez tous les kanji par catégorie

### Compteurs
- Liste complète avec exemples de 1 à 10
- Indications des changements phonétiques
- Notes spéciales et exceptions

### Verbes
- **Pratique** : Exercices de conjugaison interactifs
- **Liste** : Tous les verbes organisés par groupe

### Autres
- Suivi de progression automatique
- Statistiques de performance
- Fonctionne hors ligne une fois installée
- Design responsive (PC et mobile)

## 🧪 Test Local sur PC

1. Ouvrez simplement le fichier `index.html` dans votre navigateur
2. L'application devrait fonctionner immédiatement !

## 📱 Test sur votre Samsung S23

### Méthode 1 : Serveur local (Recommandé pour test)

1. Sur votre PC, dans ce dossier, lancez :
```bash
python -m http.server 8000
```
ou si vous avez Node.js :
```bash
npx serve
```

2. Trouvez l'adresse IP de votre PC :
   - Windows : `ipconfig` (cherchez l'IPv4)
   - Exemple : 192.168.1.10

3. Sur votre S23 (connecté au même WiFi) :
   - Ouvrez Chrome ou Samsung Internet
   - Allez à : `http://192.168.1.10:8000`
   - L'application devrait s'ouvrir !

4. Pour installer la PWA :
   - Menu (⋮) → "Ajouter à l'écran d'accueil"
   - L'icône apparaîtra sur votre téléphone

### Méthode 2 : GitHub Pages (Pour version finale)

1. Créez un compte GitHub (si vous n'en avez pas)
2. Créez un nouveau repository (dépôt)
3. Uploadez tous les fichiers de ce dossier
4. Dans Settings → Pages, activez GitHub Pages
5. Vous obtiendrez un lien HTTPS (ex: `https://votre-nom.github.io/jlpt`)
6. Ouvrez ce lien sur votre S23 et installez l'app !

## 📂 Structure des fichiers

```
JLPT/
├── index.html              # Page principale
├── styles.css              # Styles de l'application
├── app.js                  # Logique JavaScript
├── manifest.json           # Configuration PWA
├── service-worker.js       # Cache pour mode hors ligne
├── data/
│   ├── kanji.json         # Données des kanji
│   ├── counters.json      # Données des compteurs
│   └── verbs.json         # Données des verbes
└── README.md              # Ce fichier
```

## 💾 Sauvegarde de progression

Votre progression est sauvegardée automatiquement dans le navigateur (localStorage).
Elle persiste même si vous fermez l'application !

## 🔧 Personnalisation

Vous pouvez facilement modifier :
- Les couleurs dans `styles.css` (variables CSS au début du fichier)
- Les données dans les fichiers JSON du dossier `data/`
- Les fonctionnalités dans `app.js`

## 📝 Notes

- L'application nécessite JavaScript activé
- Pour l'installation PWA complète (icône + mode hors ligne), il faut HTTPS
- GitHub Pages fournit HTTPS gratuitement !

## 🎯 Bon apprentissage !

頑張ってください！(Ganbatte kudasai - Bon courage !)
