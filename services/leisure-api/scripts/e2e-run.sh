#!/bin/bash
# e2e 稳定入口:凭据显式内联,规避工具调用间 env 传播差异
set -euo pipefail
cd "$(dirname "$0")/.."
LEISURE_E2E_PHONE="${LEISURE_E2E_PHONE:-admin}"
LEISURE_E2E_PASSWORD="${LEISURE_E2E_PASSWORD:-123456}"
LEISURE_E2E_FINANCE_PHONE="${LEISURE_E2E_FINANCE_PHONE:-china}"
export LEISURE_E2E_PHONE LEISURE_E2E_PASSWORD LEISURE_E2E_FINANCE_PHONE
exec npx vitest run "$@"
