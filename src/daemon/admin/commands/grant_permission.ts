import { NDKKind, NDKRpcRequest } from "@nostr-dev-kit/ndk";
import { nip19 } from "nostr-tools";
import AdminInterface from "../index.js";
import prisma from "../../../db.js";

export default async function grantPermission(admin: AdminInterface, req: NDKRpcRequest) {
    const [keyName, userPubkey, policyIdStr, description] = req.params as [string, string, string, string?];

    if (!keyName || !userPubkey || !policyIdStr) {
        throw new Error("Invalid params: keyName, userPubkey, and policyId required");
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

    const policyId = parseInt(policyIdStr);
    if (isNaN(policyId)) throw new Error("Invalid params: policyId must be a number");

    // Validate policy exists
    const policy = await prisma.policy.findUnique({
        where: { id: policyId },
        include: { rules: true },
    });

    if (!policy) {
        throw new Error(`Policy with id '${policyId}' not found`);
    }

    if (policy.deletedAt) {
        throw new Error(`Policy with id '${policyId}' has been deleted`);
    }

    // Upsert KeyUser (create or update if exists)
    const keyUser = await prisma.keyUser.upsert({
        where: {
            unique_key_user: {
                keyName,
                userPubkey: normalizedPubkey,
            },
        },
        update: {
            revokedAt: null, // Re-enable if previously revoked
            description: description || undefined,
        },
        create: {
            keyName,
            userPubkey: normalizedPubkey,
            description: description || undefined,
        },
    });

    // Remove existing signing conditions for this user
    await prisma.signingCondition.deleteMany({
        where: { keyUserId: keyUser.id },
    });

    // Copy policy rules to signing conditions
    for (const rule of policy.rules) {
        await prisma.signingCondition.create({
            data: {
                keyUserId: keyUser.id,
                method: rule.method,
                kind: rule.kind,
                allowed: true,
            },
        });
    }

    const result = JSON.stringify({
        id: keyUser.id,
        key_name: keyUser.keyName,
        user_pubkey: keyUser.userPubkey,
        created_at: keyUser.createdAt,
        description: keyUser.description,
    });

    return admin.rpc.sendResponse(req.id, req.pubkey, result, NDKKind.NostrConnect);
}
