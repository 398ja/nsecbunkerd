import { NDKKind, NDKRpcRequest } from "@nostr-dev-kit/ndk";
import AdminInterface from "../index.js";
import prisma from "../../../db.js";

export default async function revokeToken(admin: AdminInterface, req: NDKRpcRequest) {
    const [tokenIdStr] = req.params as [string];

    if (!tokenIdStr) throw new Error("Invalid params: tokenId required");

    const tokenId = parseInt(tokenIdStr);
    if (isNaN(tokenId)) throw new Error("Invalid params: tokenId must be a number");

    const token = await prisma.token.findUnique({
        where: { id: tokenId },
    });

    if (!token) {
        throw new Error(`Token with id '${tokenId}' not found`);
    }

    if (token.deletedAt) {
        throw new Error(`Token with id '${tokenId}' is already revoked`);
    }

    // Soft delete the token
    await prisma.token.update({
        where: { id: tokenId },
        data: { deletedAt: new Date() },
    });

    const result = JSON.stringify(["ok"]);

    return admin.rpc.sendResponse(req.id, req.pubkey, result, NDKKind.NostrConnect);
}
