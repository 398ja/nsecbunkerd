import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockAdmin, createMockRequest, getResponseResult, resetMocks, mockPrisma } from './test-utils';

// Mock the prisma module
vi.mock('../../../../db.js', () => ({
    default: mockPrisma,
}));

import revokeToken from '../revoke_token';

describe('revoke_token', () => {
    beforeEach(() => {
        resetMocks();
    });

    it('should throw error when tokenId is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest([]);

        await expect(revokeToken(admin as any, req)).rejects.toThrow('Invalid params: tokenId required');
    });

    it('should throw error when tokenId is not a number', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['invalid']);

        await expect(revokeToken(admin as any, req)).rejects.toThrow('Invalid params: tokenId must be a number');
    });

    it('should throw error when token is not found', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['1']);

        mockPrisma.token.findUnique.mockResolvedValue(null);

        await expect(revokeToken(admin as any, req)).rejects.toThrow("Token with id '1' not found");
    });

    it('should throw error when token is already revoked', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['1']);

        mockPrisma.token.findUnique.mockResolvedValue({
            id: 1,
            deletedAt: new Date('2024-01-01'),
        });

        await expect(revokeToken(admin as any, req)).rejects.toThrow("Token with id '1' is already revoked");
    });

    it('should revoke token successfully', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['1']);

        mockPrisma.token.findUnique.mockResolvedValue({
            id: 1,
            deletedAt: null,
        });
        mockPrisma.token.update.mockResolvedValue({});

        await revokeToken(admin as any, req);

        // Verify token was soft-deleted
        expect(mockPrisma.token.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: { deletedAt: expect.any(Date) },
        });

        // Verify response
        expect(admin.rpc.sendResponse).toHaveBeenCalledTimes(1);
        const result = getResponseResult(admin);
        expect(result).toEqual(['ok']);
    });
});
