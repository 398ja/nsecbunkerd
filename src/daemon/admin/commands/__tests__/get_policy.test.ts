import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockAdmin, createMockRequest, getResponseResult, resetMocks, mockPrisma } from './test-utils';

// Mock the prisma module
vi.mock('../../../../db.js', () => ({
    default: mockPrisma,
}));

import getPolicy from '../get_policy';

describe('get_policy', () => {
    beforeEach(() => {
        resetMocks();
    });

    it('should throw error when policyId is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest([]);

        await expect(getPolicy(admin as any, req)).rejects.toThrow('Invalid params: policyId required');
    });

    it('should throw error when policyId is not a number', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['not-a-number']);

        await expect(getPolicy(admin as any, req)).rejects.toThrow('Invalid params: policyId must be a number');
    });

    it('should throw error when policy is not found', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['1']);

        mockPrisma.policy.findUnique.mockResolvedValue(null);

        await expect(getPolicy(admin as any, req)).rejects.toThrow("Policy with id '1' not found");
    });

    it('should throw error when policy is deleted', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['1']);

        mockPrisma.policy.findUnique.mockResolvedValue({
            id: 1,
            name: 'test-policy',
            deletedAt: new Date('2024-01-01'),
            rules: [],
        });

        await expect(getPolicy(admin as any, req)).rejects.toThrow("Policy with id '1' has been deleted");
    });

    it('should return policy details with rules', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['1']);

        mockPrisma.policy.findUnique.mockResolvedValue({
            id: 1,
            name: 'signing-policy',
            description: 'A test policy',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
            expiresAt: null,
            deletedAt: null,
            rules: [
                { id: 1, method: 'sign_event', kind: '1', maxUsageCount: 100, currentUsageCount: 5 },
                { id: 2, method: 'sign_event', kind: '7', maxUsageCount: null, currentUsageCount: 0 },
            ],
        });

        await getPolicy(admin as any, req);

        expect(admin.rpc.sendResponse).toHaveBeenCalledTimes(1);
        const result = getResponseResult(admin);
        expect(result.id).toBe(1);
        expect(result.name).toBe('signing-policy');
        expect(result.description).toBe('A test policy');
        expect(result.rules).toHaveLength(2);
        expect(result.rules[0].method).toBe('sign_event');
        expect(result.rules[0].kind).toBe('1');
    });
});
