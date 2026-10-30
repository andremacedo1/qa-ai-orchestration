#!/usr/bin/env bash
# Instala playwright-core + Chromium em ~/.claude/panoverse-qa/playwright e copia os helpers e exemplos.
set -e
G="\033[0;32m"; R="\033[0;31m"; Y="\033[1;33m"; B="\033[1m"; NC="\033[0m"
HERE="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/.claude/panoverse-qa/playwright"
echo -e "${B}Instalando o Playwright do fluxo de QA${NC}"
command -v node >/dev/null && command -v npm >/dev/null || { echo -e "${R}✗${NC} Node 18+ e npm sao necessarios"; exit 1; }
mkdir -p "$DEST/lib" "$DEST/exemplos"
cp "$HERE"/lib/* "$DEST/lib/"; cp "$HERE"/exemplos/*.js "$DEST/exemplos/"
cd "$DEST"
[ -f package.json ] || npm init -y >/dev/null
npm install --no-audit --no-fund --silent playwright-core
npx playwright-core install chromium
echo -e "${G}✓${NC} playwright-core + Chromium (com ffmpeg para video) em $DEST"
ENVF="$HOME/.claude/panoverse-qa/demo.env"
if [ ! -f "$ENVF" ]; then cp "$HERE/demo.env.example" "$ENVF"; chmod 600 "$ENVF"; echo -e "${Y}⊗${NC} Preencha $ENVF com os seus acessos do sprint"; fi
echo -e "${Y}⊗${NC} Se o Chromium reclamar de bibliotecas do sistema (Linux sem interface), peca ao admin: sudo npx playwright-core install-deps chromium"
