# nsecbunkerd Missing Admin Methods Implementation Plan

## Executive Summary

This document outlines the implementation plan for adding missing admin methods to nsecbunkerd to achieve full compatibility with the nsecbunker-java client library. The implementation follows NIP-46 conventions and the existing nsecbunkerd command patterns.

---

## Current State Analysis

### Implemented Methods (12 total)

| Method | File | Description |
|--------|------|-------------|
| `ping` | `commands/ping.ts` | Health check |
| `get_keys` | `admin/index.ts` | List all keys |
| `get_key_users` | `admin/index.ts` | Get users of a key |
| `get_key_tokens` | `admin/index.ts` | Get tokens for a key |
| `get_policies` | `admin/index.ts` | List all policies |
| `create_new_key` | `commands/create_new_key.ts` | Create/import a key |
| `unlock_key` | `commands/unlock_key.ts` | Unlock an encrypted key |
| `create_new_policy` | `commands/create_new_policy.ts` | Create a policy |
| `create_new_token` | `commands/create_new_token.ts` | Create an access token |
| `rename_key_user` | `commands/rename_key_user.ts` | Update user description |
| `revoke_user` | `commands/revoke_user.ts` | Revoke user by keyUserId |
| `create_account` | `commands/create_account.ts` | Create user account |

### Missing Methods (11 total)

| Category | Method | Priority | Complexity |
|----------|--------|----------|------------|
| Key Management | `get_key` | High | Low |
| Key Management | `delete_key` | Medium | Low |
| Key Management | `rotate_key` | Low | Medium |
| Policy Management | `get_policy` | High | Low |
| Policy Management | `delete_policy` | Medium | Low |
| Permission Management | `grant_permission` | High | Medium |
| Permission Management | `revoke_permission` | Medium | Low |
| Permission Management | `get_permissions` | High | Low |
| Token Management | `get_token` | Medium | Low |
| Token Management | `revoke_token` | Medium | Low |
| Token Management | `validate_token` | Medium | Low |

---

## Database Schema Reference

```prisma
model Key {
  id        Int       @id @default(autoincrement())
  keyName   String    @unique
  createdAt DateTime  @default(now())
  updatedAt DateTime  @default(now()) @updatedAt
  deletedAt DateTime?
  pubkey    String
}

model KeyUser {
  id                Int                @id @default(autoincrement())
  keyName           String
  userPubkey        String
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @default(now()) @updatedAt
  revokedAt         DateTime?
  lastUsedAt        DateTime?
  description       String?
  signingConditions SigningCondition[]
  Token             Token[]
  @@unique([keyName, userPubkey], name: "unique_key_user")
}

model Policy {
  id          Int          @id @default(autoincrement())
  name        String
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @default(now()) @updatedAt
  expiresAt   DateTime?
  deletedAt   DateTime?
  description String?
  rules       PolicyRule[]
  Token       Token[]
}

model Token {
  id         Int       @id @default(autoincrement())
  keyName    String
  token      String    @unique
  clientName String
  createdBy  String
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @default(now()) @updatedAt
  deletedAt  DateTime?
  expiresAt  DateTime?
  redeemedAt DateTime?
  keyUserId  Int?
  policyId   Int?
  policy     Policy?   @relation(fields: [policyId], references: [id])
  KeyUser    KeyUser?  @relation(fields: [keyUserId], references: [id])
}
```

---

## Implementation Phases

### Phase 1: Key Management Methods (Priority: High)

**Duration Estimate**: 1-2 days

#### Task 1.1: Implement `get_key`

**File**: `src/daemon/admin/commands/get_key.ts`

**Purpose**: Retrieve detailed information about a single key by name.

**Parameters**:
- `params[0]`: keyName (string)

