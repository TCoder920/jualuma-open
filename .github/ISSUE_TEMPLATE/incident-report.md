---
name: Incident Report
about: Security incident detection, triage, containment, recovery, and postmortem record
title: "IR-YYYY-MM-DD-<short-name>: <summary>"
labels: ["incident", "security", "incident-active", "evidence-needed"]
assignees: []
---

## 1) Incident Metadata

- Incident ID:
- Severity (`sev-1`/`sev-2`/`sev-3`/`sev-4`):
- Status (`investigating`/`contained`/`monitoring`/`resolved`):
- Environment (`dev`/`stage`/`prod`):
- Detection time (UTC):
- Reporter:

## 2) Detection Signal

- Source (monitoring/log/report):
- Trigger condition:
- Earliest known suspicious timestamp (UTC):
- Affected systems/components:

## 3) Exposure and Impact

- Data types potentially involved:
- User/business impact:
- Current blast radius assessment:
- Is unauthorized success confirmed? (`yes`/`no`/`unknown`):

## 4) Evidence Log

| UTC Timestamp | Source | Query/Command/Link | Key Finding |
|---|---|---|---|
| | | | |

## 5) Timeline

| UTC Timestamp | Event | Actor | Decision/Action | Result |
|---|---|---|---|---|
| | | | | |

## 6) Exploitation Classification

- `Benign Automation`
- `Recon Activity`
- `Attempted Exploitation`
- `Confirmed Compromise`

Selected classification:

Confidence (`Low`/`Medium`/`High`):

## 7) Containment and Recovery Actions

- Action 1:
- Action 2:
- Validation checks:

## 8) Required Follow-Ups

- [ ] Secret rotation needed
- [ ] IAM review needed
- [ ] Additional logging/alerts needed
- [ ] Hardening PR(s) opened
- [ ] Final incident report added to `docs/incidents/`

## 9) Closure Criteria

- [ ] Root cause identified or bounded
- [ ] Active risk removed or accepted with documented rationale
- [ ] Postmortem completed
- [ ] `incident-active` label removed
- [ ] `incident-postmortem` label added
