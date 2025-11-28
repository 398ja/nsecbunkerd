import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockAdmin, createMockRequest, getResponseResult, resetMocks, mockPrisma } from './test-utils';

// Mock the prisma module
vi.mock('../../../../db.js', () => ({
    default: mockPrisma,
}));

import getPermissions from '../get_permissions';

describe('get_permissions', () => {
    beforeEach(() => {
        resetMocks();
    });

    it('should throw error when keyName is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest([]);

        await expect(getPermissions(admin as any, req)).rejects.toThrow('Invalid params: keyName and userPubkey required');
    });

    it('should throw error when userPubkey is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key']);

        await expect(getPermissions(admin as any, req)).rejects.toThrow('Invalid params: keyName and userPubkey required');
    });

    it('should throw error when permission is not found', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key', 'pubkey123']);

        mockPrisma.keyUser.findUnique.mockResolvedValue(null);

        await expect(getPermissions(admin as any, req)).rejects.toThrow("Permission not found for user on key 'my-key'");
    });

    it('should return permissions for active user', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key', 'pubkey123']);

        mockPrisma.keyUser.findUnique.mockResolvedValue({
            id: 1,
            keyName: 'my-key',
            userPubkey: 'pubkey123',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
            revokedAt: null,
            lastUsedAt: new Date('2024-01-03'),
            description: 'Test User',
            signingConditions: [
                { id: 1, method: 'sign_event', kind: '1', content: null, allowed: true },
                { id: 2, method: 'sign_event', kind: '7', content: null, allowed: true },
            ],
        });

        await getPermissions(admin as any, req);

        expect(admin.rpc.sendResponse).toHaveBeenCalledTimes(1);
        const result = getResponseResult(admin);
        expect(result.id).toBe(1);
        expect(result.key_name).toBe('my-key');
        expect(result.user_pubkey).toBe('pubkey123');
        expect(result.active).toBe(true);
        expect(result.description).toBe('Test User');
        expect(result.signing_conditions).toHaveLength(2);
        expect(result.signing_conditions[0].method).toBe('sign_event');
    });

    it('should return inactive status for revoked user', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key', 'pubkey123']);

        mockPrisma.keyUser.findUnique.mockResolvedValue({
            id: 1,
            keyName: 'my-key',
            userPubkey: 'pubkey123',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
            revokedAt: new Date('2024-01-05'),
            lastUsedAt: new Date('2024-01-03'),
            description: 'Revoked User',
            signingConditions: [],
        });

        await getPermissions(admin as any, req);

        const result = getResponseResult(admin);
        expect(result.active).toBe(false);
        expect(result.revoked_at).toBeDefined();
    });
});
