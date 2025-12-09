# Contributing

## Workflows

- Playground CI: Pushes to `playground` run lint, build, and smoke tests. Artifacts are uploaded for 14 days.
- Release: Tags `v*` or manual dispatch create a Release, build cross-platform packages, attach checksums, and publish assets.
- CodeQL: Static analysis runs on pushes and pull requests to `master` and `playground`.
- Dependabot: Weekly updates for npm and GitHub Actions.

## Quality Gates

- Lint, type-check, and build must succeed before packaging.
- Smoke tests validate the presence of build outputs.
- Set branch protection in repository settings to require `Playground CI / tests` to pass before merging.

## Releases

- To release: push a tag `vX.Y.Z` or run the `Release` workflow manually.
- Packaging publishes to the GitHub Releases page using `GITHUB_TOKEN`.
- Checksums are uploaded as `checksums-<tag>.txt`.

## Environments

- The `Release` job uses the `production` environment. Configure required reviewers in Settings → Environments.

## Versioning and Changelog

- Use the `Release Please` workflow to generate a changelog and version bump PR for `main/package.json`.

## Notifications

- On release failures, the workflow creates a GitHub Issue with a link to the run.
