import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockAdmin, createMockRequest, getResponseResult, resetMocks, mockPrisma } from './test-utils';

// Mock the prisma module
vi.mock('../../../../db.js', () => ({
    default: mockPrisma,
}));

import renameKeyUser from '../rename_key_user';

describe('rename_key_user', () => {
    beforeEach(() => {
        resetMocks();
    });

    it('should throw error when keyUserPubkey is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest([]);

        await expect(renameKeyUser(admin as any, req)).rejects.toThrow('Invalid params');
    });

    it('should throw error when name is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['pubkey123']);

        await expect(renameKeyUser(admin as any, req)).rejects.toThrow('Invalid params');
    });

    it('should throw error when key user is not found', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['pubkey123', 'New Name']);

        mockPrisma.keyUser.findFirst.mockResolvedValue(null);

        await expect(renameKeyUser(admin as any, req)).rejects.toThrow('Key user not found');
    });

    it('should update key user description', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['pubkey123', 'New Description']);

        mockPrisma.keyUser.findFirst.mockResolvedValue({
            id: 1,
            userPubkey: 'pubkey123',
            description: 'Old Description',
        });

        mockPrisma.keyUser.update.mockResolvedValue({
            id: 1,
            description: 'New Description',
        });

        await renameKeyUser(admin as any, req);

        expect(mockPrisma.keyUser.findFirst).toHaveBeenCalledWith({
            where: {
                userPubkey: 'pubkey123',
            },
        });

        expect(mockPrisma.keyUser.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: { description: 'New Description' },
        });

        expect(admin.rpc.sendResponse).toHaveBeenCalledTimes(1);
        const result = getResponseResult(admin);
        expect(result).toEqual(['ok']);
    });
});
