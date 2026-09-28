#!/usr/bin/env bash
# Deploy docs/ to github.com/n3m351d4/AR4CHN05 and enable GitHub Pages.
# Prereq: empty public repo AR4CHN05 exists; GH_TOKEN in env (Contents + Pages write).

set -euo pipefail

OWNER="n3m351d4"
REPO="AR4CHN05"
ROOT="$(cd "$(dirname "$0")" && pwd)"

if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "Export GH_TOKEN first (do not paste it into chat)." >&2
  exit 1
fi

cd "$ROOT"

if [[ ! -d .git ]]; then
  git init -b main
  git add -A
  git commit -m "Publish AKIA exposure research report"
fi

git remote remove origin 2>/dev/null || true
git remote add origin "https://x-access-token:${GH_TOKEN}@github.com/${OWNER}/${REPO}.git"
git push -u origin main

curl -fsS -X PUT \
  -H "Authorization: Bearer ${GH_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${OWNER}/${REPO}/pages" \
  -d '{"build_type":"legacy","source":{"branch":"main","path":"/"}}' \
  | python3 -c "import sys,json; r=json.load(sys.stdin); print('Pages:', r.get('html_url') or r.get('status') or r)"

echo "Site (after build): https://${OWNER}.github.io/${REPO}/"
