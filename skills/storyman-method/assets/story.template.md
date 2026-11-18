# Template — story

Propriétaire : `rb-compound:storyman`. L'agent lit ce fichier à chaque écriture et ne le recopie jamais.

- Obligatoires : Story, Contexte & objectif, Boundaries, Acceptance Criteria (ACTIVE) ou Livré (SUBMITTED). Avant d'écrire, l'agent vérifie qu'aucune ne manque ; une section obligatoire absente d'un document existant est recréée, jamais laissée manquante.
- Optionnelles : les autres. Omises quand elles n'apportent rien, jamais laissées vides.
- L'ordre des sections est celui du template. Aucune section hors template sauf nécessité réelle.
- La section métier optionnelle survit au submit si elle reste vraie. Une story LANDED se lit SUBMITTED. `rb-compound:storyman done` ne change que la ligne Status (`DONE (AAAA-MM-JJ, commit abc1234 sur <branche>)`).

## ACTIVE

```markdown
# Story : <Titre court et parlant>

**Dernière mise à jour :** AAAA-MM-JJ
**Feature :** <feature-slug>
**Infix :** <l'infix de la story — dérive-le lisible du nom de la feature ; il préfixera les R-/AC- du design file. Règles dures : 5 lettres min, 15 max, identifiable par un humain, jamais des initiales (RP interdit, REGPROVISION correct).>
**Status :** ACTIVE

## Story

<En tant que <rôle>, je veux <capacité> afin de <bénéfice>. Si c'est une tâche technique, un énoncé narratif + objectif suffit — ne force pas le format si ça sonne faux.>

## Contexte & objectif

<Pourquoi cette story ? Le problème résolu, pour qui, quelle valeur. 2-3 paragraphes courts. Si un blocage majeur existe, une phrase suffit ici.>

## <Section métier optionnelle>

<Une seule section propre à la story, si elle apporte vraiment (ex. « Quels services déporter »), en puces courtes. À omettre si rien de tel.>

## Acceptance Criteria

- AC-<INFIX>-1 : Given <contexte>, When <action>, Then <résultat observable>
- AC-<INFIX>-2 : …
- AC-<INFIX>-n : Given les cas limites métier, When on les rejoue, Then <cas 1> ; <cas 2> ; <cas 3>

## Boundaries

<Obligatoire. Les blocs de la skill boundaries, zoom complet par défaut. Aucune API touchée → une ligne le dit.>

## Open Questions & Gaps

<Quelques vrais arbitrages pour le PO, au format de la skill open-question. À omettre s'il n'y en a pas.>

- OQ-<INFIX>-1 : <question>
- Proposition : <réponse recommandée>
- Rationale : <pourquoi, court>
- Rloq : true
- Resolution:


## Documentation updates

<Les lieux de doc à modifier ou créer et pourquoi — jamais la doc elle-même, c'est docman qui rédigera après l'implémentation. À omettre si rien à documenter.>

- change <quoi> in <doc/chemin> — why: <raison courte>
- create <quoi> in <doc/chemin> — why: <raison courte>

## Dependencies

- Dep 1: ....
- Dep 2: ....

```

## SUBMITTED

```markdown
# Story : <Titre court et parlant>

**Dernière mise à jour :** AAAA-MM-JJ
**Feature :** <feature-slug>
**Infix :** <INFIX>
**Status :** SUBMITTED (AAAA-MM-JJ, commit abc1234)

## Story

<l'énoncé, inchangé>

## Contexte & objectif

<condensé à 2-3 phrases — une fois livré, la justification longue est périmée>

## Livré

### Requirements

- R-<INFIX>-01 : <une ligne, verbatim du design file>

### Acceptance Criteria

- AC-<INFIX>-1 : <une ligne, verbatim de la story>

## Boundaries

<Obligatoire. Reprise de la story ACTIVE, avec les vrais noms livrés quand ils sont connus. Peut rester incomplète, jamais absente.>

## Décisions

- AAAA-MM-JJ — <décision>. Pourquoi : <rationale courte>.

## Open Questions & Gaps

<seuls les Gaps/OQ encore ouverts ; omise si vide>

## Documentation updates

<au passé une fois livré ; une puce restée à l'impératif = doc encore due (docman). Omise si vide.>

- changed <quoi> in <doc>
- created <quoi> in <doc>

## Dependencies

<les dépendances encore vraies au submit, une dépendance levée suffixée « levée » ; omise si aucune>
```
