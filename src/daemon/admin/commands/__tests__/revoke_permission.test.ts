import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockAdmin, createMockRequest, getResponseResult, resetMocks, mockPrisma } from './test-utils';

// Mock the prisma module
vi.mock('../../../../db.js', () => ({
    default: mockPrisma,
}));

import revokePermission from '../revoke_permission';

describe('revoke_permission', () => {
    beforeEach(() => {
        resetMocks();
    });

    it('should throw error when keyName is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest([]);

        await expect(revokePermission(admin as any, req)).rejects.toThrow('Invalid params: keyName and userPubkey required');
    });

    it('should throw error when userPubkey is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key']);

        await expect(revokePermission(admin as any, req)).rejects.toThrow('Invalid params: keyName and userPubkey required');
    });

    it('should throw error when permission is not found', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key', 'pubkey123']);

        mockPrisma.keyUser.findUnique.mockResolvedValue(null);

        await expect(revokePermission(admin as any, req)).rejects.toThrow("Permission not found for user on key 'my-key'");
    });

    it('should throw error when permission is already revoked', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key', 'pubkey123']);

        mockPrisma.keyUser.findUnique.mockResolvedValue({
            id: 1,
            keyName: 'my-key',
            userPubkey: 'pubkey123',
            revokedAt: new Date('2024-01-01'),
        });

        await expect(revokePermission(admin as any, req)).rejects.toThrow('Permission already revoked');
    });

    it('should revoke permission successfully', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key', 'pubkey123']);

        mockPrisma.keyUser.findUnique.mockResolvedValue({
            id: 1,
            keyName: 'my-key',
            userPubkey: 'pubkey123',
            revokedAt: null,
        });
        mockPrisma.keyUser.update.mockResolvedValue({});

        await revokePermission(admin as any, req);

        // Verify KeyUser was updated with revokedAt
        expect(mockPrisma.keyUser.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: { revokedAt: expect.any(Date) },
        });

        // Verify response
        expect(admin.rpc.sendResponse).toHaveBeenCalledTimes(1);
        const result = getResponseResult(admin);
        expect(result).toEqual(['ok']);
    });
});
