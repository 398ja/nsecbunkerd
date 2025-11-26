import { NDKKind, NDKRpcRequest } from "@nostr-dev-kit/ndk";
import AdminInterface from "../index.js";
import prisma from "../../../db.js";

export default async function deleteKey(admin: AdminInterface, req: NDKRpcRequest) {
    const [keyName] = req.params as [string];

    if (!keyName) throw new Error("Invalid params: keyName required");

    // Check if key exists in database
    const existingKey = await prisma.key.findUnique({
        where: { keyName },
    });

    if (!existingKey) {
        throw new Error(`Key '${keyName}' not found`);
    }

    if (existingKey.deletedAt) {
        throw new Error(`Key '${keyName}' is already deleted`);
    }

    // Soft delete the key
    await prisma.key.update({
        where: { keyName },
        data: { deletedAt: new Date() },
    });

    // Also soft-delete all tokens for this key
    await prisma.token.updateMany({
        where: {
            keyName,
            deletedAt: null,
        },
        data: { deletedAt: new Date() },
    });

    const result = JSON.stringify(["ok"]);

    return admin.rpc.sendResponse(req.id, req.pubkey, result, NDKKind.NostrConnect);
}
