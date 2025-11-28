import { NDKKind, NDKRpcRequest } from "@nostr-dev-kit/ndk";
import AdminInterface from "../index.js";
import prisma from "../../../db.js";

export default async function getKey(admin: AdminInterface, req: NDKRpcRequest) {
    const [keyName] = req.params as [string];

    if (!keyName) throw new Error("Invalid params: keyName required");
    if (!admin.getKeys) throw new Error("getKeys() not implemented");

    // Get all keys to check locked status
    const keys = await admin.getKeys();
    const keyInfo = keys.find((k) => k.name === keyName);

    if (!keyInfo) {
        throw new Error(`Key '${keyName}' not found`);
    }

    // Get additional metadata from database
    const dbKey = await prisma.key.findUnique({
        where: { keyName },
    });

    const result = JSON.stringify({
        name: keyInfo.name,
        npub: keyInfo.npub || null,
        locked: !keyInfo.npub, // If no npub, the key is locked
        created_at: dbKey?.createdAt || null,
        updated_at: dbKey?.updatedAt || null,
    });

    return admin.rpc.sendResponse(req.id, req.pubkey, result, NDKKind.NostrConnect);
}