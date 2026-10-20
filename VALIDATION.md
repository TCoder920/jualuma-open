# Migration validation — 2026-10-20

- Backend tests: **164 passed, 1 skipped**; includes mocked billing/webhook checks.
- Main web app tests: **86 passed** across 24 files.
- Support portal tests: **1 passed**. Marketing tests: **1 passed**.
- Python dependency installation and `pip check`: passed.
- Main web, marketing, and support production builds: passed using localhost URLs.
- API lifespan startup and OpenAPI HTTP response: passed with `APP_ENV=test`.
- Real banking, payments, Firebase, cloud resources, mobile toolchains, and end-to-end external
  integrations: not exercised. Native source and vendored license notices are retained.
- Gitleaks: zero findings in the sanitized export.

## Scope and safeguards

Gitleaks 8.30.1 was installed from the official release and its SHA-256 checked.
Source history and the sanitized export were scanned. Fresh Git history excludes old secrets.
Private exports, logs, local databases, deployment evidence, and generated artifacts are excluded.
Bandit found no high-severity findings in the audited application Python directories.
This is a migration audit, not a claim that the entire upstream framework is vulnerability-free.
No production services, customer data, deployments, banking transactions, or brokerage orders were used.

## Remaining scoped dependency advisories

Python-jose 3.5.0 (`PYSEC-2026-4298`) and ecdsa 0.19.2 (`PYSEC-2026-1325`)
have no fixes listed. Authentication pins RS256 and Plaid verification pins its allowed algorithm;
the reported HMAC algorithm-confusion precondition is not enabled. ECDSA signing/key generation
through the vulnerable pure-Python API is not used. Keep explicit algorithm restrictions and the
cryptography backend. The test runner was upgraded to a patched version.

Npm still flags **braces** through development tooling (18 high findings in the main web dependency
graph; 7 in marketing; 5 in support, including
dependent packages). **extract-zip** remains in optional mobile automation tooling. These are not
shipped in browser bundles or invoked by the documented install/build/test flow. Package install
scripts are disabled, CI is time-limited, and workflows carry no deployment credentials. Do not run
Cypress/Appium download/archive workflows against untrusted archives, or compile untrusted glob
patterns with affected braces versions. No patched release of those two packages was available
at audit time. These optional toolchains require replacement before enabling them.

These findings are disclosed rather than reported as a clean dependency scan. Supported application
paths passed the checks above; unsupported toolchain risks remain outside the validated workflow.

## Licensing and implementation changes

The copyright owner's authorized representative approved AGPLv3 licensing on 2026-10-20.
Proprietary/PolyForm restrictions were replaced for owner-authored code; copyright attribution
and third-party notices remain. Stripe resource conversion supports current SDK objects.
Missing sandbox authentication configuration now produces an action-level error rather than
preventing the local UI from loading. SVG parsing uses defusedxml.
