#!/usr/bin/env bash
# Hook PreToolUse do agente QA Git Merge: nega comandos Git perigosos antes da execucao.
set -euo pipefail

input="$(cat)"

deny() {
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$1"
  exit 0
}

allow() {
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}\n'
  exit 0
}

if echo "$input" | grep -Eiq -- '--force(-with-lease)?\b'; then
  deny "push --force esta bloqueado pela trava de seguranca do QA Git Merge."
fi

if echo "$input" | grep -Eiq -- 'reset[[:space:]]+--hard'; then
  deny "reset --hard esta bloqueado pela trava de seguranca do QA Git Merge."
fi

if echo "$input" | grep -Eiq -- 'push[^&|;]*(--delete|[[:space:]]:[A-Za-z])'; then
  deny "Exclusao de branch remota esta bloqueada pela trava de seguranca do QA Git Merge."
fi

if echo "$input" | grep -Eiq -- 'branch[[:space:]]+(-D\b|--delete[[:space:]]+--force)'; then
  deny "Exclusao forcada de branch esta bloqueada pela trava de seguranca do QA Git Merge."
fi

if echo "$input" | grep -q 'push' && echo "$input" | grep -Pq '\b(master|main)\b(?!-)'; then
  deny "Push direto para master/main esta bloqueado: o merge real nunca tem producao como destino."
fi

allow
