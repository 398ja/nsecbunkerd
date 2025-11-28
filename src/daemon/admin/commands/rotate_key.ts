import { NDKKind, NDKPrivateKeySigner, NDKRpcRequest } from "@nostr-dev-kit/ndk";
import { nip19 } from "nostr-tools";
import AdminInterface from "../index.js";
import prisma from "../../../db.js";
import { saveEncrypted } from "../../../commands/add.js";
import { hexToBytes } from "../../../utils/hex.js";

export default async function rotateKey(admin: AdminInterface, req: NDKRpcRequest) {
    const [oldKeyName, newKeyName, passphrase] = req.params as [string, string, string];

    if (!oldKeyName || !newKeyName || !passphrase) {
        throw new Error("Invalid params: oldKeyName, newKeyName, and passphrase required");
    }

    if (!admin.loadNsec) throw new Error("No loadNsec method");

    // Validate old key exists
    const oldKey = await prisma.key.findUnique({
        where: { keyName: oldKeyName },
    });

    if (!oldKey) {
        throw new Error(`Key '${oldKeyName}' not found`);
    }

    if (oldKey.deletedAt) {
        throw new Error(`Key '${oldKeyName}' is already deleted`);
    }

    // Check new key name doesn't exist
    const existingNewKey = await prisma.key.findUnique({
        where: { keyName: newKeyName },
    });

    if (existingNewKey) {
        throw new Error(`Key '${newKeyName}' already exists`);
    }

    // Generate new key
    const newSigner = NDKPrivateKeySigner.generate();
    const newUser = await newSigner.user();
    const newNsec = nip19.nsecEncode(hexToBytes(newSigner.privateKey!));

    // Save new key encrypted
    await saveEncrypted(
        admin.configFile,
        newNsec,
        passphrase,
        newKeyName
    );

    // Create new Key record in database
    await prisma.key.create({
        data: {
            keyName: newKeyName,
            pubkey: newUser.pubkey,
        },
    });

    // Copy KeyUser records from old key to new key
    const oldKeyUsers = await prisma.keyUser.findMany({
        where: { keyName: oldKeyName },
        include: { signingConditions: true },
    });

    for (const oldKeyUser of oldKeyUsers) {
        // Create new KeyUser for the new key
        const newKeyUser = await prisma.keyUser.create({
            data: {
                keyName: newKeyName,
                userPubkey: oldKeyUser.userPubkey,
                description: oldKeyUser.description,
            },
        });

        // Copy signing conditions
        for (const condition of oldKeyUser.signingConditions) {
            await prisma.signingCondition.create({
                data: {
                    keyUserId: newKeyUser.id,
                    method: condition.method,
                    kind: condition.kind,
                    content: condition.content,
                    allowed: condition.allowed,
                },
            });
        }
    }

    // Soft-delete old key
    await prisma.key.update({
        where: { keyName: oldKeyName },
        data: { deletedAt: new Date() },
    });

    // Also soft-delete tokens for old key (tokens are key-specific, not transferred)
    await prisma.token.updateMany({
        where: {
            keyName: oldKeyName,
            deletedAt: null,
        },
        data: { deletedAt: new Date() },
    });

    // Load the new key into the daemon
    await admin.loadNsec(newKeyName, newNsec);

    const result = JSON.stringify({
        npub: newUser.npub,
        name: newKeyName,
    });

    return admin.rpc.sendResponse(req.id, req.pubkey, result, NDKKind.NostrConnect);
}
