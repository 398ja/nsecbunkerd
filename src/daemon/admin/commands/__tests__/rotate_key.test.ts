import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockAdmin, createMockRequest, getResponseResult, resetMocks, mockPrisma } from './test-utils';

// Mock the prisma module
vi.mock('../../../../db.js', () => ({
    default: mockPrisma,
}));

// Mock the saveEncrypted function
vi.mock('../../../../commands/add.js', () => ({
    saveEncrypted: vi.fn().mockResolvedValue(undefined),
}));

import rotateKey from '../rotate_key';

describe('rotate_key', () => {
    beforeEach(() => {
        resetMocks();
    });

    it('should throw error when oldKeyName is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest([]);

        await expect(rotateKey(admin as any, req)).rejects.toThrow('Invalid params: oldKeyName, newKeyName, and passphrase required');
    });

    it('should throw error when newKeyName is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['old-key']);

        await expect(rotateKey(admin as any, req)).rejects.toThrow('Invalid params: oldKeyName, newKeyName, and passphrase required');
    });

    it('should throw error when passphrase is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['old-key', 'new-key']);

        await expect(rotateKey(admin as any, req)).rejects.toThrow('Invalid params: oldKeyName, newKeyName, and passphrase required');
    });

    it('should throw error when loadNsec is not implemented', async () => {
        const admin = createMockAdmin({ loadNsec: undefined });
        const req = createMockRequest(['old-key', 'new-key', 'passphrase']);

        await expect(rotateKey(admin as any, req)).rejects.toThrow('No loadNsec method');
    });

    it('should throw error when old key is not found', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['old-key', 'new-key', 'passphrase']);

        mockPrisma.key.findUnique.mockResolvedValue(null);

        await expect(rotateKey(admin as any, req)).rejects.toThrow("Key 'old-key' not found");
    });

    it('should throw error when old key is already deleted', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['old-key', 'new-key', 'passphrase']);

        mockPrisma.key.findUnique.mockResolvedValueOnce({
            keyName: 'old-key',
            deletedAt: new Date('2024-01-01'),
        });

        await expect(rotateKey(admin as any, req)).rejects.toThrow("Key 'old-key' is already deleted");
    });

    it('should throw error when new key name already exists', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['old-key', 'new-key', 'passphrase']);

        mockPrisma.key.findUnique
            .mockResolvedValueOnce({ keyName: 'old-key', deletedAt: null }) // old key exists
            .mockResolvedValueOnce({ keyName: 'new-key' }); // new key also exists

        await expect(rotateKey(admin as any, req)).rejects.toThrow("Key 'new-key' already exists");
    });

    it('should rotate key successfully', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['old-key', 'new-key', 'passphrase']);

        // Old key exists, new key doesn't
        mockPrisma.key.findUnique
            .mockResolvedValueOnce({ keyName: 'old-key', deletedAt: null })
            .mockResolvedValueOnce(null);

        // No existing key users to migrate
        mockPrisma.keyUser.findMany.mockResolvedValue([]);

        // Mock create operations
        mockPrisma.key.create.mockResolvedValue({});
        mockPrisma.key.update.mockResolvedValue({});
        mockPrisma.token.updateMany.mockResolvedValue({ count: 0 });

        await rotateKey(admin as any, req);

        // Verify new key was created
        expect(mockPrisma.key.create).toHaveBeenCalledWith({
            data: {
                keyName: 'new-key',
                pubkey: expect.any(String),
            },
        });

        // Verify old key was soft-deleted
        expect(mockPrisma.key.update).toHaveBeenCalledWith({
            where: { keyName: 'old-key' },
            data: { deletedAt: expect.any(Date) },
        });

        // Verify loadNsec was called
        expect(admin.loadNsec).toHaveBeenCalledWith('new-key', expect.stringMatching(/^nsec1/));

        // Verify response
        expect(admin.rpc.sendResponse).toHaveBeenCalledTimes(1);
        const result = getResponseResult(admin);
        expect(result.name).toBe('new-key');
        expect(result.npub).toMatch(/^npub1/);
    });
});
