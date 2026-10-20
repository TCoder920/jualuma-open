# iOS Method Execution Contract (Android Parity Baseline)

## Purpose
- Define the iOS-native execution track using the same method phases as Android: `doctor`, `smoke`, `auth`, `signup`, `mfa-passkey`, `full`, `cleanup`.
- Keep all execution CLI-first and repository-driven.
- Keep local dev no-keychain by default.

## Non-Negotiable Rules
- No direct runtime break-glass edits for normal implementation.
- Use existing backend/API contracts and dev services as source of truth.
- No Flutter/wrapper-first paths.
- Exclude manual Apple account setup unless signing/distribution is a hard blocker.
- Native iOS parity execution must use `capacitor://localhost` (not Safari-only emulation).
- iOS cookie banner must not render in native app runtime.

## Method Parity Map
| Method phase | Android baseline intent | iOS implementation command (this repo) |
|---|---|---|
| `doctor` | Verify local toolchain and prerequisites | `./mobile/scripts/validate-mobile-toolchain.sh` plus `xcrun simctl list devices` and `npx --prefix frontend-app appium driver list --installed` |
| `smoke` | Build app shell end-to-end in local dev mode | `npm --prefix frontend-app run build` -> `npx --prefix frontend-app cap sync ios` -> `MOBILE_ENV_FILE=.codex-artifacts/mobile.env MOBILE_TARGET_ENV=dev ./mobile/scripts/build-ios-nokeychain.sh` |
| `auth` | Validate login/auth journey | `npm --prefix frontend-app run ios:method:e2e:auth` |
| `signup` | Validate signup + OTP journey | `npm --prefix frontend-app run ios:method:e2e:signup` |
| `mfa-passkey` | Validate passkey MFA journey | `npm --prefix frontend-app run ios:method:e2e:mfa-passkey` |
| `full` | Run ordered full suite | `npm --prefix frontend-app run ios:method:e2e:full` |
| `cleanup` | Remove e2e-created test state | `npm --prefix frontend-app run ios:method:e2e:cleanup` |

## Strict Dependency Order (IOSD-001 to IOSD-020)
1. `IOSD-001`: Finalize this parity contract and command/dependency map.
2. `IOSD-002`: Verify iOS CLI toolchain availability.
3. `IOSD-003`: Install/verify Appium iOS driver (`xcuitest`).
4. `IOSD-004`: Validate driver install state in local CLI.
5. `IOSD-005`: Build web assets and sync iOS Capacitor shell.
6. `IOSD-006`: Implement iOS signup automation flow shell.
7. `IOSD-007`: Run baseline build/test/lint matrix for iOS path.
8. `IOSD-008`: Validate simulator launch and target stability assumptions.
9. `IOSD-009`: Add method command wiring for iOS E2E phases.
10. `IOSD-010`: Complete OTP retrieval and verify-email route assertions.
11. `IOSD-011`: Add diagnostics and rerun-safe failure capture.
12. `IOSD-012`: Stabilize signup/auth race conditions.
13. `IOSD-013`: Add token fallback strategy for session handoff.
14. `IOSD-014`: Wire full-suite orchestration and cleanup ordering.
15. `IOSD-015`: Run reliability-focused reruns and close flaky paths.
16. `IOSD-016`: Execute full validation matrix and capture artifacts.
17. `IOSD-017`: Post execution evidence into tracker fields.
18. `IOSD-018`: Update repository iOS setup/test runbook docs.
19. `IOSD-019`: Summarize blockers/manual dependencies with owners.
20. `IOSD-020`: Finalize tracker completion and promotion-ready summary.

## Acceptance for IOSD-001
- Parity contract is explicit and repository-backed.
- iOS method command map is defined and references concrete commands.
- Dependency order for `IOSD-001` through `IOSD-020` is locked for execution.

## References
- `mobile/qa/ios-native-method-runbook.md`
