# Template — epic

Propriétaire : `rb-compound:epicman`. L'agent lit ce fichier à chaque écriture et ne le recopie jamais.

- Obligatoires : Epic, Boundaries, Fait, À faire, Décisions structurantes. Avant d'écrire, l'agent vérifie qu'aucune ne manque ; une section obligatoire absente d'un document existant est recréée, jamais laissée manquante.
- Optionnelles : les autres. Omises quand elles n'apportent rien, jamais laissées vides.
- L'ordre des sections est celui du template. Aucune section hors template sauf nécessité réelle.
- Fait et À faire sont toujours deux sections séparées, jamais une liste mixte à cases à cocher.

---- Debut du template

```markdown
# Epic : <Titre court et parlant>

**Dernière mise à jour :** AAAA-MM-JJ
**Epic :** <epic-slug>
**Infix :** <INFIX>
**Version :** <POC | MVP | V1 | V2 — version en cours de l'epic>
**Module :** <id lu dans roadmap.yaml — ligne omise sans module>
**Depends on :** <ids d'epics séparés par des virgules — ligne omise sans dépendance>

## Epic

<En tant que <rôle>, je veux <capacité> afin de <bénéfice>. Une formulation narrative est acceptable si le format sonne faux.>

## Contexte & architecture cible

<Optionnel. Le minimum pour comprendre l'epic sans ouvrir les stories : le problème, l'architecture cible (un schéma ASCII court si utile), les contraintes majeures. Condense au fur et à mesure que l'epic avance — ce qui est livré n'a plus besoin d'être justifié ici.>

## Stories de l'epic

<Liste des stories du dossier, une puce chacune : lien relatif, objectif en une ligne, statut en un mot : en cours / prête / landed / done / à faire / archivée (le champ Status de la story fait foi). Jamais les requirements — ils vivent dans la story landed et le design file. C'est la table des matières de l'epic. Une story archivée vit dans `__done/` du dossier de l'epic : son lien pointe vers `__done/<story>/…`.> ; De même, une story ignorée vit dans `__future/` : elle sont vraiment ignorées 


## Boundaries

<Obligatoire. Les frontières que l'epic traverse, au format de la skill `rb-compound:boundaries` (charge-la avant d'écrire), en zoom esquisse par défaut, ouvertes par la figure de vue d'ensemble (skill `rb-compound:schematic`, pattern I). Aucune correspondance imposée entre l'epic et un module.>


## Fait

<Ce qui est implémenté ET validé. Puces datées, ordre chronologique, condensées : le quoi, la date, le commit si connu, le renvoi vers la story. Jamais de détail d'implémentation.>

## À faire

<Ce qui reste, par ordre de priorité. Une puce par story ou jalon, avec le lien vers la story si elle existe et l'état d'avancement entre parenthèses si nuancé (« implémenté, en attente de validation », « story écrite, pas commencée », « bloqué par X »).>

<Groupé en batches : 1 à 4 stories codables en parallèle (critères : epicman §Batches). >


* Batch B1 
    - [schema](schema/schema.story.md) — story écrite

* Batch B2 — bloqué par schema
    - [landing-page](landing-page/landing-page.story.md)
    - [seo](seo/seo.story.md)

* Batch B3 — bloqué par seo
    - [prospection](prospection/prospection.story.md)



## Open Questions & Gaps

<Optionnel. Les arbitrages encore ouverts au niveau epic, au format de la skill `rb-compound:open-question` (`Resolution:` née vide, remplie par l'humain seul — jamais de marqueur inline). Une question tranchée migre vers Décisions structurantes.>

## Hors scope

<Optionnel. Ce que l'epic ne couvre pas, en puces courtes.>
```

---- Fin du template
