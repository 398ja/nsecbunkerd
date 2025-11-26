import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockAdmin, createMockRequest, getResponseResult, resetMocks, mockPrisma } from './test-utils';

// Mock the prisma module
vi.mock('../../../../db.js', () => ({
    default: mockPrisma,
}));

import getKey from '../get_key';

describe('get_key', () => {
    beforeEach(() => {
        resetMocks();
    });

    it('should throw error when keyName is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest([]);

        await expect(getKey(admin as any, req)).rejects.toThrow('Invalid params: keyName required');
    });

    it('should throw error when getKeys is not implemented', async () => {
        const admin = createMockAdmin({ getKeys: undefined });
        const req = createMockRequest(['my-key']);

        await expect(getKey(admin as any, req)).rejects.toThrow('getKeys() not implemented');
    });

    it('should throw error when key is not found', async () => {
        const admin = createMockAdmin({
            getKeys: vi.fn().mockResolvedValue([
                { name: 'other-key', npub: 'npub1abc' },
            ]),
        });
        const req = createMockRequest(['my-key']);

        await expect(getKey(admin as any, req)).rejects.toThrow("Key 'my-key' not found");
    });

    it('should return key details for an unlocked key', async () => {
        const admin = createMockAdmin({
            getKeys: vi.fn().mockResolvedValue([
                { name: 'my-key', npub: 'npub1xyz123' },
            ]),
        });
        const req = createMockRequest(['my-key']);

        mockPrisma.key.findUnique.mockResolvedValue({
            keyName: 'my-key',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
        });

        await getKey(admin as any, req);

        expect(admin.rpc.sendResponse).toHaveBeenCalledTimes(1);
        const result = getResponseResult(admin);
        expect(result.name).toBe('my-key');
        expect(result.npub).toBe('npub1xyz123');
        expect(result.locked).toBe(false);
    });

    it('should return locked status for a locked key', async () => {
        const admin = createMockAdmin({
            getKeys: vi.fn().mockResolvedValue([
                { name: 'locked-key', npub: undefined }, // No npub means locked
            ]),
        });
        const req = createMockRequest(['locked-key']);

        mockPrisma.key.findUnique.mockResolvedValue({
            keyName: 'locked-key',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
        });

        await getKey(admin as any, req);

        const result = getResponseResult(admin);
        expect(result.name).toBe('locked-key');
        expect(result.npub).toBeNull();
        expect(result.locked).toBe(true);
    });
});
