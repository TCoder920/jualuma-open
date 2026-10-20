from __future__ import annotations

import main
import httpx
from fastapi.testclient import TestClient

# starlette<->httpx compatibility shim (same approach used in backend tests)
_orig_client_init = httpx.Client.__init__


def _new_client_init(self, *args, **kwargs):
    if "app" in kwargs:
        kwargs.pop("app")
    _orig_client_init(self, *args, **kwargs)


httpx.Client.__init__ = _new_client_init


class _MockResponse:
    def __init__(self, status_code: int = 200, payload: dict | None = None):
        self.status_code = status_code
        self._payload = payload or {"ok": True}

    def json(self) -> dict:
        return self._payload


class _MockSession:
    def post(self, url: str, json: dict | None = None) -> _MockResponse:
        return _MockResponse()


def _set_base_env(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "stage")
    monkeypatch.setenv("GCP_PROJECT_ID", "example-project")
    monkeypatch.setenv("GCP_LOCATION", "us-central1")
    monkeypatch.setenv("JOB_RUNNER_SECRET", "secret123")
    monkeypatch.setattr(main, "_authed_session", lambda: _MockSession())


def test_dispatch_run_job_requires_secret(monkeypatch):
    _set_base_env(monkeypatch)
    monkeypatch.setenv("DISPATCH_ALLOWED_JOBS", "job-a")
    client = TestClient(main.app)

    response = client.post("/dispatch/run-job", json={"job_name": "job-a"})
    assert response.status_code == 401


def test_dispatch_run_job_enforces_allowlist(monkeypatch):
    _set_base_env(monkeypatch)
    monkeypatch.setenv("DISPATCH_ALLOWED_JOBS", "job-a")
    client = TestClient(main.app)

    response = client.post(
        "/dispatch/run-job",
        headers={"X-Job-Runner-Secret": "secret123"},
        json={"job_name": "job-b"},
    )
    assert response.status_code == 403


def test_dispatch_run_workflow_fails_closed_when_allowlist_empty(monkeypatch):
    _set_base_env(monkeypatch)
    monkeypatch.setenv("DISPATCH_ALLOWED_WORKFLOWS", "")
    client = TestClient(main.app)

    response = client.post(
        "/dispatch/run-workflow",
        headers={"X-Job-Runner-Secret": "secret123"},
        json={"workflow_name": "wf-any"},
    )
    assert response.status_code == 500
