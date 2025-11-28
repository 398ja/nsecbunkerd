import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockAdmin, createMockRequest, getResponseResult, resetMocks, mockPrisma } from './test-utils';

// Mock the prisma module
vi.mock('../../../../db.js', () => ({
    default: mockPrisma,
}));

import deletePolicy from '../delete_policy';

describe('delete_policy', () => {
    beforeEach(() => {
        resetMocks();
    });

    it('should throw error when policyId is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest([]);

        await expect(deletePolicy(admin as any, req)).rejects.toThrow('Invalid params: policyId required');
    });

    it('should throw error when policyId is not a number', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['invalid']);

        await expect(deletePolicy(admin as any, req)).rejects.toThrow('Invalid params: policyId must be a number');
    });

    it('should throw error when policy is not found', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['1']);

        mockPrisma.policy.findUnique.mockResolvedValue(null);

        await expect(deletePolicy(admin as any, req)).rejects.toThrow("Policy with id '1' not found");
    });

    it('should throw error when policy is already deleted', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['1']);

        mockPrisma.policy.findUnique.mockResolvedValue({
            id: 1,
            name: 'test-policy',
            deletedAt: new Date('2024-01-01'),
        });

        await expect(deletePolicy(admin as any, req)).rejects.toThrow("Policy with id '1' is already deleted");
    });

    it('should soft-delete policy successfully', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['1']);

        mockPrisma.policy.findUnique.mockResolvedValue({
            id: 1,
            name: 'test-policy',
            deletedAt: null,
        });
        mockPrisma.policy.update.mockResolvedValue({});

        await deletePolicy(admin as any, req);

        // Verify policy was soft-deleted
        expect(mockPrisma.policy.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: { deletedAt: expect.any(Date) },
        });

        // Verify response
        expect(admin.rpc.sendResponse).toHaveBeenCalledTimes(1);
        const result = getResponseResult(admin);
        expect(result).toEqual(['ok']);
    });
});
