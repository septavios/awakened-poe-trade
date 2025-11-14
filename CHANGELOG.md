# Changelog

This project follows Keep a Changelog and Semantic Versioning.

Guidelines:
- Maintain an `Unreleased` section while work is in progress on a branch.
- Group entries under: Added, Changed, Fixed, Removed, Security, Deprecated.
- Reference PR numbers and short descriptions. Link issues when helpful.

## Unreleased

### Added
- Option to enable all stat filters by default in Price Check presets.
- PR template prompting changelog updates for every code change.
- CI workflow to enforce changelog updates on pull requests.

### Changed
- Preset creation passes `enableAllStatFilters` through to stat filter builders.
- Documented changelog process in `DEVELOPING.md`.

### Fixed
- Handled preview mode config load fallback more robustly while developing.
- Avoided `net::ERR_QUIC_PROTOCOL_ERROR` by disabling QUIC/HTTP3 in Electron main.

## 3.27.104 – YYYY-MM-DD
- Placeholder for next tagged release. Move items from `Unreleased` here when tagging.
