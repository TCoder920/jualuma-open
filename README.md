# JuaLuma Open

Personal and household finance software with budgeting, account aggregation, financial insights, and support tools.

Collaborative development is welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Local development

Use Python 3.12 and Node.js 22.21 or newer. Start from a fresh clone with no production credentials.

```sh
python3.12 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn backend.main:app --host 127.0.0.1 --port 8001
```

The default APP_ENV=test skips cloud initialization and background jobs. SQLite supports isolated tests; the full application schema and migrations require PostgreSQL with pgvector. Authentication and connected finance flows require local mocks or separately configured sandbox integrations. Native builds require their platform SDKs and are not covered by the web build.

In another terminal, install and start the web interface:

```sh
cd frontend-app
npm ci --ignore-scripts
npm run dev -- --host 127.0.0.1
```

## Validation

```sh
python scripts/run_tests.py
(cd frontend-app && npm ci --ignore-scripts && npm run build)
(cd frontend-marketing && npm ci --ignore-scripts && npm run build)
(cd support-portal && npm ci --ignore-scripts && npm run build)
```

For the JuaLuma marketing build, set NEXT_PUBLIC_APP_URL=http://localhost:5175 and NEXT_PUBLIC_API_URL=http://localhost:8001.
See [VALIDATION.md](VALIDATION.md) for actual results, security findings, and unsupported integration tests.
CI uses synthetic settings and never deploys an application.

## License and source

AGPL-3.0-only. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).
Third-party components retain their own licenses. Modified deployments must preserve applicable
license notices and source-access obligations. The source is https://github.com/TCoder920/jualuma-open.

## Security

See [SECURITY.md](SECURITY.md). Do not commit secrets, databases, logs, exports, or real user records.
