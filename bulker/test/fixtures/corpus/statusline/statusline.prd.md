# PRD: Status line maison pour Claude Code CLI

**Status:** [APPROVED]
**Last updated:** 2026-06-29

> - DRAFT: Coding should not start, requirements being defined
> - APPROVED: Code can start, requirements stable
> - IMPLEMENTED: Tests passing, feature complete
> - ITERATING: Modifying existing code, PRD being updated

## Progress

| Section | Status | Progress |
|---------|--------|----------|
| Context | ✅ Defined | 100% |
| Scope | ✅ Defined | 100% |
| Requirements: Segments | ✅ Complete | 6/6 |
| Requirements: Robustesse & Adaptation | ✅ Complete | 4/4 |
| Requirements: Intégration | ⏳ In Progress | 2/3 |
| Acceptance Criteria | 🧪 Tests passing | 8/8 |
| Theme | ✅ Defined | Cockpit HUD |
| **Overall** | **APPROVED** | **92%** |

## Parent PRD

- N/A (feature racine, outillage personnel)

## Child PRDs

- N/A

## Context

En session Claude Code, le terminal n'affiche aucun état de session : modèle actif, branche git, coût, contexte restant, quota — tout est invisible, il faut deviner ou couper le flux. L'objectif est une status line maison, dense et lisible d'un coup d'œil, à l'opposé de ccstatusline (powerline, thèmes, UI React) : un seul script shell + `jq`, branché sur le mécanisme `statusLine` de Claude Code, sans dépendance lourde ni surface de configuration.

Source : `statusline.story.md` et `statusline.brainstorm.md` (10 axes décidés, 10 business rules, 7 Open Questions tranchées). Le payload stdin réel a été capturé (CLI v2.1.185) et sert de fixture de test : `fixtures/real-payload.json`.

## Decision Log

| Date | Option | Decision | Rationale |
|------|--------|----------|-----------|
| 2026-06-29 | Framework (ccstatusline) vs script maison | **Script maison** | Profil mono-utilisateur expert ; soustraction délibérée, code auditable éditable en secondes |
| 2026-06-29 | Une ligne vs deux | **Une ligne dense par défaut** | Scan plus rapide, économise la hauteur d'écran ; compactage si terminal étroit |
| 2026-06-29 | Ordre des segments | **lieu → modèle → contexte → quota 5h → coût** | Lieu glané le plus souvent (gauche), métriques à droite |
| 2026-06-29 | Branche git : JSON vs git | **Appel git** | Le payload réel ne contient PAS la branche en session normale (`worktree.*` seulement en `--worktree`) |
| 2026-06-29 | État sale git | **Différé** | `git status --porcelain` scanne l'arbre → coûteux sur le hot path ; reporté/caché via `refreshInterval` |
| 2026-06-29 | Segment quota 5h | **Inclus (validé utilisateur)** | `rate_limits.five_hour.used_percentage` utile à un dev qui enchaîne les sessions |
| 2026-06-29 | Badge 200k : flag binaire rouge vs gradué | **Gradué orange 200k / rouge 400k sur tokens réels** | Le flag rouge `!200k` contredisait `ctx 20%` vert sur fenêtre 1M ; le badge `Nk` calculé donne un signal cohérent et gradué |

## Scope

