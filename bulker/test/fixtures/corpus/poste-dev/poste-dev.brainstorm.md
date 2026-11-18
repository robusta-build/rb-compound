# Brainstorm : poste-dev — Reclaim background CPU on the dev workstation

**Date :** 2026-06-30
**Feature :** poste-dev
**Participants :** autobrain (autonomous)

> **Note:** All axes completed autonomously by autobrain. Decisions are flagged with **Décision (autonome):** for review.

Source story: `C:\Users\nicolas.zozol\.claude\features\poste-dev\poste-dev.story.md`

Goal of the feature: a reversible PowerShell script (apply / revert) that cleanly disables background CPU consumers (Windows telemetry, Office maintenance, WMI wakeups) on a Windows 11 Enterprise dev box, traces every change, detects GPO-locked items, and produces a before/after diagnostic — without touching Windows Update, Defender/SecurityHealth, CrowdStrike, IntelliJ, Claude Code or Docker.

---

## Business Rules

- **BR1** — No destructive operation is ever performed: scheduled tasks are *disabled* (not deleted), services are *stopped / set to Manual* (not removed). *(from the story)* `(to validate)`
- **BR2** — Every action must be reversible: the script must be able to restore each touched item to its exact prior state. *(from the story)* `(to validate)`
- **BR3** — Every action is traced: what was touched, its state before, and how to revert it. *(from the story)* `(to validate)`
- **BR4** — Windows Update and security components (SecurityHealth / Defender, CrowdStrike) are out of bounds and must never be stopped, disabled, or degraded. *(from the story)* `(to validate)`
- **BR5** — Protected dev tools (IntelliJ / idea64, Claude Code, Docker) must never be impacted by any action. *(from the story)* `(to validate)`
- **BR6** — GPO-locked items are detected, listed as non-modifiable, and left untouched — no bypass attempt. *(from the story)* `(to validate)`
- **BR7** — Office stays functional on demand: maintenance is suppressed in the background but Office can still be launched. *(from the story, Q1)* `(to validate)`
- **BR8** — Apply must be idempotent: running it twice produces the same end state and does not corrupt the saved "before" snapshot. *(defined autonomously — required so a re-run never overwrites the original state with an already-modified one, which would break revert)* `(to validate)`
- **BR9** — The script requires elevation (Administrator) to act on services and system scheduled tasks; without it, it runs in read-only diagnostic mode rather than failing silently. *(defined autonomously — disabling services/tasks needs admin; partial-privilege silent failures would leave an inconsistent state)* `(to validate)`
- **BR10** — Revert only restores items that *this script* actually changed (recorded in the trace); it never blindly re-enables tasks the user or GPO had already disabled. *(defined autonomously — prevents the script from re-arming things it never touched)* `(to validate)`
- **BR11** — CrowdStrike is strictly untouchable: the script never disables it, never queries it, and never requests scan exclusions. Any interaction risks triggering an IT security alert, so CrowdStrike is excluded from the target set entirely. *(per user decision)* `(validated)`

---

## 1. Product Role

**Context:** What is this artifact, and what is it not?

**Options considérées:**
- A: A general-purpose Windows "debloat / optimizer" tool (broad, opinionated, touches many subsystems).
- B: A targeted, reversible apply/revert PowerShell script scoped to the specific background CPU consumers measured on *this* class of dev box.

**Décision (autonome):** Option B — a focused apply/revert/diagnose PowerShell script, not a general debloater. It is explicitly **not** a security tool, not a Windows Update manager, and not a RAM-optimizer.

**Rationale:** The story scopes a precise, measured set of consumers and demands reversibility and safety; a broad debloater would violate BR4/BR6 and add risk without value.

---

## 2. Target Audience

**Context:** Who runs this?

**Décision (autonome):** A single technical persona — a developer/admin on their own Windows 11 Enterprise workstation, comfortable with PowerShell and able to elevate to Administrator. Not an end-user tool, not a fleet/IT-deployment tool.

**Rationale:** The story is first-person developer-on-their-own-box; assuming a technical operator lets the script favor transparency (verbose trace, dry-run) over hand-holding UX.

---

## 3. Core Problem

**Problème:** Background telemetry, Office maintenance tasks, and WMI wakeups consume CPU (measured 83% load, CPU is the bottleneck not RAM) and steal cycles from the legitimate dev tools, degrading the dev experience. There is no easy reversible way to identify and neutralize them and roll back.

