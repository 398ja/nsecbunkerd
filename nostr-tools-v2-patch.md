# Patch to upgrade nsecbunkerd to nostr-tools v2

## Step 1: Update package.json
Change: "nostr-tools": "^1.17.0" → "nostr-tools": "^2.17.0"

## Step 2: Add hex conversion utility
Create file: src/utils/hex.ts

```typescript
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}
```

## Step 3: Patch files that decode nsec

### src/daemon/run.ts (line ~41)
```diff
+import { bytesToHex } from '../utils/hex.js';
...
-const hexpk = nip19.decode(nsec).data as string;
+const hexpk = bytesToHex(nip19.decode(nsec).data as Uint8Array);
```

### src/commands/add.ts (line ~37)  
```diff
+import { bytesToHex } from '../utils/hex.js';
...
-decoded = nip19.decode(nsec);
+const decoded = nip19.decode(nsec);
+const hexpk = decoded.type === 'nsec' ? bytesToHex(decoded.data as Uint8Array) : decoded.data;
```

### src/daemon/admin/commands/create_new_key.ts (line ~16)
```diff
+import { bytesToHex } from '../../../utils/hex.js';
...
-key = new NDKPrivateKeySigner(nip19.decode(_nsec).data as string);
+key = new NDKPrivateKeySigner(bytesToHex(nip19.decode(_nsec).data as Uint8Array));
```

## Note
npubEncode/decode still uses hex strings in v2, so request-from-admin.ts works unchanged.
