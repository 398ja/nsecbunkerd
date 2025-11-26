import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockAdmin, createMockRequest, getResponseResult, resetMocks, mockPrisma } from './test-utils';

// Mock the prisma module
vi.mock('../../../../db.js', () => ({
    default: mockPrisma,
}));

import revokeUser from '../revoke_user';

describe('revoke_user', () => {
    beforeEach(() => {
        resetMocks();
    });

    it('should throw error when keyUserId is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest([]);

        await expect(revokeUser(admin as any, req)).rejects.toThrow('Invalid params');
    });

    it('should throw error when keyUserId is not a number', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['not-a-number']);

        await expect(revokeUser(admin as any, req)).rejects.toThrow('Invalid params');
    });

    it('should revoke user by setting revokedAt', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['1']);

        mockPrisma.keyUser.update.mockResolvedValue({
            id: 1,
            revokedAt: new Date(),
        });

        await revokeUser(admin as any, req);

        expect(mockPrisma.keyUser.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: { revokedAt: expect.any(Date) },
        });

        expect(admin.rpc.sendResponse).toHaveBeenCalledTimes(1);
        const result = getResponseResult(admin);
        expect(result).toEqual(['ok']);
    });

    it('should parse string id to integer', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['42']);

        mockPrisma.keyUser.update.mockResolvedValue({
            id: 42,
            revokedAt: new Date(),
        });

        await revokeUser(admin as any, req);

        expect(mockPrisma.keyUser.update).toHaveBeenCalledWith({
            where: { id: 42 },
            data: { revokedAt: expect.any(Date) },
        });
    });
});