**Response**:
```json
{
  "name": "my-key",
  "npub": "npub1...",
  "locked": false,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Implementation Steps**:
1. Create new file `src/daemon/admin/commands/get_key.ts`
2. Extract keyName from params
3. Query Key table and in-memory keys state (for locked status)
4. Return JSON response with key details
5. Register in `admin/index.ts` switch statement
6. Write unit tests

**Dependencies**: Access to `getKeys()` callback for locked status

---

#### Task 1.2: Implement `delete_key`

**File**: `src/daemon/admin/commands/delete_key.ts`

**Purpose**: Soft-delete a key (set deletedAt timestamp).

**Parameters**:
- `params[0]`: keyName (string)

**Response**:
```json
["ok"]
```

**Implementation Steps**:
1. Create new file `src/daemon/admin/commands/delete_key.ts`
2. Extract keyName from params
3. Update Key record with `deletedAt = new Date()`
4. Optionally remove from in-memory keys
5. Return `["ok"]` on success
6. Register in `admin/index.ts`

**Considerations**:
- Should we also revoke all tokens and permissions for this key?
- Should we remove from config file or just database?

---

#### Task 1.3: Implement `rotate_key` (Lower Priority)

**File**: `src/daemon/admin/commands/rotate_key.ts`

**Purpose**: Create a new key and migrate permissions from an old key.

**Parameters**:
- `params[0]`: oldKeyName (string)
- `params[1]`: newKeyName (string)
- `params[2]`: passphrase (string)

**Response**:
```json
{
  "npub": "npub1...",
  "name": "new-key-name"
}
```

**Implementation Steps**:
1. Create new file `src/daemon/admin/commands/rotate_key.ts`
2. Validate old key exists
3. Generate new key with passphrase
4. Copy KeyUser records from old key to new key
5. Copy Token records from old key to new key
6. Soft-delete old key
7. Return new key details

**Considerations**:
- This is a complex operation that should be transactional
- May want to preserve old key for a grace period

---

### Phase 2: Policy Management Methods (Priority: High)

**Duration Estimate**: 1 day

#### Task 2.1: Implement `get_policy`

**File**: `src/daemon/admin/commands/get_policy.ts`

**Purpose**: Retrieve a single policy with its rules.

**Parameters**:
- `params[0]`: policyId (string, will be parsed to int)

**Response**:
```json
{
  "id": 1,
  "name": "signing-policy",
  "description": "Policy for signing",
  "created_at": "2024-01-01T00:00:00Z",
  "rules": [
    { "method": "sign_event", "kind": "1" }
  ]
}
```

**Implementation Steps**:
1. Create new file `src/daemon/admin/commands/get_policy.ts`
2. Parse policyId to integer
3. Query Policy with included rules
4. Return JSON response or error if not found
5. Register in `admin/index.ts`

---

#### Task 2.2: Implement `delete_policy`

**File**: `src/daemon/admin/commands/delete_policy.ts`

**Purpose**: Soft-delete a policy.

**Parameters**:
- `params[0]`: policyId (string)

**Response**:
```json
["ok"]
```

**Implementation Steps**:
1. Create new file `src/daemon/admin/commands/delete_policy.ts`
2. Parse policyId to integer
3. Check no active tokens reference this policy (optional)
4. Update Policy with `deletedAt = new Date()`
5. Return `["ok"]` on success

**Considerations**:
- Should we prevent deletion if tokens are using this policy?
- Should we cascade to PolicyRule deletion?

---

### Phase 3: Permission Management Methods (Priority: High)

**Duration Estimate**: 2 days

#### Task 3.1: Implement `grant_permission`

**File**: `src/daemon/admin/commands/grant_permission.ts`

**Purpose**: Grant a user permission to use a key with a specific policy.

**Parameters**:
- `params[0]`: keyName (string)
- `params[1]`: userPubkey (string, hex or npub)
- `params[2]`: policyId (string)
- `params[3]`: description (string, optional)

**Response**:
```json
{
  "id": 1,
  "key_name": "my-key",
  "user_pubkey": "abc123...",
  "created_at": "2024-01-01T00:00:00Z",
  "description": "Client app"
}
```

**Implementation Steps**:
1. Create new file `src/daemon/admin/commands/grant_permission.ts`
2. Validate key exists
3. Validate policy exists
4. Normalize userPubkey (convert npub to hex if needed)
5. Create or update KeyUser record
6. Create SigningCondition records from policy rules
7. Return KeyUser details
8. Register in `admin/index.ts`

**Key Logic**:
```typescript
// Convert npub to hex if needed
if (userPubkey.startsWith('npub1')) {
    userPubkey = nip19.decode(userPubkey).data as string;
}

// Upsert KeyUser
const keyUser = await prisma.keyUser.upsert({
    where: { unique_key_user: { keyName, userPubkey } },
    update: { revokedAt: null, description },
    create: { keyName, userPubkey, description }
});

