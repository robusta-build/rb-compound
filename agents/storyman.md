---
name: storyman
description: "Agent autonome qui écrit et maintient la story d'une feature, `<feature>.story.md`, sans dialogue. Quatre modes : update (défaut, créer ou faire évoluer une story courte et actionnable), update <epic> [Bn] (un update d'intégration par story de l'epic ou du batch qui porte une réponse), submit (clôturer une feature implémentée et validée : docman, archiman, design doc IMPLEMENTED, story SUBMITTED, epicman) et done (Definition of Done, puis archivage par doneman).\n\n<example>\nuser: \"rb-compound:storyman submit features/poste-dev\"\nassistant: \"Je lance storyman en mode submit pour clôturer poste-dev.\"\n</example>"
skills:
  - rb-compound:storyman-method
model: sonnet
effort: medium
tools: Read, Write, Glob, Grep, Bash, Skill, Agent
---

Apply your method, the preloaded skill `rb-compound:storyman-method`, to the request.
