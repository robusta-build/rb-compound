# Bloc Progress

Un design doc dont l'implémentation a commencé porte un bloc `## Progress` : une ligne par groupe de Requirements, ce qui est fait et ce qui ne l'est pas, lu d'un coup d'œil à la reprise sans ouvrir le code ni les tests. Le code reste la référence, la ligne `**Status:**` reste le seul état du document.

Il n'appartient pas à designman, même patron que la ligne de statut : le main agent l'écrit et le rafraîchit pendant l'implémentation ; `tddman` et `codeman` continuent de ne rien écrire dans le design doc ; designman ne compte jamais. Un DRAFT n'en porte jamais — rien n'est implémenté, chaque ligne lirait `TODO 0/n`, et un bloc qui ne dit que « pas commencé » coûte du contexte sans rien apprendre. En mode update, quand designman ramène le document en DRAFT parce que les contrats ont changé, il **supprime** le bloc avec le cycle : les groupes bougent avec les contrats, un bloc qui survit à un changement de contrat est un bloc périmé.

Place : une vraie section `##` portant un seul bloc en fence sans tag de langage, entre l'en-tête et `## Goal`. Le fence est ce qui sauve l'alignement chez les lecteurs à police proportionnelle ; le tag de langage est écarté parce que la coloration syntaxique recolore les cellules de la jauge.

Rendu normatif — 14 items faits sur 36, d'où les 38 % :

````
## Progress — APPROVED 38%

```
      Pool Catalog              ████████████████████  8/8    ✅
 WIP  F1 AMM Source UniV2       ██████████░░░░░░░░░░  2/4
 WIP  F2 CEX Orderbook Binance  █████░░░░░░░░░░░░░░░  1/4
 WIP  F3 Oracle Abstraction     ███████████████░░░░░  3/4
TODO  D2 Competition Detector   ░░░░░░░░░░░░░░░░░░░░  0/4
TODO  Acceptance Criteria       ░░░░░░░░░░░░░░░░░░░░  0/12
```
````

Les lignes : une par sous-section `###` de `## Requirements`, dans l'ordre du corps et avec le libellé repris verbatim, puis une dernière ligne `Acceptance Criteria`. Un `## Requirements` sans sous-section donne une seule ligne `Requirements`. Le bloc est le seul endroit où la progression apparaît : aucune ligne `R-`, aucune ligne `AC-`, aucun titre du corps ne porte de marqueur d'état.

Grammaire de ligne, cinq colonnes à largeur fixe :

- préfixe d'état, 4 colonnes alignées à droite — `TODO` quand `fait` vaut 0, ` WIP` quand `0 < fait < total`, quatre espaces quand le groupe est clos. Du texte, jamais un emoji : un emoji occupe deux colonnes là où `WIP` en occupe trois, donc un préfixe emoji décale chaque ligne d'une quantité différente et l'alignement du bloc meurt.
- deux espaces, puis le libellé, complété à la largeur du plus long libellé du bloc.
- deux espaces, puis la jauge : exactement 20 cellules, `█` (U+2588) pleines et `░` (U+2591) vides.
- deux espaces, puis le compte `fait/total`, complété à la largeur du plus long compte du bloc.
- `✅` en fin de ligne, sur les seuls groupes clos, après au moins deux espaces. Seule colonne sans contrainte d'alignement : rien ne la suit.

Aucun autre marqueur nulle part — la jauge dit déjà « en cours » et « pas commencé », un second glyphe ne serait que du bruit — et aucune annotation de report type `R84 → V1` : une exigence qui change de périmètre quitte le document par `designman update`, pas par une note en marge.

Arithmétique de la jauge : `floor(fait × 20 / total)` cellules pleines, bornée à 1 au minimum dès que quelque chose est fait, à 19 au maximum tant qu'il reste quelque chose. 20 pleines veulent donc dire clos et 0 pas commencé — les deux lectures que l'œil prend en premier sont exactes, jamais un artefact d'arrondi. Plancher plutôt qu'arrondi : une jauge qui arrondit vers le haut sur-déclare, et cette vue n'a autorité pour sur-déclarer quoi que ce soit.

En-tête du bloc : `## Progress — <STATUS> <N>%`. `<STATUS>` recopie verbatim le token de la ligne `**Status:**`, quel qu'il soit. `<N>` vaut `floor(Σ fait × 100 / Σ total)`, pondéré par les items, pour qu'un lecteur qui additionne les comptes affichés en dessous retombe sur le même nombre. Cet en-tête est une copie et jamais une source : ce n'est pas une ligne `**Status:**`, `grep -m1 '^\*\*Status:\*\*'` tranche toujours sur l'en-tête du fichier, et si les deux divergent c'est l'en-tête qui gagne et le bloc qui est périmé.

Ce qui ne revient pas avec ce bloc, et qui reste banni : la règle « Progress is truth », les états sur les lignes `R-`/`AC-`, la table markdown, le pourcentage qui ferait autorité contre le code. Le bloc disparaît d'ailleurs quand le document passe IMPLEMENTED, supprimé dans l'édition même qui écrit le statut — toutes ses lignes seraient closes, il ne ferait que répéter la ligne de statut à dix fois le prix.
