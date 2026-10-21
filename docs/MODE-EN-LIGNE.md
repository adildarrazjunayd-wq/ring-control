# Mode en ligne — jouer à deux, chacun chez soi

## Comment ça marche

- Le joueur qui **crée la salle** (l'hôte) fait tourner la partie dans son navigateur.
- L'autre joueur **rejoint avec un code à 5 lettres** : ses actions partent chez l'hôte, et il reçoit la partie vue de son côté
  (la main et le deck de l'hôte lui sont cachés).
- La connexion est directe entre les deux navigateurs (WebRTC). La mise en relation utilise le service gratuit
  **PeerJS** (`0.peerjs.com`), sans compte ni clé.
- **Reconnexion** : l'invité clique « Se reconnecter » (le code reste rempli). Si l'hôte ferme sa page, il clique
  « Reprendre la salle XXXXX » dans *Jouer* : la partie est gardée dans son navigateur.
- La partie solo contre l'IA reste sauvegardée à part : une partie en ligne ne l'écrase jamais.

**Limite connue** : la partie tourne chez l'hôte. Un joueur très bricoleur pourrait regarder les cartes cachées dans
les outils du navigateur. Pour jouer entre amis, ce n'est pas un problème.

## Adresse du jeu en ligne

**https://adildarrazjunayd-wq.github.io/ring-control/** — dépôt public `adildarrazjunayd-wq/ring-control`,
publié le 21/10/2026 (GitHub Pages, branche `main`, dossier racine).

Pour publier une nouvelle version : faire la sauvegarde Git, puis `git push` (dans le panneau Terminal de
l'application, pour que GitHub puisse demander l'autorisation si besoin). La page se met à jour en 1 à 2 minutes.

## Mettre le jeu en ligne gratuitement (GitHub Pages)

Conditions vérifiées le 21/10/2026 (docs GitHub) : avec un compte **GitHub Free**, GitHub Pages ne fonctionne que pour
un dépôt **public** ; site limité à 1 Go (le jeu fait ~36 Mo) et 100 Go de bande passante par mois.
Conséquence : le code et les images des cartes seront visibles publiquement sur GitHub.

1. Ouvrir **GitHub Desktop** → *File* → *Add local repository…* → choisir le dossier `Bureau\JEU-CATCH`.
2. Cliquer **Publish repository**, **décocher** « Keep this code private », puis *Publish repository*.
3. Sur github.com, ouvrir le dépôt → **Settings** → **Pages** → *Source* : « Deploy from a branch »,
   *Branch* : `main` et `/ (root)` → **Save**.
4. Attendre 1 à 2 minutes : l'adresse du jeu s'affiche en haut de la page *Pages*
   (`https://VOTRE-PSEUDO.github.io/NOM-DU-DEPOT/`).
5. Envoyer ce lien à l'adversaire. Chacun ouvre le lien, choisit son deck dans **Jouer**, puis :
   - l'un clique **Créer une partie privée** et envoie le code ;
   - l'autre tape le code et clique **Rejoindre**.

Pour publier une nouvelle version plus tard : dans GitHub Desktop, *Push origin* (les sauvegardes Git sont déjà faites).

## Ce qui a été testé

- 21/10/2026, sur un seul PC avec deux fenêtres séparées (`localhost` et `127.0.0.1`, comme deux ordinateurs) :
  création de salle, connexion, tirage au sort, invocations des deux côtés, attaques dans les deux sens avec fenêtre
  de réponse, dégâts identiques des deux côtés, fin de tour, reconnexion de l'invité.
- 21/10/2026, depuis la version publiée sur GitHub Pages : salle créée sur `github.io`, rejointe depuis une autre
  fenêtre, partie lancée des deux côtés.
- **Pas encore testé** : deux ordinateurs sur deux connexions Internet différentes. Certaines box ou réseaux
  d'entreprise bloquent les connexions directes ; si la connexion échoue, le noter et me le dire.
