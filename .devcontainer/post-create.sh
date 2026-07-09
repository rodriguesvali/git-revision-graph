#!/usr/bin/env bash
set -euo pipefail

apt-get update
apt-get install -y bubblewrap

if [ -f package.json ]; then
  npm install
fi

python3 -m pip install --upgrade graphifyy
graphify install --platform codex
graphify hook install
npm install -g @openai/codex
