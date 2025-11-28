import { NDKKind, NDKRpcRequest } from "@nostr-dev-kit/ndk";
import AdminInterface from "../index.js";
import prisma from "../../../db.js";

export default async function deletePolicy(admin: AdminInterface, req: NDKRpcRequest) {
    const [policyIdStr] = req.params as [string];

    if (!policyIdStr) throw new Error("Invalid params: policyId required");

    const policyId = parseInt(policyIdStr);
    if (isNaN(policyId)) throw new Error("Invalid params: policyId must be a number");

    const policy = await prisma.policy.findUnique({
        where: { id: policyId },
    });

    if (!policy) {
        throw new Error(`Policy with id '${policyId}' not found`);
    }

    if (policy.deletedAt) {
        throw new Error(`Policy with id '${policyId}' is already deleted`);
    }

    // Soft delete the policy
    await prisma.policy.update({
        where: { id: policyId },
        data: { deletedAt: new Date() },
    });

    const result = JSON.stringify(["ok"]);

    return admin.rpc.sendResponse(req.id, req.pubkey, result, NDKKind.NostrConnect);
}
