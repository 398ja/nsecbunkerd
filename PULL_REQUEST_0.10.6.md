# Pull Request: nostr-tools v2 compatibility and null kind handling

## Summary

This PR fixes compatibility issues with nostr-tools v2 and a null pointer issue when creating policies with rules that have null kind values.

## Changes

### Bug Fixes

1. **nostr-tools v2 Compatibility** (`src/daemon/run.ts`, `src/daemon/admin/commands/create_new_key.ts`, `src/daemon/admin/commands/create_account.ts`)
   - nostr-tools v2 changed `generateSecretKey()` to return `Uint8Array` instead of hex string
   - Added conversion using new `bytesToHex()` utility function

2. **Null Kind Handling** (`src/daemon/admin/commands/create_new_policy.ts`)
   - Fixed `TypeError: Cannot read properties of null (reading 'toString')` when creating policies with rules that have `null` kind values (e.g., method-only rules like `allowMethod("sign_event")`)
   - Added null check before calling `.toString()` on `rule.kind`

### New Files

- **`src/utils/hex.ts`**: Utility functions for converting between `Uint8Array` and hex strings
  - `bytesToHex(bytes: Uint8Array): string`
  - `hexToBytes(hex: string): Uint8Array`

### Version Bump

- `package.json`: 0.10.5 → 0.10.6 (PATCH version for bug fixes)

## Testing

- Tested with nsecbunker-java E2E test suite
- All admin operations (key creation, policy creation, key listing) working correctly
- Policy rules with null kind values are now handled properly

## Breaking Changes

None. This is a backward-compatible bug fix release.

## Related Issues

- Fixes compatibility with nostr-tools v2.x
- Fixes policy creation with method-only rules (no kind specified)
