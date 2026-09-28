# Where AWS Credentials Leak on GitHub

**AR4CHN05 Security Research** — September 2026

Interactive report on how AWS access key IDs (`AKIA…`) show up in public GitHub repositories: where they live, in what file types, and how validation status breaks down across personal and organization repos.

## What this research is

We ran a long-running scan of public GitHub for AWS access key ID patterns, then validated findings against AWS (STS `GetCallerIdentity`). Each hit is classified as:

| Status | Meaning |
|--------|---------|
| **Valid** | Key accepted by AWS at validation time |
| **Invalid** | Rejected (revoked, fake, typo, placeholder, etc.) |
| **Quarantined** | Live key under AWS compromised-key quarantine policy |

This site publishes **aggregated statistics only** — heatmaps, top extensions, path categories, and repo-level counts. No secret keys, no full credential pairs, and no per-file URLs appear in the report itself.

## Corpus (current report)

Built from the scanner corpus after repo cleanup (404/deleted repos removed):

- **~23.9k** AKIA findings
- **~20.3k** unique repositories
- **~1.9k** valid · **~21.9k** invalid · **~108** quarantined at time of build

Repo metadata (personal vs organization) comes from the GitHub API. File type and path category are derived from the blob path in each finding.

## What the report shows

Three cross-tab heatmaps with short insights:

1. **File type × repository type** — filterable by validation status
2. **Repository type × validation status** — valid rate in personal vs org repos
3. **File type × validation status** — e.g. how `.env` compares to source code

Plus top file extensions, path buckets (`test/`, `fixtures/`, `config/`, …), top repositories by hit count, and general hygiene recommendations (pre-commit hooks, GHAS, `.env` discipline).

## Partial dataset (download)

The footer links to a **partial JSON export** from the September 2026 server dump: **invalid keys only**. Valid and quarantined credentials are excluded; secret keys are never included. Intended as a research sample alongside the aggregate report, not a full leak dump.

## Ethics & scope

- Research on **public** repositories only.
- Valid live credentials are **not** distributed via this site or the partial dataset.
- Goal: understand exposure patterns and improve detection/prevention — not to enable abuse.

## Contact

[@in51d3](https://t.me/in51d3) · AR4CHN05
