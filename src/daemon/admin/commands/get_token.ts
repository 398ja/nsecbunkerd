import { NDKKind, NDKRpcRequest } from "@nostr-dev-kit/ndk";
import AdminInterface from "../index.js";
import prisma from "../../../db.js";

export default async function getToken(admin: AdminInterface, req: NDKRpcRequest) {
    const [tokenIdStr] = req.params as [string];

    if (!tokenIdStr) throw new Error("Invalid params: tokenId required");

    const tokenId = parseInt(tokenIdStr);
    if (isNaN(tokenId)) throw new Error("Invalid params: tokenId must be a number");

    const token = await prisma.token.findUnique({
        where: { id: tokenId },
        include: {
            policy: true,
            KeyUser: true,
        },
    });

    if (!token) {
        throw new Error(`Token with id '${tokenId}' not found`);
    }

    // Get the key's npub for the token string
    let npub: string | null = null;
    if (admin.getKeys) {
        const keys = await admin.getKeys();
        const key = keys.find((k) => k.name === token.keyName);
        npub = key?.npub || null;
    }

    const result = JSON.stringify({
        id: token.id,
        key_name: token.keyName,
        token: npub ? `${npub}#${token.token}` : token.token,
        client_name: token.clientName,
        created_by: token.createdBy,
        policy_id: token.policyId,
        policy_name: token.policy?.name,
        created_at: token.createdAt,
        updated_at: token.updatedAt,
        expires_at: token.expiresAt,
        deleted_at: token.deletedAt,
        redeemed_at: token.redeemedAt,
        redeemed_by: token.KeyUser?.description,
    });

    return admin.rpc.sendResponse(req.id, req.pubkey, result, NDKKind.NostrConnect);
}