// Copy policy rules to signing conditions
const policy = await prisma.policy.findUnique({ where: { id: policyId }, include: { rules: true } });
for (const rule of policy.rules) {
    await prisma.signingCondition.create({
        data: {
            keyUserId: keyUser.id,
            method: rule.method,
            kind: rule.kind,
            allowed: true
        }
    });
}
```

---

#### Task 3.2: Implement `revoke_permission`

**File**: `src/daemon/admin/commands/revoke_permission.ts`

**Purpose**: Revoke a user's permission for a specific key.

**Parameters**:
- `params[0]`: keyName (string)
- `params[1]`: userPubkey (string)

**Response**:
```json
["ok"]
```

**Implementation Steps**:
1. Create new file `src/daemon/admin/commands/revoke_permission.ts`
2. Normalize userPubkey
3. Find KeyUser by unique constraint
4. Update revokedAt timestamp
5. Return `["ok"]`

**Note**: This differs from existing `revoke_user` which takes keyUserId directly.

---

#### Task 3.3: Implement `get_permissions`

**File**: `src/daemon/admin/commands/get_permissions.ts`

**Purpose**: Get permissions for a specific user on a key.

**Parameters**:
- `params[0]`: keyName (string)
- `params[1]`: userPubkey (string)

**Response**:
```json
{
  "id": 1,
  "key_name": "my-key",
  "user_pubkey": "abc123...",
  "active": true,
  "created_at": "2024-01-01T00:00:00Z",
  "signing_conditions": [
    { "method": "sign_event", "kind": "1", "allowed": true }
  ]
}
```

**Implementation Steps**:
1. Create new file `src/daemon/admin/commands/get_permissions.ts`
2. Normalize userPubkey
3. Query KeyUser with signingConditions included
4. Return user details with conditions
5. Include `active: revokedAt === null`

---

### Phase 4: Token Management Methods (Priority: Medium)

**Duration Estimate**: 1-2 days

#### Task 4.1: Implement `get_token`

**File**: `src/daemon/admin/commands/get_token.ts`

**Purpose**: Retrieve a single token by ID.

**Parameters**:
- `params[0]`: tokenId (string)

**Response**:
```json
{
  "id": 1,
  "key_name": "my-key",
  "token": "npub1...#abc123",
  "client_name": "My App",
  "policy_id": 1,
  "expires_at": "2024-12-31T23:59:59Z",
  "redeemed_at": null
}
```

**Implementation Steps**:
1. Create new file `src/daemon/admin/commands/get_token.ts`
2. Parse tokenId to integer
3. Query Token with policy included
4. Format token string with npub prefix
5. Return token details or error if not found

---

#### Task 4.2: Implement `revoke_token`

**File**: `src/daemon/admin/commands/revoke_token.ts`

**Purpose**: Revoke (soft-delete) a token.

**Parameters**:
- `params[0]`: tokenId (string)

**Response**:
```json
["ok"]
```

**Implementation Steps**:
1. Create new file `src/daemon/admin/commands/revoke_token.ts`
2. Parse tokenId to integer
3. Update Token with `deletedAt = new Date()`
4. Return `["ok"]`

---

#### Task 4.3: Implement `validate_token`

**File**: `src/daemon/admin/commands/validate_token.ts`

**Purpose**: Check if a token is valid (not expired, not revoked).

**Parameters**:
- `params[0]`: tokenString (string) - the token value (without npub prefix)

**Response**:
```json
{
  "valid": true,
  "key_name": "my-key",
  "expires_at": "2024-12-31T23:59:59Z"
}
```
or
```json
{
  "valid": false,
  "reason": "Token expired"
}
```

**Implementation Steps**:
1. Create new file `src/daemon/admin/commands/validate_token.ts`
2. Parse token string (may include npub# prefix)
3. Query Token by token value
4. Check: `deletedAt === null && (expiresAt === null || expiresAt > now)`
5. Return validity status with details

---

### Phase 5: Integration and Testing

**Duration Estimate**: 2-3 days

#### Task 5.1: Register All New Commands

**File**: `src/daemon/admin/index.ts`

Update the handleRequest switch statement:

```typescript
switch (req.method) {
    // Existing commands...

    // New Key commands
    case 'get_key': await getKey(this, req); break;
    case 'delete_key': await deleteKey(this, req); break;
    case 'rotate_key': await rotateKey(this, req); break;

    // New Policy commands
    case 'get_policy': await getPolicy(this, req); break;
    case 'delete_policy': await deletePolicy(this, req); break;

    // New Permission commands
    case 'grant_permission': await grantPermission(this, req); break;
    case 'revoke_permission': await revokePermission(this, req); break;
    case 'get_permissions': await getPermissions(this, req); break;

    // New Token commands
    case 'get_token': await getToken(this, req); break;
    case 'revoke_token': await revokeToken(this, req); break;
    case 'validate_token': await validateToken(this, req); break;

    default: // ...
}
```

#### Task 5.2: Add Imports

Add imports for all new command modules at the top of `admin/index.ts`.

#### Task 5.3: Enable E2E Tests in nsecbunker-java

Remove `@Disabled` annotations from E2E tests:
- `SigningFlowE2ETest.shouldSetUpKeyForSigning`
- `SigningFlowE2ETest.shouldGrantSigningPermission`
- `SigningFlowE2ETest.shouldGenerateSigningToken`
- `SigningFlowE2ETest.shouldCompleteFullSigningSetupFlow`
- `SigningFlowE2ETest.shouldImportExistingKeyForSigning`

#### Task 5.4: Run Full E2E Test Suite

```bash
cd /home/eric/IdeaProjects/nsecbunker-java
mvn test -pl nsecbunker-e2e -am -Pe2e
```

#### Task 5.5: Build and Test Docker Image

```bash
cd /home/eric/IdeaProjects/nsecbunkerd
npm run build
docker build -t nsecbunkerd-local:latest .
```

---

## File Structure After Implementation

```
src/daemon/admin/
├── index.ts                          # Main router (updated)
├── validations/
│   └── request-from-admin.ts
└── commands/
    ├── ping.ts
    ├── create_new_key.ts
    ├── get_key.ts                    # NEW
    ├── delete_key.ts                 # NEW
    ├── rotate_key.ts                 # NEW
    ├── unlock_key.ts
    ├── create_new_policy.ts
    ├── get_policy.ts                 # NEW
    ├── delete_policy.ts              # NEW
    ├── create_new_token.ts
    ├── get_token.ts                  # NEW
    ├── revoke_token.ts               # NEW
    ├── validate_token.ts             # NEW
    ├── grant_permission.ts           # NEW
    ├── revoke_permission.ts          # NEW
    ├── get_permissions.ts            # NEW
    ├── rename_key_user.ts
    ├── revoke_user.ts
    ├── create_account.ts
    └── account/
        └── wallet.ts
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing behavior | High | Preserve existing response formats |
| Database migrations needed | Medium | Use soft deletes, no schema changes required |
| Config file modifications | Medium | Only delete_key may need to update config |
| Security concerns | High | Validate all admin requests are from authorized npubs |

