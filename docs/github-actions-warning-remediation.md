# GitHub Actions Warning Remediation

Reviewed runs: recent `Dev` branch runs via `gh run list` and `gh run view --log`.

## Warning Matrix

| Area | Warning | Root cause | Repo action |
| --- | --- | --- | --- |
| `frontend-app` lint | lint warnings in CI | unresolved eslint violations | keep lint debt visible; reduce warning count before tightening `--max-warnings` |
| `support-portal` lint | lint warnings in CI | unresolved eslint violations | same treatment as `frontend-app` |
| Android build | `flatDir` repository warning | Gradle repo declaration is legacy | migrate local AAR resolution to supported Maven layout |
| Android build | Gradle deprecation warnings | build scripts/plugins use deprecated APIs | run with `--warning-mode all`, catalog exact plugin/task offenders, patch before next AGP upgrade |
| iOS build | splash asset has 3 unassigned children | asset catalog inconsistency | clean `LaunchScreen` / splash asset assignment in Xcode project |
| iOS build | `Build SharedCore` script has no outputs | Xcode reruns script on every build | declare output files or mark script intentionally always-run with justification |
| iOS build | AppIntents metadata skipped | no AppIntents bundle content | confirm this is intentional; otherwise add metadata generation target |
| deploy image build | Cloud SDK PATH warning | PATH mutated during image build | normalize tool install layer or explicitly export desired PATH once |
| deploy image build | `apt` / `update-alternatives` warnings | package install side effects inside Docker build | pin package steps and reduce noisy alternatives setup |
| deploy image build | pip root-user warning | pip run as root in container build | use virtualenv in build stage or accept with documented exception |
| frontend build | Vite chunk-size warning | main app bundle exceeds threshold | split billing/dashboard-heavy paths or raise threshold with rationale |
| org policy workflow | `Skipping disallowed member...` | guardrail intentionally reports denied principals | keep as explicit warning; document as expected behavior |

## Resolution Process

1. Classify each warning as `product bug`, `tooling debt`, or `expected guardrail`.
2. Fix `product bug` warnings in code or project config.
3. For `tooling debt`, add an owning issue and a concrete removal condition.
4. For `expected guardrail`, keep the warning but document it in workflow comments or runbook text.
5. Re-run the affected workflow and capture before/after evidence in the promotion PR.

## High-Confidence Next Fixes

1. Break up the `frontend-app` bundle to remove the Vite chunk warning.
2. Add outputs to the iOS `Build SharedCore` script phase.
3. Replace Android `flatDir` usage with a supported repository layout.
4. Reduce lint warnings in `frontend-app` and `support-portal` until CI can enforce stricter limits.
