import { NDKKind, NDKRpcRequest } from "@nostr-dev-kit/ndk";
import { nip19 } from "nostr-tools";
import AdminInterface from "../index.js";
import prisma from "../../../db.js";

export default async function getPermissions(admin: AdminInterface, req: NDKRpcRequest) {
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

    // Find the KeyUser with signing conditions
    const keyUser = await prisma.keyUser.findUnique({
        where: {
            unique_key_user: {
                keyName,
                userPubkey: normalizedPubkey,
            },
        },
        include: {
            signingConditions: true,
        },
    });

    if (!keyUser) {
        throw new Error(`Permission not found for user on key '${keyName}'`);
    }

    const result = JSON.stringify({
        id: keyUser.id,
        key_name: keyUser.keyName,
        user_pubkey: keyUser.userPubkey,
        active: keyUser.revokedAt === null,
        created_at: keyUser.createdAt,
        updated_at: keyUser.updatedAt,
        revoked_at: keyUser.revokedAt,
        last_used_at: keyUser.lastUsedAt,
        description: keyUser.description,
        signing_conditions: keyUser.signingConditions.map((sc) => ({
            id: sc.id,
            method: sc.method,
            kind: sc.kind,
            content: sc.content,
            allowed: sc.allowed,
        })),
    });

    return admin.rpc.sendResponse(req.id, req.pubkey, result, NDKKind.NostrConnect);
}