---

## Testing Strategy

### Unit Tests
- Each command should have corresponding unit tests
- Mock Prisma client for database operations
- Test error cases (invalid params, not found, etc.)

### Integration Tests (E2E)
- Use nsecbunker-java E2E test suite
- Run against local Docker container
- Verify round-trip: Java client → nsecbunkerd → response parsing

### Manual Testing
- Use nsecBunker admin UI if available
- Test with nostr client tools

---

## Rollout Plan

1. **Development**: Implement in feature branch
2. **Local Testing**: Run E2E tests with local build
3. **Code Review**: Review for security and correctness
4. **Docker Build**: Create new Docker image
5. **Staging**: Test with staging nsecbunker instance
6. **Release**: Tag version (0.11.0 - MINOR bump for new features)
7. **Documentation**: Update README with new admin methods

---

## Version Recommendation

Since this adds new features without breaking existing behavior:
- **Current**: 0.10.6
- **Proposed**: 0.11.0 (MINOR version bump)

---

## Appendix: NIP-46 Reference

### Request Format (kind: 24133)
```json
{
    "id": "<random_string>",
    "method": "<method_name>",
    "params": ["<array_of_strings>"]
}
```

### Response Format
```json
{
    "id": "<request_id>",
    "result": "<json_stringified_result>",
    "error": "<optional_error_string>"
}
```

### Standard Methods (NIP-46 Core)
- `connect`, `sign_event`, `ping`, `get_public_key`
- `nip04_encrypt`, `nip04_decrypt`, `nip44_encrypt`, `nip44_decrypt`

### Admin Methods (nsecbunkerd Extension)
- Key: `get_keys`, `get_key`, `create_new_key`, `delete_key`, `unlock_key`, `rotate_key`
- Policy: `get_policies`, `get_policy`, `create_new_policy`, `delete_policy`
- Permission: `grant_permission`, `revoke_permission`, `get_permissions`, `get_key_users`, `rename_key_user`, `revoke_user`
- Token: `get_key_tokens`, `get_token`, `create_new_token`, `revoke_token`, `validate_token`
