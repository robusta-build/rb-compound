# Story : Status line maison pour Claude Code CLI

**Dernière mise à jour :** 2026-06-29
**Feature :** statusline

## Story clarifiée

En tant que dev hardcore utilisant Claude Code en terminal, je veux une status line maison, dense et lisible d'un coup d'œil, affichée sous le prompt, afin de garder en permanence sous les yeux l'état de ma session (où je suis, sur quoi je code, ce que ça coûte, et combien de contexte il me reste) sans avoir à taper de commande.

C'est une story technique d'outillage : produire un script shell branché sur le mécanisme `statusLine` de Claude Code. Le script reçoit un JSON sur stdin et écrit une ou deux lignes formatées sur stdout. Pas de framework, pas d'UI interactive, pas de dépendance lourde : du shell + jq, maison et minimaliste.

## Contexte & objectif

Aujourd'hui le terminal n'affiche aucune status line : pour connaître le modèle actif, la branche, le coût de la session ou le contexte restant, il faut deviner ou couper le flux. L'écosystème propose des solutions très riches (ccstatusline : powerline, thèmes, gradients, jusqu'à 3 lignes, widgets PR, usage hebdo, UI React/Ink). Trop lourd et trop habillé pour le besoin.

L'objectif est l'inverse : une status line minimaliste, maison, qui tient sur une ou deux lignes, sans fioriture décorative, avec uniquement l'info utile à un dev qui enchaîne les sessions. Dense mais pas brouillon : la couleur sert à hiérarchiser et alerter, pas à décorer. On s'inspire de l'état de l'art pour le choix des champs (modèle, dossier, git, coût, contexte), on jette le reste.

## Contrat (entrées / sorties)

Entrée : un objet JSON sur stdin, fourni par Claude Code à chaque rafraîchissement. Champs disponibles pertinents pour cette story (noms exacts, à confirmer pour ceux marqués en Open Question) :