**In scope:**
- Script shell unique `.claude/statusline.sh` lisant le JSON stdin via `jq`, écrivant une ligne sur stdout
- Segments (gauche → droite) : lieu (dossier projet + branche git), modèle (+ badge effort si non-défaut), contexte %, quota 5h %, coût USD + lignes session
- Branche git obtenue par `git symbolic-ref --short HEAD` (synchrone, O(1))
- Hiérarchie par couleur ANSI + seuils d'alerte (contexte, quota)
- Tolérance aux champs absents (chaque champ manquant masque son segment, jamais d'erreur)
- Adaptation basique à la largeur via `COLUMNS` (forme compacte, jamais de wrap)
- Variables de réglage (seuils, ordre/activation des segments) en tête de script
- Câblage dans `settings.json` + `chmod +x`
- Tests pilotés par fixtures (JSON → assertions sur stdout)

**Out of scope:**
- Powerline, thèmes, gradients, séparateurs décoratifs
- Plusieurs status lines, widgets de commande custom, UI de config
- Widgets PR/MR, usage hebdo Sonnet/Opus, email du compte, timer de bloc
- État sale git (différé — voir Open Questions)
- Liens cliquables OSC 8
- Support Windows / PowerShell
- Affichage `fast_mode`, `thinking`, `output_style`, `version`, repo owner sur la ligne principale

## Requirements

### Segments

**Last updated:** 2026-06-29
**Test:** `bash features/statusline/tests/render.test.sh`
**Progress:** 0/6 (0%)

- ✅ R-STATUSLINE-01: Segment lieu — afficher le nom de base de `workspace.project_dir` suivi de la branche git obtenue via `git -C "$project_dir" symbolic-ref --short HEAD`. Hors dépôt git → afficher le dossier seul, sans erreur. (BR1)
- ✅ R-STATUSLINE-02: Segment modèle — afficher `model.display_name`. Ajouter un badge effort compact uniquement quand `effort.level` n'est pas le niveau par défaut (référence : `high`). (BR6)
- ✅ R-STATUSLINE-03: Segment contexte — afficher `context_window.used_percentage`, coloré par seuil (vert ≤60, jaune 60–85, rouge >85). Calcul basé sur `used_percentage` pré-calculé, jamais sur un 200k codé en dur. (BR3, BR4)
- ✅ R-STATUSLINE-04: Badge token gradué — afficher un badge `Nk` à côté du contexte, calculé sur les tokens réels combinés (`context_window.total_input_tokens` + `total_output_tokens`, le premier incluant déjà le cache) : rien sous `TOKEN_WARN` (200k), orange dès 200k, rouge dès `TOKEN_CRIT` (400k). Découplé du % de la barre (sur fenêtre 1M, 200k = 20% vert mais reste à signaler). Seuils tunables. Remplace l'ancien flag binaire `exceeds_200k_tokens`. (BR4)
- ✅ R-STATUSLINE-05: Segment quota 5h — afficher `rate_limits.five_hour.used_percentage`, coloré par les mêmes seuils que le contexte (vert/jaune/rouge). Champ absent → segment masqué. (BR3, BR4, BR1)
- ✅ R-STATUSLINE-06: Segment coût — afficher `cost.total_cost_usd` (2 décimales) et les lignes session `cost.total_lines_added` / `cost.total_lines_removed` (forme `+N/-M`). Reflète la session courante. (BR7)

### Robustesse & Adaptation

**Last updated:** 2026-06-29
**Test:** `bash features/statusline/tests/render.edge.test.sh`
**Progress:** 0/4 (0%)

- ✅ R-STATUSLINE-21: Tolérance aux champs absents — tout champ manquant masque proprement son segment via défauts `jq // empty`, jamais d'erreur ni de ligne cassée. (BR1)
- ✅ R-STATUSLINE-22: Entrée vide ou JSON malformé sur stdin → sortie ligne minimale ou vide, exit 0, aucune trace d'erreur shell. (BR1, BR10)
- ✅ R-STATUSLINE-23: Terminal étroit → compaction pilotée par la largeur visible mesurée (ANSI strippé) : la ligne complète n'est compactée que si elle dépasse réellement `COLUMNS`, dans l'ordre coût → badge effort + troncature dossier. Une ligne qui tient n'est jamais compactée. Jamais de retour à la ligne involontaire. (BR2)
- ✅ R-STATUSLINE-24: Hot path — rendu sub-100ms, lecture seule (aucune mutation fichier/git/settings), aucun appel réseau, aucun `git status` synchrone (seul `symbolic-ref` autorisé). (BR8, BR9, BR10)

### Intégration

**Last updated:** 2026-06-29
**Test:** vérification manuelle en session live (DoD)
**Progress:** 0/3 (0%)

- ✅ R-STATUSLINE-41: Script `.claude/statusline.sh` exécutable (`chmod +x`) et câblé dans `settings.json` sous `statusLine` (`type: command`).
- ✅ R-STATUSLINE-42: Variables de réglage (seuils 60/85, effort par défaut, activation/ordre des segments) regroupées et commentées en tête de script ; README écrit (segments + tunables + entrée settings.json).
- ❌ R-STATUSLINE-43: Rendu vérifié dans une vraie session Claude Code (à faire après câblage settings.json).

## Dependencies

- **Depends on:** `jq` (présent : `/opt/homebrew/bin/jq`), terminal ANSI (macOS/zsh), contrat `statusLine` Claude Code (confirmé v2.1.185)
- **Blocks:** rien

## Open Questions

Q1 : « Effort par défaut » — comment définir le seuil de non-affichage du badge effort ?
Recommandation: traiter `high` comme défaut (c'est `effortLevel` dans settings.json) et n'afficher le badge que pour `low`/`medium`/`xhigh`/`max`. Exposer cette valeur de référence en variable de tête de script pour la rendre ajustable.
Note : lgtm

Q2 : Indicateur d'arbre git sale — le garder différé ou l'ajouter en cache ?
Recommandation: livrer sans. Le branch via `symbolic-ref` est O(1) et synchrone, mais `git status --porcelain` scanne l'arbre. Si l'indicateur s'avère indispensable à l'usage, l'ajouter en check caché/throttlé via `refreshInterval`, jamais en `git status` inconditionnel par refresh.
Note : lgtm

Q3 : Stratégie de compaction sur terminal étroit — supprimer ou tronquer ?
Recommandation: supprimer d'abord les segments de plus basse priorité (coût, puis badge effort) avant de tronquer le nom de dossier ; lieu + contexte sont les cibles de regard de plus haute valeur. Garder l'ordre de priorité explicite dans le script.
Note : lgtm

## Acceptance Criteria

### Theme

> **Theme:** Cockpit HUD (tableau de bord de pilote)
>
> Tous les scénarios de test utilisent ce thème : un pilote lit son HUD d'un coup d'œil, chaque instrument est dense et codé par couleur — exactement le besoin d'une status line. Personnage récurrent : la pilote Nadia.
> New theme for this feature.

### Criteria

- [x] AC-STATUSLINE-01: Given la pilote Nadia est dans `.claude` sur la branche `main`, when le HUD se rend avec la fixture réelle, then le segment de gauche affiche le basename réel `.claude` suivi de `main`, branche issue de `git symbolic-ref`. (R-STATUSLINE-01)
- [x] AC-STATUSLINE-02: Given le payload indique `model.display_name = "Opus 4.8"` et `effort.level = "high"`, when le HUD se rend, then le segment modèle affiche `Opus 4.8` sans badge effort ; mais avec `effort.level = "max"`, un badge effort compact apparaît. (R-STATUSLINE-02)
- [x] AC-STATUSLINE-03: Given `context_window.used_percentage = 7`, when le HUD se rend, then le segment contexte est vert ; à 70 il est jaune, à 90 il est rouge. (R-STATUSLINE-03, BR4)
- [x] AC-STATUSLINE-04: Given un contexte combiné de 233k tokens sur une fenêtre 1M (soit `ctx` vert à ~23%), when le HUD se rend, then un badge `233k` orange apparaît à côté du contexte ; à 420k le badge passe rouge ; sous 200k aucun badge n'est affiché. (R-STATUSLINE-04, BR4)
- [x] AC-STATUSLINE-05: Given `rate_limits.five_hour.used_percentage = 10`, when le HUD se rend, then le segment quota 5h affiche `10%` en vert ; si le champ est absent, le segment quota disparaît sans casser la ligne. (R-STATUSLINE-05, BR1)
- [x] AC-STATUSLINE-06: Given `cost.total_cost_usd = 2.3135` avec `total_lines_added = 365` et `total_lines_removed = 0`, when le HUD se rend, then le segment de droite affiche `$2.31` et `+365/-0`. (R-STATUSLINE-06)
- [x] AC-STATUSLINE-07: Given Nadia lance Claude Code dans un dossier hors dépôt git, when le HUD se rend, then le segment lieu montre le dossier seul, sans erreur, et un `{}` ou une stdin vide produit une ligne minimale avec exit 0. (R-STATUSLINE-21, R-STATUSLINE-22)
- [x] AC-STATUSLINE-08: Given `COLUMNS = 60`, when le HUD se rend, then la sortie tient dans la largeur sans wrap (segments de basse priorité supprimés en premier). (R-STATUSLINE-23)
- [x] All automated tests pass (`render.test.sh`, `render.edge.test.sh`) — 46/46
- [x] Edge cases covered in `features/statusline/tests/render.edge.test.sh`
