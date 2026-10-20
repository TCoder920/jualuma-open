from __future__ import annotations

import json
import os
import uuid

import google.auth
from fastapi import FastAPI, Header, HTTPException
from google.auth.transport.requests import AuthorizedSession
from pydantic import BaseModel

app = FastAPI(title="JuaLuma Approvals Service")


def _app_env() -> str:
    return (os.getenv("APP_ENV") or "local").strip().lower()


def _require_secret(x_job_runner_secret: str | None) -> None:
    expected = os.getenv("JOB_RUNNER_SECRET")
    if not expected:
        # Fail closed outside local/test to avoid unauthenticated control-plane actions.
        if _app_env() in {"local", "test"}:
            return
        raise HTTPException(status_code=500, detail="JOB_RUNNER_SECRET is not configured.")
    if not x_job_runner_secret or x_job_runner_secret != expected:
        raise HTTPException(status_code=401, detail="UNAUTHORIZED")


class RequestPayload(BaseModel):
    kind: str
    subject: str | None = None
    metadata: dict[str, object] | None = None


def _csv_allowlist(env_name: str) -> set[str]:
    raw = (os.getenv(env_name) or "").strip()
    if not raw:
        return set()
    return {part.strip() for part in raw.split(",") if part.strip()}


def _require_allowlisted(value: str, env_name: str, kind_label: str) -> None:
    allowed = _csv_allowlist(env_name)
    if not allowed:
        raise HTTPException(
            status_code=500,
            detail=f"{env_name} is not configured.",
        )
    if value not in allowed:
        raise HTTPException(status_code=403, detail=f"{kind_label} is not allowlisted.")


def _authed_session() -> AuthorizedSession:
    creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    return AuthorizedSession(creds)


class RunJobPayload(BaseModel):
    job_name: str


class RunWorkflowPayload(BaseModel):
    workflow_name: str
    argument: dict[str, object] | None = None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/requests")
def create_request(
    payload: RequestPayload,
    x_job_runner_secret: str | None = Header(default=None),
) -> dict[str, object]:
    _require_secret(x_job_runner_secret)
    # Placeholder: the full workflow engine is implemented later (Stage 5+).
    return {"request_id": str(uuid.uuid4()), "accepted": True, "kind": payload.kind}


@app.post("/requests/{request_id}/approve")
def approve_request(
    request_id: str,
    x_job_runner_secret: str | None = Header(default=None),
) -> dict[str, object]:
    _require_secret(x_job_runner_secret)
    return {"request_id": request_id, "approved": True}


@app.post("/requests/{request_id}/deny")
def deny_request(
    request_id: str,
    x_job_runner_secret: str | None = Header(default=None),
) -> dict[str, object]:
    _require_secret(x_job_runner_secret)
    return {"request_id": request_id, "denied": True}


@app.post("/dispatch/run-job")
def dispatch_run_job(
    payload: RunJobPayload,
    x_job_runner_secret: str | None = Header(default=None, alias="X-Job-Runner-Secret"),
) -> dict[str, object]:
    _require_secret(x_job_runner_secret)
    project = (os.getenv("GCP_PROJECT_ID") or "").strip()
    region = (os.getenv("GCP_LOCATION") or "us-central1").strip()
    if not project:
        raise HTTPException(status_code=500, detail="GCP_PROJECT_ID is not configured.")

    _require_allowlisted(payload.job_name, "DISPATCH_ALLOWED_JOBS", "Job")

    session = _authed_session()
    url = f"https://run.googleapis.com/v2/projects/{project}/locations/{region}/jobs/{payload.job_name}:run"
    resp = session.post(url, json={})
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Run API error: {resp.status_code}")
    return {"status": "started", "result": resp.json()}


@app.post("/dispatch/run-workflow")
def dispatch_run_workflow(
    payload: RunWorkflowPayload,
    x_job_runner_secret: str | None = Header(default=None, alias="X-Job-Runner-Secret"),
) -> dict[str, object]:
    _require_secret(x_job_runner_secret)
    project = (os.getenv("GCP_PROJECT_ID") or "").strip()
    region = (os.getenv("GCP_LOCATION") or "us-central1").strip()
    if not project:
        raise HTTPException(status_code=500, detail="GCP_PROJECT_ID is not configured.")

    _require_allowlisted(
        payload.workflow_name,
        "DISPATCH_ALLOWED_WORKFLOWS",
        "Workflow",
    )

    session = _authed_session()
    url = f"https://workflowexecutions.googleapis.com/v1/projects/{project}/locations/{region}/workflows/{payload.workflow_name}/executions"
    body = {"argument": json.dumps(payload.argument or {}, separators=(",", ":"))}
    resp = session.post(url, json=body)
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Workflows API error: {resp.status_code}")
    data = resp.json()
    return {"status": "started", "execution": data.get("name"), "result": data}
