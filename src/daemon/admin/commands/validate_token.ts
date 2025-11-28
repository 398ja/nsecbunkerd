import { NDKKind, NDKRpcRequest } from "@nostr-dev-kit/ndk";
import AdminInterface from "../index.js";
import prisma from "../../../db.js";

export default async function validateToken(admin: AdminInterface, req: NDKRpcRequest) {
    const [tokenString] = req.params as [string];

    if (!tokenString) throw new Error("Invalid params: token required");

    // Parse token string - may include npub# prefix
    let tokenValue = tokenString;
    if (tokenString.includes('#')) {
        tokenValue = tokenString.split('#')[1];
    }

    const token = await prisma.token.findUnique({
        where: { token: tokenValue },
    });

    if (!token) {
        const result = JSON.stringify({
            valid: false,
            reason: "Token not found",
        });
        return admin.rpc.sendResponse(req.id, req.pubkey, result, NDKKind.NostrConnect);
    }

    // Check if token is revoked (soft deleted)
    if (token.deletedAt) {
        const result = JSON.stringify({
            valid: false,
            reason: "Token has been revoked",
        });
        return admin.rpc.sendResponse(req.id, req.pubkey, result, NDKKind.NostrConnect);
    }

    // Check if token is expired
    if (token.expiresAt && token.expiresAt < new Date()) {
        const result = JSON.stringify({
            valid: false,
            reason: "Token has expired",
        });
        return admin.rpc.sendResponse(req.id, req.pubkey, result, NDKKind.NostrConnect);
    }

    // Token is valid
    const result = JSON.stringify({
        valid: true,
        key_name: token.keyName,
        client_name: token.clientName,
        expires_at: token.expiresAt,
        redeemed: token.redeemedAt !== null,
    });

    return admin.rpc.sendResponse(req.id, req.pubkey, result, NDKKind.NostrConnect);
}