**Décision (autonome):** Solve the CPU-contention problem specifically, by neutralizing the named background consumers reversibly while leaving a clean audit trail. RAM-heavy items (Widgets, Teams webviews) are explicitly out of scope here.

**Rationale:** The measured bottleneck is CPU; chasing RAM consumers would not move the needle on the stated problem.

---

## 4. Unique Value Proposition

**Context:** Why this vs. manual tweaking, a generic debloater, or doing nothing?

**Décision (autonome):** A *reversible, traceable, idempotent, GPO-aware* script tuned to this box — every change is recorded and can be undone, and GPO-locked items are surfaced rather than fought. Value = safety + auditability over raw aggressiveness.

**Rationale:** Generic debloaters are destructive and untraceable on an Enterprise machine; manual tweaking is not reproducible. Reversibility + trace is the differentiator and the thing that makes it safe to run on a managed box.

**Alternative considered:** Pure documentation/runbook (no script) — rejected because it is not reproducible and not idempotent.

---

## 5. Functional Scope

**In scope:**
- Diagnose: enumerate target background processes, scheduled tasks, and services with state (active / disabled / GPO-locked).
- Apply: disable the 9 Office scheduled tasks; set `OfficeClickToRun` to Manual; disable the reachable Windows telemetry **and compat-maintenance** scheduled tasks (per user decision 2026-06-30): Application Experience (Microsoft Compatibility Appraiser Exp, MareBackup, PcaPatchDbTask, SdbinstMergeDbTask, StartupAppTask), CEIP (Consolidator, UsbCeip), Feedback/Siuf (DmClient, DmClientOnScenarioDownload), Sustainability (SustainabilityTelemetry, PowerGridForecastTask); neutralize the measured WMI offender = `HP USB-C Dock G5 Insertion Event Filter` binding only (leave `SCM Event Log Filter` intact).
- Revert: restore every item this script changed to its recorded prior state.
- Trace: write a machine-readable + human-readable record of every change.

**Out of scope (explicit):**
- Windows Update, Defender/SecurityHealth, CrowdStrike disabling (BR4).
- RAM-oriented cleanups: Windows Widgets (6 webviews), Teams (8 webviews).
- Uninstalling Office or any product.
- Modifying or bypassing GPO.
- Fleet deployment / multi-machine orchestration.

**Décision (autonome):** Lock scope to the three consumer families (Windows telemetry, Office maintenance, WMI), with diagnose/apply/revert verbs. CrowdStrike is fully out of scope — never touched.

**Rationale:** Matches the story's Definition of Done exactly and keeps the blast radius small and defensible.

---

## 6. Core Features (MVP)

### Feature: Diagnostic snapshot (before/after)

**Capability:** Enumerate the targeted processes, scheduled tasks, and services; report for each its current state (active / disabled / Manual / GPO-locked) and produce a comparable snapshot. Can be run standalone (read-only) and is captured automatically before apply and after apply/revert.

**Acceptance Criteria:**
- Given a box with the named consumers, When diagnostic runs read-only, Then it lists each target item with name, type, and state and writes a timestamped snapshot without changing anything.
- Given a scheduled task that is GPO-locked, When diagnostic inspects it, Then it is reported as `GPO-locked` (non-modifiable), not as a plain active task.
- Given the script is run without Administrator rights, When diagnostic runs, Then it still produces the read-only snapshot and clearly flags which items could not be fully inspected.

**Test Approach:** Pester unit tests with mocked `Get-ScheduledTask` / `Get-Service` / WMI providers covering each state branch; manual integration run on the actual box comparing snapshot vs. Task Scheduler / services.msc.

---

### Feature: Apply (reversible neutralization)

**Capability:** Disable the 9 Office scheduled tasks, set `OfficeClickToRun` to Manual, disable reachable Windows telemetry/compat tasks, and neutralize the offending WMI subscription — recording each item's prior state before changing it.

**Acceptance Criteria:**
- Given a target task in `Ready/Enabled` state, When apply runs as admin, Then the task is disabled and its prior `Enabled` state is recorded in the trace.
- Given `OfficeClickToRun` running as Automatic, When apply runs, Then its start type is set to Manual (service not killed mid-operation in a way that breaks Office on next launch) and prior start type is recorded.
- Given apply has already run once, When apply runs again, Then end state is unchanged and the original "before" snapshot is preserved, not overwritten (idempotence, BR8).
- Given a GPO-locked telemetry task, When apply runs, Then it is skipped and documented as non-modifiable, with no error thrown.