- `model.display_name` — modèle actif
- `workspace.current_dir`, `workspace.project_dir` — dossier courant / racine projet
- `workspace.git_worktree`, `worktree.branch` — worktree / branche
- `cost.total_cost_usd`, `cost.total_duration_ms`, `cost.total_lines_added`, `cost.total_lines_removed`
- `context_window.used_percentage`, `context_window.context_window_size`, `exceeds_200k_tokens`
- `output_style.name`, `version`, `effort.level`
- `COLUMNS` / `LINES` (variables d'environnement) pour s'adapter à la largeur du terminal

Sortie : une ou deux lignes sur stdout, colorées en ANSI. Forme cible (proposition, à arbitrer en Open Question) :

- Segment modèle : `display_name` (+ niveau d'effort si != défaut)
- Segment lieu : nom du dossier projet + branche git, branche en couleur d'alerte si l'arbre est sale
- Segment contexte : pourcentage utilisé du contexte, coloré par seuil (vert / jaune / rouge), badge si dépassement 200k
- Segment coût : coût session en USD + lignes +/- de la session

Livrables observables :
- un script exécutable `.claude/statusline.sh`
- l'entrée `statusLine` ajoutée dans `.claude/settings.json`

## Périmètre

Dans le périmètre :
- Script shell unique lisant le JSON stdin via jq et écrivant la status line
- Sélection minimaliste des segments : modèle, dossier projet, branche + état git, contexte utilisé, coût + lignes session
- Hiérarchie par couleur ANSI et seuils d'alerte (contexte, git sale)
- Tolérance aux champs absents : un champ manquant masque son segment, jamais d'erreur ni de ligne cassée
- Adaptation basique à la largeur du terminal (`COLUMNS`) : version compacte si étroit
- Câblage dans `settings.json` et `chmod +x`

Hors périmètre :
- Powerline, thèmes, gradients, séparateurs décoratifs
- Plusieurs status lines indépendantes, widgets de commande custom
- Widgets PR/MR, usage hebdo Sonnet/Opus, email du compte, timer de bloc
- UI interactive de configuration (React/Ink ou autre)
- Liens cliquables OSC 8 (reporté, voir Open Questions)
- Support Windows / PowerShell (voir Open Questions)

## Prérequis

* Prérequis 1 : jq installé pour parser le JSON sur stdin en bash
    - type : technique
    - statut : OK (présent sur la machine : /opt/homebrew/bin/jq)
* Prérequis 2 : Mécanisme statusLine de Claude Code (script reçoit JSON sur stdin, écrit sur stdout, une ligne echo = une ligne de status)
    - type : connaissance
    - statut : OK (contrat technique officiel fourni)
* Prérequis 3 : Noms exacts des champs JSON émis sur stdin par la version installée de Claude Code
    - type : connaissance
    - statut : OK (payload réel capturé le 2026-06-29 sur CLI v2.1.185, stocké en fixture : features/statusline/fixtures/real-payload.json)
    - note : la branche git ET l'état sale sont ABSENTS du JSON en session normale → le script doit appeler git lui-même (voir brainstorm Q1/Q2)
* Prérequis 4 : Droit d'écriture sur .claude/settings.json et .claude/statusline.sh
    - type : accès/autorisation
    - statut : OK (repo de config de l'utilisateur, sur sa machine)
* Prérequis 5 : Terminal supportant les couleurs ANSI
    - type : technique
    - statut : OK (macOS/zsh, terminal de l'utilisateur)

## Definition of Done

- [ ] Le script `.claude/statusline.sh` est exécutable (chmod +x) et configuré dans settings.json sous `statusLine`
- [ ] Avec un JSON d'exemple complet sur stdin, le script affiche les segments retenus sur une à deux lignes, lisibles et hiérarchisés par couleur
- [ ] Un champ JSON absent masque proprement son segment, sans erreur ni ligne cassée
- [ ] Le pourcentage de contexte change de couleur selon les seuils (vert / jaune / rouge) et signale le dépassement 200k
- [ ] La branche git apparaît, avec mise en évidence quand l'arbre de travail est sale
- [ ] Sur terminal étroit, la sortie reste lisible (version compacte ou troncature, pas de retour à la ligne intempestif)
- [ ] Le rendu réel est vérifié dans une vraie session Claude Code (pas seulement avec un JSON simulé)
- [ ] Documentation courte écrite : ce que chaque segment affiche et comment ajuster les seuils

## Open Questions

Q1 : Une seule ligne dense ou deux lignes ?
Proposition : partir sur une seule ligne, quitte à passer en deux si ça déborde sur terminal étroit. Pour un profil hardcore, une ligne dense scanne plus vite et mange moins de hauteur d'écran. Deux lignes resteraient une option d'ajustement, pas le défaut.
Note : lgtm

Q2 : Quels segments exactement, et dans quel ordre de gauche à droite ?
Proposition : modèle, dossier projet, branche+git, contexte %, coût+lignes. Ordre proposé : lieu (dossier + branche) à gauche puisque c'est ce qu'on regarde le plus, puis modèle, puis les métriques (contexte, coût) à droite. À toi de trancher l'ordre selon ton réflexe de lecture.
Note : lgtm

Q3 : Faut-il afficher le niveau d'effort, le output style et la version de Claude Code ?
Proposition : non par défaut, pour rester dense. Le niveau d'effort mérite peut-être un petit badge uniquement quand il n'est pas au défaut (high), car c'est une info qui change le comportement. Version et output style : hors ligne principale, ils encombrent plus qu'ils n'aident au quotidien.
Note : lgtm

Q4 : Quels seuils de couleur pour le contexte utilisé ?
Proposition : vert jusqu'à 60%, jaune de 60 à 85%, rouge au-delà de 85%, plus un badge explicite si `exceeds_200k_tokens`. Ce sont des seuils de bon sens à ajuster une fois en usage réel.
Note : lgtm

Q5 : Liens cliquables OSC 8 (ouvrir la PR, le dossier) — dans le périmètre ?
Proposition : hors périmètre pour cette story. Ça dépend du terminal (iTerm2/Kitty/WezTerm) et ça ajoute de la complexité pour un gain faible vu qu'on a écarté le widget PR. À garder pour une itération ultérieure si le besoin émerge.
Note : lgtm

Q6 : Support Windows / PowerShell ?
Proposition : hors périmètre. La cible confirmée est macOS/zsh et le script s'appuie sur bash + jq. Un portage PowerShell serait une story séparée si le besoin apparaît un jour.
Note : lgtm

Q7 : Détection de l'état git (arbre sale) — via les champs JSON ou via un appel git dans le script ?
Proposition : le JSON expose le worktree et la branche mais pas clairement l'état propre/sale. Plutôt qu'un appel `git status` à chaque rafraîchissement (coût, latence), commencer sans l'indicateur sale et l'ajouter seulement s'il s'avère indispensable, en s'appuyant sur le `refreshInterval` pour ne pas spammer git. À valider selon ce que le JSON réel contient (lié à Q on the field names).
Note : lgtm
