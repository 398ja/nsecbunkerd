# nsecbunkerd
Daemon to remotely sign nostr events using keys.

## Easy setup via docker compose

To quickly install `nsecbunkerd` via Docker just run:

### Configurations

- Prepare your config directory

  ```shell
  mkdir $HOME/.nsecbunker-config
  ```

- Clone `.env.example` and add your nostr public key to `ADMIN_NPUBS` to the `.env` file.

- Change `DATABASE_URL` if necessary.

```shell
cp .env.example .env
```

### Start nsecbunkerd

Create and start the project containers. This runs the migrations and then runs nsecbunkderd container.

```shell
# Optionally, build the image locally
docker compose build nsecbunkerd

# Start the project
docker compose up

# Or in the background
docker compose up -d
```


### Get the connection string

```shell
docker compose exec nsecbunkerd cat /app/config/connection.txt
```

nsecBunker will give you a connection string like:

```
bunker://npub1tj2dmc4udvgafxxxxxxxrtgne8j8l6rgrnaykzc8sys9mzfcz@relay.nsecbunker.com
```

You can visit https://app.nsecbunker.com/ to administrate your nsecBunker remotely, or explore `nsecbunkerd`'s CLI
to find the options to add and approve keys from the CLI.

## Hard setup:
(If you installed via docker you don't need to do any of this, skip to the [Configure](#configure) section)

Node.js v18 or newer is required.

```shell
git clone <nsecbunkerd-repo>
npm i
npm run build
npx prisma migrate deploy
```

## Configure

### Easy: Remote configuration

Using the connection string you saw before, you can go to https://app.nsecbunker.com and paste your connection string.

Note that ONLY the npub that you designated as an administrator when launching nsecBunker is able to control your nsecBunker. Even if someone sees your connection string, without access to your administrator keys, there's nothing they can do.

### Hard: manual configuration

(If you are using remote configuration you don't need to do any of this)

### Add your nsec to nsecBunker

Here you'll give nsecBunker your nsec. It will ask you for a passphrase to encrypt it on-disk.
The name is an internal name you'll use to refer to this keypair. Choose anything that is useful to you.

```shell
npm run nsecbunkerd -- add --name <your-key-name>
```

#### Example

```bash
$ npm run nsecbunkerd -- add --name "Uncomfortable family"

nsecBunker uses a passphrase to encrypt your nsec when stored on-disk.
Every time you restart it, you will need to type in this password.

Enter a passphrase: <enter-your-passphrase-here>
Enter the nsec for Uncomfortable family: <copy-your-nsec-here>
nsecBunker generated an admin password for you:

***************************

You will need this to manage users of your keys.
````

## Start

```bash
$ npm run lfg --admin <your-admin-npub>
```

## Testing with `nsecbunker-client`

nsecbunker ships with a simple client that can request signatures from an nsecbunkerd:

```bash
nsecbunker-client sign <target-npub> "hi, I'm signing from the command line with my nsecbunkerd!"
```

## OAuth-like provider

nsecBunker can run as an OAuth-like provider, which means it will allow new users to create accounts remotely from any compatible client.

To enable this you'll need to configure a few things on your `nsecbunker.json` config file. In addition to the normal configuration:

```json
{
    "baseUrl": "https://....", // a public URL where this nsecBunker can be reached via HTTPS
    "authPort": 3000, // Port number where the OAuth-like provider will listen
    "domains": {
        "your-domain-here": {
            "nip05": "/your-nip05-nostr.json-file", // The location where NIP-05 entries to your domain are stored

            "nip89": {
                "profile": { // a kind:0-like profile
                    "name": "my cool nsecbunker instance", // The name of your nsecBunker instance
                    "about": "...",
                },
                "operator": "npub1l2vyh47mk2p0qlsku7hg0vn29faehy9hy34ygaclpn66ukqp3afqutajft", // (optional) npub of the operator of this nsecbunker
                "relays": [ // list of relays where to publush the nip89 announcement
                    "https://relay.damus.io",
                    "https://pyramid.fiatjaf.com"
                ]
            }

            // Wallet configuration (optional)
            "wallet": {
                "lnbits": {
                    "url": "https://legend.lnbits.com", // The URL where your LNbits instance is running
                    "key": "your-lnbits-admin-key", // The admin key for your LNbits instance
                    "nostdressUrl": "http://localhost:5556" // The URL where your nostdress instance is running
                }
            }
        }
    }
}
```

With this configuration users will be able to:

* create a new key managed by your nsecbunker
* get an lnbits-based LN wallet
* get zapping capabilitiyes through nostdress

For this to work you'll need to run, in addition to `nsecbunkerd`, an lnbits instance and a [nostdress](https://github.com/believethehype/nostdress) instance. Your LNBits **needs to have the user manager extension enabled**.

- [ ] TODO: Add NWC support

When booting up, the nsecbunkerd will publish a NIP-89 announcement (`kind:31990`), which is the way clients find out about your nsecbunker.

When a bunker provides a wallet and zapping service (`wallet` and `nostdressUrl` are configured), it will add tags:
```json
{
    "tags": [
        [ "f", "wallet" ],
        [ "f", "zaps" ]
    ]
}
```

# Admin API

nsecbunkerd exposes an admin API over Nostr (NIP-46) that allows authorized administrators to manage keys, policies, permissions, and tokens remotely.

## ⚠️ Breaking Change: NIP-46 Compliance (v0.11.0)

**Previous versions** of nsecbunkerd used event kind `24134` for admin API responses. This was a custom extension that was never part of the official NIP-46 specification.

**Starting with v0.11.0**, all admin communication now uses kind `24133` (`NDKKind.NostrConnect`) to be fully compliant with the [NIP-46 specification](https://github.com/nostr-protocol/nips/blob/master/46.md).

### Why this change?

1. **NIP-46 Compliance**: The NIP-46 spec only defines kind `24133` for all Nostr Connect communication. Kind `24134` was never standardized and doesn't exist in the spec.

2. **Interoperability**: Using the standard kind ensures compatibility with other NIP-46 implementations and clients.

3. **Simplification**: Having a single event kind for all NIP-46 communication (both standard signing requests and admin methods) simplifies the protocol.

### Migration Guide

If you have custom clients that communicate with the nsecbunkerd admin API:

- **Update your client** to listen for responses on kind `24133` instead of `24134`
- **No changes needed** for standard NIP-46 signing operations (these already used kind `24133`)
- **Admin clients** (like [app.nsecbunker.com](https://app.nsecbunker.com)) will need to be updated to match this change

## Authentication

Only npubs listed in the `ADMIN_NPUBS` environment variable can access admin methods. All requests and responses use kind `24133` (NIP-46 NostrConnect).

## Available Methods

### Key Management

| Method | Parameters | Description |
|--------|------------|-------------|
| `get_keys` | none | List all keys with their status (locked/unlocked) |
| `get_key` | `keyName` | Get details about a specific key |
| `create_new_key` | `keyName`, `passphrase`, `[nsec]` | Create a new key or import existing nsec |
| `unlock_key` | `keyName`, `passphrase` | Unlock an encrypted key |
| `delete_key` | `keyName` | Soft-delete a key and its tokens |
| `rotate_key` | `oldKeyName`, `newKeyName`, `passphrase` | Create new key and migrate permissions |

### Policy Management

| Method | Parameters | Description |
|--------|------------|-------------|
| `get_policies` | none | List all policies with their rules |
| `get_policy` | `policyId` | Get details about a specific policy |
| `create_new_policy` | `policyJson` | Create a new policy with rules |
| `delete_policy` | `policyId` | Soft-delete a policy |

**Policy JSON Format:**
```json
{
  "name": "signing-policy",
  "expires_at": "2024-12-31T23:59:59Z",
  "rules": [
    { "method": "sign_event", "kind": 1, "use_count": 100 },
    { "method": "sign_event", "kind": 7 }
  ]
}
```

### Permission Management

| Method | Parameters | Description |
|--------|------------|-------------|
| `get_key_users` | `keyName` | List all users with access to a key |
| `grant_permission` | `keyName`, `userPubkey`, `policyId`, `[description]` | Grant user access to a key with a policy |
| `revoke_permission` | `keyName`, `userPubkey` | Revoke user's access to a key |
| `get_permissions` | `keyName`, `userPubkey` | Get user's permissions on a key |
| `rename_key_user` | `userPubkey`, `description` | Update a user's description |
| `revoke_user` | `keyUserId` | Revoke user by ID |

### Token Management

| Method | Parameters | Description |
|--------|------------|-------------|
| `get_key_tokens` | `keyName` | List all tokens for a key |
| `get_token` | `tokenId` | Get details about a specific token |
| `create_new_token` | `keyName`, `clientName`, `policyId`, `[durationInHours]` | Create an access token |
| `revoke_token` | `tokenId` | Revoke (soft-delete) a token |
| `validate_token` | `tokenString` | Check if a token is valid |

### Utility

| Method | Parameters | Description |
|--------|------------|-------------|
| `ping` | none | Health check - returns "pong" |
| `create_account` | `[username]`, `[domain]`, `[email]` | Create a new user account (OAuth flow) |

## Response Format

All responses follow NIP-46 format:
```json
{
  "id": "<request_id>",
  "result": "<json_stringified_result>",
  "error": "<optional_error_string>"
}
```

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

# Authors

* [pablof7z](nostr:npub1l2vyh47mk2p0qlsku7hg0vn29faehy9hy34ygaclpn66ukqp3afqutajft)
    * npub1l2vyh47mk2p0qlsku7hg0vn29faehy9hy34ygaclpn66ukqp3afqutajft

# License

MIT