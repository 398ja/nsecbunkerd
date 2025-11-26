# Pull Request: Post-0.10.5 updates (0.10.6 → 0.11.1)

## Summary

Collects all changes since v0.10.5: nostr-tools v2 compatibility fixes (0.10.6), a major Admin API expansion with full NIP-46 compliance (0.11.0+), soft-deleted key handling improvements, and minor maintenance cleanups.

## Changes

### Breaking / Protocol

1. **NIP-46 Compliance** (`src/daemon/admin/**/*`, `src/daemon/run.ts`, `README.md`)
   - Switched admin comms from non-standard kind `24134` to spec-compliant `24133` (`NDKKind.NostrConnect`)
   - Updated docs to call out the breaking protocol change

### Features

1. **Admin API Expansion** (`src/daemon/admin/commands/*`, `src/daemon/admin/index.ts`)
   - Added 11 admin methods: `get_key`, `delete_key`, `rotate_key`, `get_policy`, `delete_policy`, `grant_permission`, `revoke_permission`, `get_permissions`, `get_token`, `revoke_token`, `validate_token`
   - Extended authorization/ACL handling to support the new methods
2. **Test Suite** (`src/daemon/admin/commands/__tests__/*`, `vitest.config.ts`)
   - Introduced Vitest with 90+ targeted admin command tests and test utilities

### Bug Fixes

1. **nostr-tools v2 Compatibility** (`src/daemon/run.ts`, `src/utils/hex.ts`, `src/daemon/admin/commands/*`)
   - Adjusted for Uint8Array key handling, added hex conversion helpers, and defaulted method to `sign_event` when unspecified
2. **Null Kind Handling** (`src/daemon/admin/commands/create_new_policy.ts`)
   - Guarded `.toString()` access to avoid null-kind crashes during policy creation
3. **Soft-Deleted Keys Filtering** (`src/daemon/run.ts`)
   - Excludes keys marked as deleted in the database when loading configured keys to prevent resurrecting soft-deleted credentials
4. **Ping Response Alignment** (`src/daemon/admin/commands/ping.ts`, `src/daemon/admin/commands/__tests__/ping.test.ts`)
   - Standardized ping RPC response to `"pong"` and updated tests accordingly

### Maintenance

1. **Runtime Dockerfile Lint** (`Dockerfile`)
   - Normalized multi-stage `FROM ... AS` casing to satisfy lint warnings
2. **Lockfile/Tooling Cleanup** (`package-lock.json`, removed `pnpm-lock.yaml`)
   - Standardized on npm lockfile alongside Vitest tooling additions
3. **Docs Cleanup** (`project/IMPLEMENTATION_PLAN.md`)
   - Removed outdated implementation plan document
4. **Version Bump** (`package.json`, `package-lock.json`)
   - Bumped package version to `0.11.1` to capture post-0.11.0 fixes

## Testing

- Vitest suite added; not re-run in this pass

## Breaking Changes

- Admin API now uses NIP-46 kind `24133` instead of `24134`; clients must update to remain compatible

## Related Issues

- NIP-46 compliance and admin command coverage
- nostr-tools v2 key handling and null-kind policy safety