**Test Approach:** Pester tests on a mocked task/service layer asserting state transitions and trace writes; idempotence test running apply twice; manual integration run on the box verifying CPU baseline drop and that Office/IntelliJ/Docker still start.

---

### Feature: Revert (full restore)

**Capability:** Read the trace produced by apply and restore each touched item to its exact recorded prior state; touch nothing the script did not change.

**Acceptance Criteria:**
- Given a trace recording N changed items, When revert runs, Then each of the N items is restored to its recorded prior state and items absent from the trace are left untouched (BR10).
- Given a task that was already disabled before apply (so apply skipped it), When revert runs, Then that task is not re-enabled.
- Given a missing or corrupt trace file, When revert runs, Then it refuses to act and reports the problem rather than guessing.

**Test Approach:** Pester round-trip test: snapshot → apply → revert → snapshot, asserting final state equals initial state; corrupt-trace negative test.

---

### Feature: WMI wakeup identification & neutralization

**Capability:** Identify the WMI event subscription / consumer responsible for `WmiPrvSE.exe` wakeups and the `System` process activity, then disable it reversibly or document it if not neutralizable.

**Acceptance Criteria:**
- Given active WMI subscriptions, When diagnostic runs, Then it lists `__EventFilter` / consumer / binding entries with enough detail to identify the offender.
- Given an identified, modifiable subscription, When apply runs, Then it is neutralized reversibly and recorded in the trace.
- Given a subscription that cannot be safely neutralized (system-critical or GPO-owned), When apply runs, Then it is documented as non-neutralizable and left intact.

**Test Approach:** Manual integration investigation on the box (WMI subscription enumeration) given variability; unit tests on the parsing/classification logic with captured fixture data.

---

## 7. Critical Edge Cases

**Décision (autonome):** Handle these explicitly in the script design:
- **Not elevated** → fall back to read-only diagnostic (BR9), never partial-apply.
- **Re-run apply** → preserve original snapshot, idempotent (BR8).
- **GPO-locked item** → detect via task/service lock indicators, skip, document (BR6).
- **Item already disabled before apply** → record "no change", and revert must not re-enable it (BR10).
- **Corrupt/missing trace on revert** → refuse and report.
- **Service stop racing an in-use Office instance** → prefer set-to-Manual over hard stop to avoid breaking a running Office.
- **WMI subscription is system-critical** → document, do not touch.
- **Locale-dependent task names** → resolve tasks by path/TaskName, not by localized display name, to avoid mis-targeting.

**Rationale:** These are the realistic failure/usage cases on a managed Enterprise box; ignoring them would violate BR2/BR6/BR9/BR10.

---

## 8. Non-Functional Constraints

**Décision (autonome):**
- **Safety first:** no destructive action (BR1); default to dry-run preview before apply.
- **Auditability:** every change written to a human-readable log + machine-readable trace (JSON) used by revert.
- **Idempotence & reversibility** as first-class properties (BR2/BR8).
- **Compliance:** respect Enterprise GPO and security tooling boundaries (BR4/BR6); no GPO bypass.
- **Performance:** the script itself is lightweight and short-running; success is measured by reduced steady-state background CPU, not by script speed.
- **Compatibility:** target Windows PowerShell 5.1 (default on Windows 11) so no extra runtime install is required; avoid PS7-only syntax unless a PS7 path is explicitly chosen later.

**Rationale:** On a managed dev box, trust and reversibility matter more than raw aggressiveness or speed; 5.1 maximizes "runs out of the box."

---

## 9. External Dependencies

**Décision (autonome):** Rely only on built-in Windows surfaces — `ScheduledTasks` module (`Get/Disable/Enable-ScheduledTask`), `Get/Set-Service`, and WMI/CIM cmdlets for event subscription enumeration (no third-party modules). No network dependency. CrowdStrike is never invoked.

**Rationale:** Zero external dependencies keeps the script portable, auditable, and safe to run on a locked-down Enterprise machine.

---

## 10. Major Risks

**Décision (autonome):** Track and mitigate:
- **R1 (adoption/trust):** disabling system tasks on a managed box feels risky → mitigate with dry-run default, full trace, and tested revert.
- **R2 (technical):** revert fails to fully restore → mitigate with round-trip test and refusal on corrupt trace.
- **R3 (compliance):** accidentally fighting GPO or weakening security → mitigate with hard exclusion list (Windows Update, Defender, CrowdStrike) and GPO detection (BR4/BR6).
- **R4 (effectiveness):** WMI offender hard to pin down or non-neutralizable → mitigate by documenting when neutralization isn't safe (graceful degradation).
- **R5 (Enterprise re-arming):** GPO/management re-enables tasks on next policy refresh → accept and document; the script's job is point-in-time, not permanent enforcement.

