# Pre-release CI Cheatsheet

Use these commands to publish a mac-only, arm64 test pre-release from your fork.

```bash
# Ensure you're on the commit you want to release
git status
git rev-parse --short HEAD

# Optional: point origin to your fork (skip if already set)
# Replace <your-username> with your GitHub username
git remote set-url origin https://github.com/<your-username>/awakened-poe-trade.git
git remote -v

# Push workflow/config changes to your fork
git push origin master

# Define next test tag (edit VERSION and increment TEST)
VERSION=3.27.104
TEST=3
TAG="v${VERSION}-test.${TEST}"

# Create annotated tag and push to trigger mac-only pre-release
git tag -a "$TAG" -m "mac-only arm64 pre-release $TAG"
git push origin "$TAG"

# If you need to move the same tag name to a new commit later:
# (safer approach: delete remote/local tag, recreate, and push)
git push origin ":refs/tags/$TAG"     # delete remote tag
git tag -d "$TAG"                     # delete local tag
git tag -a "$TAG" -m "retrigger $TAG"
git push origin "$TAG"

# Or force-move an existing tag (less explicit)
git tag -f "$TAG"
git push origin -f "$TAG"
```

Notes:
- CI trigger: `.github/workflows/release.yml` runs on `push` to tags matching `v*`.
- Fork-only guard: jobs run only when `github.repository_owner` matches your fork owner.
- Result: a pre-release with `AwakenedPOETrade-<version>-mac-arm64.dmg` attached.
