# Pull Request: Dockerfile stage casing consistency

## Summary

Normalize the runtime stage declaration in the multi-stage Dockerfile to use uppercase `AS`, matching the build stage and eliminating a lint warning about inconsistent casing.

## Changes

1. **Dockerfile Stage Casing** (`Dockerfile`)
   - Switched `as runtime` to `AS runtime` for consistent multi-stage syntax

## Testing

- Not run (cosmetic Dockerfile change only)

## Breaking Changes

None.

## Related Issues

- Addresses Dockerfile lint warning for inconsistent `FROM`/`AS` casing
