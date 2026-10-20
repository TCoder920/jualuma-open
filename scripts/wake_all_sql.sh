#!/usr/bin/env bash
set -euo pipefail

# Wakes all Jualuma Cloud SQL instances by setting activation policy to ALWAYS.

APPLY=0

usage() {
  cat <<USAGE
Usage: $(basename "$0") [--apply]

Options:
  --apply   Execute changes. Without this flag, prints planned commands only.
USAGE
}

for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=1 ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      usage
      exit 2
      ;;
  esac
done

TARGETS=(
  "example-project:jualuma-db-private"
  "example-project:jualuma-db-stage"
  "example-project:jualuma-db-prod"
)

for target in "${TARGETS[@]}"; do
  project="${target%%:*}"
  instance="${target##*:}"
  cmd=(gcloud sql instances patch "$instance" --project="$project" --activation-policy=ALWAYS --quiet)

  if [[ "$APPLY" -eq 1 ]]; then
    echo "Applying wake: project=$project instance=$instance"
    "${cmd[@]}"
  else
    echo "[dry-run] ${cmd[*]}"
  fi
done

if [[ "$APPLY" -eq 1 ]]; then
  echo
  echo "Verification:"
  for target in "${TARGETS[@]}"; do
    project="${target%%:*}"
    instance="${target##*:}"
    gcloud sql instances describe "$instance" --project="$project" --format='value(name,settings.activationPolicy,state)'
  done
fi
