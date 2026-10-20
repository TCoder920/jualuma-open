#!/usr/bin/env bash
set -euo pipefail

# Sleeps Cloud SQL instances after inactivity by checking Cloud Run request_count
# over a configurable time window.

APPLY=0
INACTIVITY_HOURS=3
REGION="us-central1"
VERBOSE=0

usage() {
  cat <<USAGE
Usage: $(basename "$0") [--apply] [--inactivity-hours N] [--region REGION] [--verbose]

Options:
  --apply                Execute changes. Without this flag, only prints intended actions.
  --inactivity-hours N   Hours of inactivity required before sleeping DBs (default: 3).
  --region REGION        Cloud Run region to inspect (default: us-central1).
  --verbose              Print per-service request totals.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply)
      APPLY=1
      shift
      ;;
    --inactivity-hours)
      INACTIVITY_HOURS="${2:-}"
      shift 2
      ;;
    --region)
      REGION="${2:-}"
      shift 2
      ;;
    --verbose)
      VERBOSE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 2
      ;;
  esac
done

if ! [[ "$INACTIVITY_HOURS" =~ ^[0-9]+$ ]] || [[ "$INACTIVITY_HOURS" -lt 1 ]]; then
  echo "--inactivity-hours must be a positive integer" >&2
  exit 2
fi

for dep in gcloud curl jq python3; do
  if ! command -v "$dep" >/dev/null 2>&1; then
    echo "Missing dependency: $dep" >&2
    exit 1
  fi
done

PROJECTS=("example-project" "example-project" "example-project")
SQL_TARGETS=(
  "example-project:jualuma-db-private"
  "example-project:jualuma-db-stage"
  "example-project:jualuma-db-prod"
)

read -r START_TS END_TS < <(python3 - <<PY
from datetime import datetime, timedelta, timezone
hours = int(${INACTIVITY_HOURS})
end = datetime.now(timezone.utc)
start = end - timedelta(hours=hours)
print(start.replace(microsecond=0).isoformat().replace('+00:00', 'Z'), end.replace(microsecond=0).isoformat().replace('+00:00', 'Z'))
PY
)

if ! ACCESS_TOKEN="$(gcloud auth print-access-token 2>/dev/null)"; then
  echo "Unable to obtain gcloud access token. Run: gcloud auth login" >&2
  exit 1
fi

project_activity=0

echo "Inactivity window: ${START_TS} to ${END_TS} (UTC)"

for project in "${PROJECTS[@]}"; do
  printf '\nProject: %s\n' "$project"
  request_total=0

  services="$(gcloud run services list --project="$project" --region="$REGION" --format='value(metadata.name)' 2>/dev/null || true)"

  if [[ -z "$services" ]]; then
    echo "  No Cloud Run services found in region $REGION."
    continue
  fi

  while IFS= read -r svc; do
    [[ -z "$svc" ]] && continue

    response="$(curl -sS --get \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Content-Type: application/json" \
      "https://monitoring.googleapis.com/v3/projects/${project}/timeSeries" \
      --data-urlencode "filter=metric.type=\"run.googleapis.com/request_count\" AND resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${svc}\"" \
      --data-urlencode "interval.startTime=${START_TS}" \
      --data-urlencode "interval.endTime=${END_TS}" \
      --data-urlencode "view=FULL" \
      --data-urlencode "pageSize=100")"

    svc_count="$(echo "$response" | jq -r '[.timeSeries[]?.points[]?.value.int64Value? | tonumber] | add // 0')"

    if [[ "$VERBOSE" -eq 1 ]]; then
      echo "  ${svc}: ${svc_count} requests"
    fi

    request_total=$((request_total + svc_count))
  done <<< "$services"

  echo "  Total requests in last ${INACTIVITY_HOURS}h: ${request_total}"
  project_activity=$((project_activity + request_total))
done

printf '\nAggregate requests across all projects: %s\n' "$project_activity"

if [[ "$project_activity" -gt 0 ]]; then
  echo "Activity detected. No SQL sleep action taken."
  exit 0
fi

echo "No activity detected for ${INACTIVITY_HOURS}h. Target action: set Cloud SQL activation-policy=NEVER"

for target in "${SQL_TARGETS[@]}"; do
  project="${target%%:*}"
  instance="${target##*:}"
  cmd=(gcloud sql instances patch "$instance" --project="$project" --activation-policy=NEVER --quiet)

  if [[ "$APPLY" -eq 1 ]]; then
    echo "Applying sleep: project=$project instance=$instance"
    "${cmd[@]}"
  else
    echo "[dry-run] ${cmd[*]}"
  fi
done

if [[ "$APPLY" -eq 1 ]]; then
  printf '\nVerification:\n'
  for target in "${SQL_TARGETS[@]}"; do
    project="${target%%:*}"
    instance="${target##*:}"
    gcloud sql instances describe "$instance" --project="$project" --format='value(name,settings.activationPolicy,state)'
  done
fi
