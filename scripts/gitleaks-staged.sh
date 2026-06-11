#!/usr/bin/env bash
# Staged-content gitleaks scan for the Husky pre-commit hook.
# Free private repos can't use GitHub's push-protection, so we run a
# local fallback against the staged diff. Fail closed - if neither
# `gitleaks` nor Docker is available, refuse the commit.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

GITLEAKS_IMAGE="${GITLEAKS_IMAGE:-zricethezav/gitleaks:v8.30.1}"

if command -v gitleaks >/dev/null 2>&1; then
  exec gitleaks protect --staged --redact --verbose
fi

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  exec docker run --rm \
    -v "$ROOT:/repo" \
    -w /repo \
    "$GITLEAKS_IMAGE" \
    protect --staged --redact --verbose
fi

cat >&2 <<'MSG'
gitleaks-staged: neither `gitleaks` nor Docker is available on PATH.
Install one of:
  - macOS:  brew install gitleaks
  - Linux:  https://github.com/gitleaks/gitleaks/releases
  - Docker: https://docs.docker.com/get-docker/

Aborting commit - refusing to bypass the secret-scan hook.
MSG
exit 1
