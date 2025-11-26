import { NDKKind, NDKRpcRequest } from "@nostr-dev-kit/ndk";
import AdminInterface from "../index.js";
import prisma from "../../../db.js";

export default async function getPolicy(admin: AdminInterface, req: NDKRpcRequest) {
    const [policyIdStr] = req.params as [string];

    if (!policyIdStr) throw new Error("Invalid params: policyId required");

    const policyId = parseInt(policyIdStr);
    if (isNaN(policyId)) throw new Error("Invalid params: policyId must be a number");

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

    const result = JSON.stringify({
        id: policy.id,
        name: policy.name,
        description: policy.description,
        created_at: policy.createdAt,
        updated_at: policy.updatedAt,
        expires_at: policy.expiresAt,
        rules: policy.rules.map((r) => ({
            id: r.id,
            method: r.method,
            kind: r.kind,
            max_usage_count: r.maxUsageCount,
            current_usage_count: r.currentUsageCount,
        })),
    });

    return admin.rpc.sendResponse(req.id, req.pubkey, result, NDKKind.NostrConnect);
}
