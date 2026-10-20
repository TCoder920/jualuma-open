# iOS Native Method Runbook

## Scope
- Execute iOS app validation in native simulator context only.
- Reuse Android method phases and command structure.
- Keep local development no-keychain and repository-driven.

## Runtime Origin Rules
- Default native runtime origin is `capacitor://localhost`.
- Native E2E/parity runs must use `IOS_USE_WEB_ORIGIN=false`.
- Do not use Safari-only emulation as proof of native app behavior.
- `http://localhost:5175` is allowed only for optional web-origin debugging, not parity sign-off.
- Android and iOS differ by scheme:
  - Android native WebView baseline here: `https://localhost`.
  - iOS Capacitor native WebView baseline here: `capacitor://localhost`.

## Required Environment
- `.env` (or exported env) must include:
  - `VITE_API_BASE_URL`
  - `TESTMAIL_API_KEY`
- Native auth key resolution is handled by method scripts:
  - key must allow native origin checks for `capacitor://localhost`
  - browser-restricted keys are rejected for native mode

## Command Order (Executable Track)
1. Toolchain doctor:
   - `npm --prefix frontend-app run ios:method:e2e:doctor`
2. Build/sync smoke:
   - `npm --prefix frontend-app run ios:method:e2e:smoke`
3. Signup flow:
   - `IOS_USE_WEB_ORIGIN=false npm --prefix frontend-app run ios:method:e2e:signup`
4. Auth flow:
   - `IOS_USE_WEB_ORIGIN=false npm --prefix frontend-app run ios:method:e2e:auth`
5. MFA + passkey flow:
   - `IOS_USE_WEB_ORIGIN=false npm --prefix frontend-app run ios:method:e2e:mfa-passkey`
6. Full ordered suite:
   - `IOS_USE_WEB_ORIGIN=false IOS_AUTO_BUILD_NATIVE_SHELL=false npm --prefix frontend-app run ios:method:e2e:full`
7. Cleanup of E2E-created accounts:
   - `IOS_USE_WEB_ORIGIN=false npm --prefix frontend-app run ios:method:e2e:cleanup`

## Expected Artifacts
- `.codex-artifacts/ios-e2e/doctor/result.json`
- `.codex-artifacts/ios-e2e/smoke/result.json`
- `.codex-artifacts/ios-e2e/signup/result.json`
- `.codex-artifacts/ios-e2e/auth/result.json`
- `.codex-artifacts/ios-e2e/mfa-passkey/result.json`
- `.codex-artifacts/ios-e2e/full/result.json`
- `.codex-artifacts/ios-e2e/cleanup/result.json`

Native pass criteria:
- `startedWebServer: false` for native-origin runs.
- `webOrigin: "capacitor://localhost"` in signup/auth/mfa-passkey results.
- final route assertions pass (e.g., `/dashboard`, `/plan-selection`).
- cookie banner is absent in iOS app screens (asserted by E2E checks).

## Validation Matrix Commands
- `npm --prefix frontend-app run lint`
- `npm --prefix frontend-app run test -- --run`
- `./scripts/check_gcp_drift.sh`

## Troubleshooting
- Symptom: Identity key rejected for native run.
  - Check: key restrictions include browser referer constraints.
  - Fix: use native-capable key resolved by iOS method scripts.
- Symptom: Login fails with `Your account could not be found`.
  - Check: backend user record not materialized.
  - Fix: ensure provisioning flow includes `POST /api/billing/plans/free`.
- Symptom: Cookie banner appears in iOS native app.
  - Check: iOS runtime gate in `CookieConsentBanner` component.
  - Fix: enforce hidden state for `Capacitor.getPlatform() === 'ios'`.
- Symptom: Appium xctest driver missing.
  - Run: `npx --prefix frontend-app appium driver install xcuitest`

## UI Governance
- Any UI change requires Figma-first spec approval before code changes.
- iOS cookie-banner policy is a governed UI rule: banner must not render in native iOS app.
