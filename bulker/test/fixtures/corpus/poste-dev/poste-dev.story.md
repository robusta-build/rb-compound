# Story : Reprendre le contrôle des process Windows inutiles sur le poste de dev

**Dernière mise à jour :** 2026-06-30
**Feature :** poste-dev

## Story

En tant que développeur sur un poste Windows modeste, je veux diagnostiquer et neutraliser de façon réversible les process et tâches planifiées de fond qui consomment du CPU sans servir à coder, afin de rendre les cycles CPU à mes vrais outils (IntelliJ, Claude Code, Docker).

## Contexte & objectif

La machine est un Windows 11 Enterprise 4 cœurs / 8 threads avec 31.7 GB de RAM (13 GB libres). Le goulot mesuré est le CPU, pas la RAM : charge constatée à 83 %. La RAM n'est donc pas le sujet. IntelliJ (idea64, ~3.5 GB) et Claude Code sont les consommateurs légitimes à protéger.

Le problème : une couche de télémétrie, de maintenance Office et de réveils WMI tourne en fond et provoque des pics CPU réguliers qui dégradent l'expérience de dev. On veut identifier ces consommateurs, les réduire ou les désactiver proprement, et garder une trace de ce qui a été touché pour pouvoir tout remettre en l'état.

Contrainte d'entreprise à acter : le poste est en Enterprise, donc une partie des tâches de télémétrie peut être pilotée par GPO et rester non modifiable en local. Ces cas seront constatés et documentés, pas forcés.

## Consommateurs de fond identifiés

- Télémétrie / compatibilité Windows : Microsoft Compatibility Appraiser (`CompatTelRunner`), Customer Experience Improvement Program (`Consolidator`, `UsbCeip`), Feedback/Siuf (`DmClient`, `DmClientOnScenarioDownload`), SustainabilityTelemetry.
- Maintenance Office : 9 tâches planifiées sous `\Microsoft\Office\` (Automatic Updates 2.0, Background Push Maintenance, Feature Updates, Performance Monitor, Startup Maintenance…) + le service `OfficeClickToRun`.
- Réveils WMI : `WmiPrvSE.exe` (2 instances) et le process `System`, souvent réveillés par des abonnements / consommateurs WMI.
- Contexte connexe déjà repéré, hors cœur de cette story : Widgets Windows (6 webview) et Teams (8 webview, dont un à 562 MB) — plutôt RAM que CPU, à traiter à part.

## Definition of done

- On dispose d'un diagnostic reproductible : lister les process et tâches planifiées qui consomment du CPU de fond, avec leur état (actif / désactivé / piloté par GPO).
- Les tâches de télémétrie et de maintenance Office citées sont désactivées **de façon réversible** (désactivation de tâche planifiée / arrêt de service, jamais de suppression destructive).
- L'origine des réveils WMI est identifiée et l'abonnement fautif est neutralisé ou documenté s'il n'est pas neutralisable.
- Chaque action est tracée (quoi, état avant, comment revenir en arrière) afin de pouvoir tout restaurer.
- Aboutissement visé : un script PowerShell réutilisable qui applique et permet d'annuler ces réglages (le détail d'implémentation relève du PRD, pas de cette story).
- Ne touche pas à Windows Update ni à la sécurité (SecurityHealth / Defender) ; ne casse pas IntelliJ, Claude Code ni Docker.
- Les tâches verrouillées par GPO sont listées comme non modifiables, sans tentative de contournement.

## Open Questions

Q1 : Jusqu'où désactiver la maintenance Office, sachant que la machine sert surtout à coder ?
Proposition : désactiver les 9 tâches planifiées Office et passer `OfficeClickToRun` en démarrage manuel plutôt que de désinstaller Office. On garde Office fonctionnel à la demande tout en supprimant son activité de fond, et c'est trivial à réactiver.
Note : lgtm

Q2 : Que fait-on des tâches de télémétrie pilotées par GPO et non modifiables en local ?
Proposition : on les documente comme bloquées et on s'arrête là, sans escalade IT pour l'instant — leur impact CPU est secondaire face à Office et WMI, et toucher à la GPO d'entreprise sort du périmètre d'un poste de dev.
Note : lgtm

Autre note : crowdstrike est installé. Il est hors de question de desactiver crowdstrike, mais on peut envisager de mettre le repertoire c:/code comme "sûr" ou sans scan continu, si c'est possible
