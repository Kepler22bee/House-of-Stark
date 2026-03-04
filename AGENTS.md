# Agent Guide

## Documentation

- **Dojo**: https://book.dojoengine.org
- **Controller**: https://docs.cartridge.gg

## Skills

This repo uses skills from the [Agent Skills](https://agentskills.io/) ecosystem.
Skills are installed globally and are not vendored in this repo.

### Available skill packs

The following skill packs provide useful reference material for this repo:

- **Dojo** (models, systems, testing, deployment): `npx skills add dojoengine/book`
- **Controller** (session keys, transactions, CLI): `npx skills add cartridge-gg/docs`
- **Cairo** (contracts, security, optimization): `npx skills add keep-starknet-strange/starknet-agentic`

### When to suggest installation

If a task would benefit from Dojo, Cairo, or Controller skills and they aren't already installed, offer to install them for the user.
Skills are helpful but not blocking — if the user declines, continue without them.

### Usage rules
- If a task clearly matches an installed skill, use it.
- Read only the necessary sections of a skill file to complete the task.
- If a skill is missing and the user declines to install, continue with best-effort fallback and note it.

## Repository conventions for agents
- Favor minimal diffs and deterministic outputs.
- Keep generated artifacts out of git unless explicitly required.
- Prefer explicit scripts in `scripts/` over ad-hoc command sequences.
