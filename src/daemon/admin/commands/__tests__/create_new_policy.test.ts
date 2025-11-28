import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockAdmin, createMockRequest, getResponseResult, resetMocks, mockPrisma } from './test-utils';

// Mock the prisma module
vi.mock('../../../../db.js', () => ({
    default: mockPrisma,
}));

import createNewPolicy from '../create_new_policy';

describe('create_new_policy', () => {
    beforeEach(() => {
        resetMocks();
    });

    it('should throw error when policy param is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest([]);

        await expect(createNewPolicy(admin as any, req)).rejects.toThrow('Invalid params');
    });

    it('should throw error when policy is invalid JSON', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['not valid json']);

        await expect(createNewPolicy(admin as any, req)).rejects.toThrow();
    });

    it('should create policy without rules', async () => {
        const admin = createMockAdmin();
        const policy = {
            name: 'test-policy',
            rules: [],
        };
        const req = createMockRequest([JSON.stringify(policy)]);

        mockPrisma.policy.create.mockResolvedValue({
            id: 1,
            name: 'test-policy',
        });

        await createNewPolicy(admin as any, req);

        expect(mockPrisma.policy.create).toHaveBeenCalledWith({
            data: {
                name: 'test-policy',
                expiresAt: undefined,
            },
        });

        expect(admin.rpc.sendResponse).toHaveBeenCalledTimes(1);
        const result = getResponseResult(admin);
        expect(result).toEqual(['ok']);
    });

    it('should create policy with rules', async () => {
        const admin = createMockAdmin();
        const policy = {
            name: 'signing-policy',
            expires_at: '2024-12-31T23:59:59Z',
            rules: [
                { method: 'sign_event', kind: 1, use_count: 100 },
                { method: 'sign_event', kind: 7 },
            ],
        };
        const req = createMockRequest([JSON.stringify(policy)]);

        mockPrisma.policy.create.mockResolvedValue({
            id: 1,
            name: 'signing-policy',
        });
        mockPrisma.policyRule.create.mockResolvedValue({});

        await createNewPolicy(admin as any, req);

        expect(mockPrisma.policy.create).toHaveBeenCalledWith({
            data: {
                name: 'signing-policy',
                expiresAt: '2024-12-31T23:59:59Z',
            },
        });

        expect(mockPrisma.policyRule.create).toHaveBeenCalledTimes(2);
        expect(mockPrisma.policyRule.create).toHaveBeenCalledWith({
            data: {
                Policy: { connect: { id: 1 } },
                kind: '1',
                method: 'sign_event',
                maxUsageCount: 100,
                currentUsageCount: 0,
            },
        });

        const result = getResponseResult(admin);
        expect(result).toEqual(['ok']);
    });

    it('should use default method sign_event when not specified', async () => {
        const admin = createMockAdmin();
        const policy = {
            name: 'default-method-policy',
            rules: [
                { kind: 1 }, // No method specified
            ],
        };
        const req = createMockRequest([JSON.stringify(policy)]);

        mockPrisma.policy.create.mockResolvedValue({ id: 1 });
        mockPrisma.policyRule.create.mockResolvedValue({});

        await createNewPolicy(admin as any, req);

        expect(mockPrisma.policyRule.create).toHaveBeenCalledWith({
            data: {
                Policy: { connect: { id: 1 } },
                kind: '1',
                method: 'sign_event',
                maxUsageCount: undefined,
                currentUsageCount: 0,
            },
        });
    });
});
