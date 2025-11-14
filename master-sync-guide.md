# Master Sync & Release Guide

This guide explains how to sync your fork with the upstream repository and generate a new macOS DMG via GitHub Actions.

## Overview
- Upstream repo: `https://github.com/SnosMe/awakened-poe-trade.git` (branch: `master`)
- Your fork: `https://github.com/septavios/awakened-poe-trade.git`
- Tag-triggered release workflow builds and attaches a DMG to a GitHub pre-release.
- DMG name pattern: `AwakenedPOETrade-${version}-mac-arm64.dmg` where `${version}` comes from `main/package.json`.

## Prerequisites
- Git installed and logged into your fork’s remote.
- Remotes configured for `origin` (your fork) and `upstream` (source repo).
- Ability to push tags to your fork.

## One-Time Setup
1. Verify remotes:
   ```bash
   git remote -v
   ```
   Expected:
   - `origin` → your fork
   - `upstream` → `https://github.com/SnosMe/awakened-poe-trade.git`

2. If `upstream` is missing, add it:
   ```bash
   git remote add upstream https://github.com/SnosMe/awakened-poe-trade.git
   ```

## Routine Sync With Upstream
1. Fetch latest upstream changes:
   ```bash
   git fetch upstream master
   ```

2. Save any local work-in-progress (if present):
   ```bash
   git stash push -u -m "temp: pre-upstream-sync"
   ```

3. Merge upstream into your working branch (e.g., `custom/personal-tweaks` or `main`):
   ```bash
   git merge --no-edit upstream/master
   ```

4. Re-apply your stash and resolve conflicts (if any):
   ```bash
   git stash pop
   # Fix conflicts in files, then stage and commit
   git add <files-you-resolved>
   git commit -m "Resolve merge conflicts"
   ```

5. Push your updated branch:
   ```bash
   git push
   ```

### Optional: Rebase Instead of Merge
If you prefer linear history:
```bash
git fetch upstream master
git rebase upstream/master
# Resolve conflicts as they appear; then push with --force-with-lease
git push --force-with-lease
```

## Changelog & CI Enforcement
- We maintain a project-wide `CHANGELOG.md` in Keep a Changelog format.
- CI will fail PRs that modify code in `renderer/src`, `main/src`, or `ipc` without updating `CHANGELOG.md`.
- Before tagging a release, ensure your changes are documented under `Unreleased` (or a new version section).

## Version Bump (required for correct DMG naming)
1. Edit `main/package.json` and bump the semantic version:
   ```json
   {
     "version": "3.27.107"
   }
   ```

2. Commit and push the bump:
   ```bash
   git add main/package.json
   git commit -m "Bump version to 3.27.107"
   git push
   ```

## Trigger the GitHub Actions Release Build
1. Create a tag that matches the release workflow pattern (e.g., `v3.27.107`):
   ```bash
   git tag v3.27.107
   git push origin v3.27.107
   ```

2. What happens:
   - A GitHub pre-release for the tag is created/updated.
   - Renderer is built and uploaded as `renderer-dist` artifact.
   - macOS packaging job runs and attaches `AwakenedPOETrade-${version}-mac-arm64.dmg` to the pre-release.
   - Packaged artifacts (DMG, YAML, ZIP) are uploaded under `app-dist-macos-latest`.

## Where to Find Artifacts
- GitHub → Repository → Actions → the `Release` workflow run for your tag.
- Pre-release page for the tag will have the DMG attached.
- Artifacts tab of the run: `app-dist-macos-latest` bundle with all packaging outputs.

## Conflict Resolution Tips
- Use your IDE’s merge tooling to apply both sides when non-overlapping features exist.
- Example pattern preserved in merges:
  - `CheckedItem.vue`: keep `enableAllStatFilters` and `rememberCurrency` options if both exist in conflict.

## Troubleshooting
- If the release job does not start, confirm:
  - The tag name matches `v*` pattern.
  - Your repo has Actions enabled.
  - `release.yml` is present and not owner-gated (we’ve removed gating).
- If CI fails on changelog enforcement:
  - Add an entry to `CHANGELOG.md` under `Unreleased` and re-run.
- If you see `net::ERR_QUIC_PROTOCOL_ERROR` during runtime:
  - We disable QUIC via Electron command-line to force HTTP/2/1.1 fallback.

## Quick Command Recap
```bash
# Sync
git fetch upstream master
git stash push -u -m "temp: pre-upstream-sync"    # if you have local changes
git merge --no-edit upstream/master
git stash pop                                      # resolve conflicts, add, commit
git push

# Version bump
sed -i '' 's/"version": ".*"/"version": "3.27.107"/' main/package.json
git add main/package.json && git commit -m "Bump version to 3.27.107" && git push

# Tag & release
git tag v3.27.107
git push origin v3.27.107
```

## References
- `.github/workflows/release.yml`: tag-triggered release process
- `.github/workflows/main.yml`: branch builds
- `.github/workflows/changelog.yml`: changelog enforcement on PRs
- `DEVELOPING.md`: development and build instructions

