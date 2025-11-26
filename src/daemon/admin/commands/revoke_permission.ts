import { NDKKind, NDKRpcRequest } from "@nostr-dev-kit/ndk";
import { nip19 } from "nostr-tools";
import AdminInterface from "../index.js";
import prisma from "../../../db.js";

export default async function revokePermission(admin: AdminInterface, req: NDKRpcRequest) {
    const [keyName, userPubkey] = req.params as [string, string];

    if (!keyName || !userPubkey) {
        throw new Error("Invalid params: keyName and userPubkey required");
    }

    // Normalize userPubkey (convert npub to hex if needed)
    let normalizedPubkey = userPubkey;
    if (userPubkey.startsWith('npub1')) {
        try {
            const decoded = nip19.decode(userPubkey);
            if (decoded.type === 'npub') {
                normalizedPubkey = decoded.data as string;
            }
        } catch (e) {
            throw new Error("Invalid npub format");
        }
    }

    // Find the KeyUser
    const keyUser = await prisma.keyUser.findUnique({
        where: {
            unique_key_user: {
                keyName,
                userPubkey: normalizedPubkey,
            },
        },
    });

    if (!keyUser) {
        throw new Error(`Permission not found for user on key '${keyName}'`);
    }

    if (keyUser.revokedAt) {
        throw new Error(`Permission already revoked`);
    }

    // Revoke by setting revokedAt timestamp
    await prisma.keyUser.update({
        where: { id: keyUser.id },
        data: { revokedAt: new Date() },
    });

    const result = JSON.stringify(["ok"]);

    return admin.rpc.sendResponse(req.id, req.pubkey, result, NDKKind.NostrConnect);
}
