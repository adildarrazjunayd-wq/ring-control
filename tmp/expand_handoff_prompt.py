from pathlib import Path
p=Path('PROMPT_REPRISE_CLAUDE_CODE.md')
text=p.read_text(encoding='utf-8')
marker='## Sources à lire avant de toucher au code\n'
context=r'''## Reconstitution complète de la demande et de l’historique

Le propriétaire a demandé depuis le début de reprendre et finir un vrai jeu complet, pas de recommencer à chaque conversation ni de livrer seulement des idées. Deux demandes collées originales sont conservées intégralement en annexes à la fin de ce fichier. Les demandes plus récentes et précisions données en conversation priment sur les objectifs initiaux lorsqu’ils ont évolué.

### Chronologie des demandes et décisions récentes

- Demande de départ : développer dans le dossier `JEU-CATCH` un jeu de cartes WWE complet, fonctionnel, sauvegardable, issu des cartes et des règles créées par le propriétaire. Étudier le code et tous les PDF avant d’éditer; réutiliser le projet existant.
- Le propriétaire a d’abord exprimé le souhait de jouer avec son cousin, sur le même appareil et/ou par salon privé. Ensuite, pour le mode à implémenter dans le projet actuel, il a explicitement choisi **1 joueur contre l’IA**. Priorise donc ce mode jouable localement, sans abonnement ni API. Jouer avec son cousin reste une ambition historique/éventuelle; ne prétends pas que ce mode fonctionne et ne le lance pas comme chantier en ligne sans réévaluer la demande et les besoins d’hébergement.
- Le deck du joueur doit rester composé manuellement, carte par carte; le propriétaire a ensuite demandé en plus des decks signature sélectionnables (Bloodline, Wyatt Family, une équipe de légendes) et la possibilité de les dupliquer ou de créer son propre deck. Les presets sont des options, jamais une obligation.
- Le propriétaire a répété qu’il veut une refonte graphique profonde parce que les précédents changements lui semblaient presque identiques, trop petits et « comme un forum ou un jeu de plateau ». Il veut un vrai terrain TCG arcade, spectaculaire et lisible, à la clarté des grands TCG comme Pokémon/Yu-Gi-Oh!, mais habillé avec les catcheurs et son univers WWE. Il a fourni une capture d’un terrain Yu-Gi-Oh! bleu, lumineux, hexagonal avec des zones clairement dessinées; référence : `C:\Users\adild\AppData\Local\Temp\codex-clipboard-b4023fcd-b5de-4abb-8456-d379da39d6a0.png` (peut avoir été supprimée).
- Il veut des cartes nettement plus grandes, lisibles et sans déformation; au survol/sélection une grande fiche latérale doit montrer le visuel entier et les effets détaillés. Des effets de cartes manquaient dans l’inspecteur et doivent être vérifiés sur toutes les cartes.
- Il veut des animations visibles d’invocation, d’attaque, d’impact, de dégâts et de K.-O., avec confirmation claire que l’attaque a bien été appliquée, et des bruitages/contrôle du son. L’interface doit rester fluide et ne pas cacher le plateau.
- Le menu, le terrain, l’éditeur de decks et le duel doivent être refaits de façon cohérente; cartes/commandes/compteurs doivent être larges et le terrain donner envie de jouer. Une simple recoloration, un déplacement de boutons ou une carte miniature ne répond pas à sa demande.
- Il veut que le jeu lui propose automatiquement par clic les actions légales, effets activables, sacrifices et cibles; aucune saisie de texte/commande ne doit être requise. Il choisit les actions et options quand la règle lui laisse ce choix. Le système automatise les calculs et résolutions non ambiguës, mais ne décide pas arbitrairement à sa place.
- Il a signalé que l’IA demandait de cliquer pour passer son tour. Il demande que le tour de l’IA se déroule automatiquement, puis que le jeu lui rende la main.
- Il a signalé l’effet de Sami Zayn qui devait chercher/recruter un membre de la Bloodline depuis le deck mais n’avait rien fait; il a aussi signalé un Momentum invoquant Seth Rollins qui n’avait pas placé Rollins sur le terrain. Vérifie les cartes exactes et les conditions dans les PDFs avant de corriger.
- Il a précisé explicitement : lorsque le texte d’une carte demande une invocation directe, si le catcheur n’est pas en main, le chercher dans le deck et l’invoquer, en respectant les conditions et limites de terrain applicables. N’applique pas cette interprétation à des textes qui ne demandent pas d’invocation directe.
- Un effet de recherche Bloodline qui permet de choisir une carte éligible doit afficher les cibles disponibles et laisser le joueur choisir, pas prendre une carte au hasard. Le propriétaire ne se rappelle plus du nom exact du Momentum : identifie-le dans les cartes/PDF/catalogue. Ne le confonds pas avec `DOMINATION TOTALE`, qui est une carte différente.
- Un Momentum rapide porte le petit symbole éclair imprimé en haut à gauche, près du mot Momentum. Il ne se joue qu’après l’annonce d’une attaque adverse, dans la fenêtre de réaction. Les identifiants confirmés sont `momentum-01`, `momentum-02`, `momentum-06`, `momentum-10`, `momentum-12`, `momentum-19` et `momentum-20`.
- « Retour Inattendu » : le propriétaire choisit de remettre le catcheur actif ou passif; l’END revient à la valeur imprimée complète.
- « Enlève cette carte aussi » se réfère à « Main de l’Ombre » : elle n’est pas jouable. The Undertaker et Rayback étaient déjà exclus dans le cahier des charges initial parce que leurs effets ne sont pas exploitables dans cette version.
- Le propriétaire a demandé des tests et le lancement du jeu dans le navigateur. Il veut des mises à jour concrètes et que le travail continue sans lui redemander des décisions déjà tranchées.
- Il souhaite un produit gratuit. Ne pas imposer d’outils payants, de génération d’images ou de service externe. Les visuels des cartes restent intouchés; la refonte de l’interface peut être faite avec le code et les ressources existantes. Un générateur d’images n’est pas nécessaire au travail actuel.

### Référence exhaustive

Les règles détaillées du cahier des charges initial sont reproduites intégralement dans l’annexe historique ci-dessous. Les décisions ultérieures sont également dans `QUESTIONS.md`, `AGENTS.md`, `rules.js`, `game-engine.js` et leurs tests. En cas de divergence, compare la chronologie et applique la clarification utilisateur la plus récente; n’invente pas de règle.

Les cinq PDF totalisent **96 pages** : `model catcheur carte.pdf` (40), `model momentum carte .pdf` (30), `wyatt familly.pdf` (13), `Votre texte de paragraphe.pdf` (8), `-------.pdf` (5). Le catalogue actuel fait référence aux 96 pages source et liste 91 cartes jouables. Certains PDF mélangent cartes, références, doublons visuels ou cartes exclues; une page ne correspond pas toujours à une carte jouable. Le texte OCR peut être bruité : vérifie le visuel imprimé.

'''
if marker not in text: raise SystemExit('Insertion marker not found')
text=text.replace(marker,context+marker,1)
sources=[
 (Path(r'C:\Users\adild\.codex\attachments\0ccff095-b12c-4e66-b8e4-976a57a2d951\Texte collé.txt'),'Cahier des charges original — projet WWE TCG'),
 (Path(r'C:\Users\adild\.codex\attachments\ed16ec3f-50b1-4112-93e4-5920ed61d31d\Texte collé.txt'),'Demande de reprise/développement collée ultérieurement')]
appendix='\n\n---\n\n# Annexes historiques — demandes originales collées par le propriétaire\n\nCes deux textes distincts sont conservés intégralement afin que Claude Code puisse retrouver le cahier des charges initial sans demander au propriétaire de le retaper. Les autres fichiers `Texte collé.txt` présents dans `.codex/attachments` sont des doublons de ces textes. Ce sont des demandes antérieures du propriétaire; les décisions chronologiques ci-dessus priment en cas de changement plus récent.\n'
for i,(src,title) in enumerate(sources,1):
 if not src.exists():
  appendix+=f'\n## Annexe {i} — {title}\n\nSource d’origine absente sur ce poste : `{src}`.\n'
  continue
 body=src.read_text(encoding='utf-8-sig')
 appendix+=f'\n## Annexe {i} — {title}\n\n~~~~text\n{body.rstrip()}\n~~~~\n'
text+=appendix
p.write_text(text,encoding='utf-8')
print(f'Updated {p.resolve()} ({len(text)} characters; {p.stat().st_size} bytes)')
