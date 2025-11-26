import NDK, { NDKEvent, NDKKind, NDKPrivateKeySigner, NDKRpcRequest, type NostrEvent } from "@nostr-dev-kit/ndk";
import AdminInterface from "../index.js";
import { saveEncrypted } from "../../../commands/add.js";
import { nip19 } from 'nostr-tools';
import { setupSkeletonProfile } from "../../lib/profile.js";
import { bytesToHex, hexToBytes } from "../../../utils/hex.js";
import prisma from "../../../db.js";

export default async function createNewKey(admin: AdminInterface, req: NDKRpcRequest) {
    const [ keyName, passphrase, _nsec ] = req.params as [ string, string, string? ];

    if (!keyName || !passphrase) throw new Error("Invalid params");
    if (!admin.loadNsec) throw new Error("No unlockKey method");

    let key;

    if (_nsec) {
        key = new NDKPrivateKeySigner(bytesToHex(nip19.decode(_nsec).data as Uint8Array));
    } else {
        key = NDKPrivateKeySigner.generate();

        setupSkeletonProfile(key);

        console.log(`setting up skeleton profile for ${keyName}`);
    }

    const user = await key.user();
    const nsec = nip19.nsecEncode(hexToBytes(key.privateKey!));

    await saveEncrypted(
        admin.configFile,
        nsec,
        passphrase,
        keyName
    );

    await admin.loadNsec(keyName, nsec);

    // Also save to database so delete_key can find it
    await prisma.key.upsert({
        where: { keyName },
        update: {
            pubkey: user.pubkey,
            deletedAt: null, // Ensure it's not marked as deleted
        },
        create: {
            keyName,
            pubkey: user.pubkey,
        },
    });

    const result = JSON.stringify({
        npub: user.npub,
    });

    return admin.rpc.sendResponse(req.id, req.pubkey, result, NDKKind.NostrConnect);
}
