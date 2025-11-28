import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockAdmin, createMockRequest, getResponseResult, resetMocks, mockPrisma } from './test-utils';

// Mock the prisma module
vi.mock('../../../../db.js', () => ({
    default: mockPrisma,
}));

import deleteKey from '../delete_key';

describe('delete_key', () => {
    beforeEach(() => {
        resetMocks();
    });

    it('should throw error when keyName is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest([]);

        await expect(deleteKey(admin as any, req)).rejects.toThrow('Invalid params: keyName required');
    });

    it('should throw error when key is not found', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key']);

        mockPrisma.key.findUnique.mockResolvedValue(null);

        await expect(deleteKey(admin as any, req)).rejects.toThrow("Key 'my-key' not found");
    });

    it('should throw error when key is already deleted', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key']);

        mockPrisma.key.findUnique.mockResolvedValue({
            keyName: 'my-key',
            deletedAt: new Date('2024-01-01'),
        });

        await expect(deleteKey(admin as any, req)).rejects.toThrow("Key 'my-key' is already deleted");
    });

    it('should soft-delete key and its tokens', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key']);

        mockPrisma.key.findUnique.mockResolvedValue({
            keyName: 'my-key',
            deletedAt: null,
        });
        mockPrisma.key.update.mockResolvedValue({});
        mockPrisma.token.updateMany.mockResolvedValue({ count: 2 });

        await deleteKey(admin as any, req);

        // Verify key was soft-deleted
        expect(mockPrisma.key.update).toHaveBeenCalledWith({
            where: { keyName: 'my-key' },
            data: { deletedAt: expect.any(Date) },
        });

        // Verify tokens were soft-deleted
        expect(mockPrisma.token.updateMany).toHaveBeenCalledWith({
            where: { keyName: 'my-key', deletedAt: null },
            data: { deletedAt: expect.any(Date) },
        });

        // Verify response
        expect(admin.rpc.sendResponse).toHaveBeenCalledTimes(1);
        const result = getResponseResult(admin);
        expect(result).toEqual(['ok']);
    });
});