**Rationale:** The dominant risks are trust and reversibility on a managed machine; the design already centers on those.

---

## Gaps / Open Questions

**G1 — Office service stop vs. set-to-Manual timing:** Setting `OfficeClickToRun` to Manual does not stop a currently-running instance; CPU relief for that service only fully lands after the next reboot/logoff.
*Recommendation:* set to Manual and document that full effect is post-reboot, rather than hard-stopping a possibly in-use service. *Rationale:* avoids breaking a running Office session (BR7) while still removing background activity going forward.
*Note:* lgtm

**G2 — WMI offender identified (MEASURED 2026-06-30):** Read-only diagnostic found exactly two permanent subscriptions in `root\subscription`:
1. `SCM Event Log Filter` (query `select * from MSFT_SCMEventLogEvent`, NTEventLogEventConsumer) — Windows default, **leave intact**.
2. **`HP USB-C Dock G5 Insertion Event Filter`** — polling query `select * from __InstanceCreationEvent WITHIN 15 where targetInstance isa 'Win32_USBHub' ...` bound to a `CommandLineEventConsumer`. The `WITHIN 15` polling (every 15s) is the likely cause of the `WmiPrvSE`/`System` wakeups. Third-party (HP dock software), non-critical, reversibly removable.
*Decision:* apply targets only the HP dock subscription (disable/remove the binding reversibly, after exporting it to the trace); the SCM filter is left untouched. Trade-off: losing the HP dock insertion auto-action — acceptable on a dev box.
*Note:* lgtm

---

## Open Questions

**Q1 :** Target Windows PowerShell 5.1 or PowerShell 7+?
*Recommandation:* target 5.1 (the OS default) so the script runs with no extra install; gate any PS7-only convenience behind a check. *Rationale:* maximizes "runs out of the box" on the Enterprise machine without requiring a runtime install.
*Note:* lgtm

**Q2 :** Should apply default to dry-run (preview) and require an explicit flag to actually change state?
*Recommandation:* yes — `apply` previews by default and requires `-Commit` (or equivalent) to mutate. *Rationale:* on a managed box, an accidental run should never change state silently; preview-first builds trust and supports the diagnostic story.
*Note:* non, pas de flag dasn tous les sens, voir avec l'agent scriptman

**Q3 :** Where should the trace/snapshot files live and what format?
*Recommandation:* a JSON trace (machine-readable, drives revert) plus a human-readable log, stored under a stable per-user path (e.g. `%LOCALAPPDATA%\poste-dev\`) timestamped per run, with the original "before" snapshot protected from overwrite. *Rationale:* JSON makes revert deterministic; a stable path keeps traces findable across runs; protecting the original snapshot enforces BR8.
*Note:* lgtm

**Q4 :** How far to push telemetry given GPO control (story Q2)?
*Recommandation:* disable only the locally-reachable telemetry/compat tasks, document GPO-locked ones, and do not escalate to IT for now. *Rationale:* matches story Q2; telemetry CPU impact is secondary to Office/WMI and GPO is out of a dev box's remit.
*Note:* lgtm

**Q5 :** Verbs/interface shape — one script with `-Mode Diagnose|Apply|Revert`, or separate scripts?
*Recommandation:* a single script with a `-Mode` parameter (Diagnose/Apply/Revert) sharing one target-definition and trace layer. *Rationale:* one source of truth for the target list and trace format keeps apply and revert provably symmetric (BR2/BR10).
*Note:* non, multiple script ; on fait diagnose, puis apply. On fera revert si besoin

---

## Next Steps

1. Review and validate the business rules and `Décision (autonome)` flags above (especially BR8–BR11 defined autonomously).
2. Resolve Open Questions (all prefilled `lgtm`) — confirm PS 5.1 target, dry-run default, trace location/format, telemetry depth, and single-script `-Mode` interface.
3. On the box: run a read-only diagnostic to capture the actual WMI subscription offender and confirm exact scheduled-task paths (closes G2).
4. Proceed to `/concept` (PRD) to specify the script: parameter design, target-definition table, trace schema, GPO-detection logic, and the Pester test plan (incl. apply→revert round-trip and idempotence).


