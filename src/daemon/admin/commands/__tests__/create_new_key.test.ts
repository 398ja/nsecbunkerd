import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockAdmin, createMockRequest, getResponseResult, resetMocks } from './test-utils';

// Mock the saveEncrypted function
vi.mock('../../../../commands/add.js', () => ({
    saveEncrypted: vi.fn().mockResolvedValue(undefined),
}));

// Mock the setupSkeletonProfile function
vi.mock('../../../lib/profile.js', () => ({
    setupSkeletonProfile: vi.fn(),
}));

import createNewKey from '../create_new_key';

describe('create_new_key', () => {
    beforeEach(() => {
        resetMocks();
    });

    it('should throw error when keyName is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest([]);

        await expect(createNewKey(admin as any, req)).rejects.toThrow('Invalid params');
    });

    it('should throw error when passphrase is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key']);

        await expect(createNewKey(admin as any, req)).rejects.toThrow('Invalid params');
    });

    it('should throw error when loadNsec is not implemented', async () => {
        const admin = createMockAdmin({ loadNsec: undefined });
        const req = createMockRequest(['my-key', 'passphrase']);

        await expect(createNewKey(admin as any, req)).rejects.toThrow('No unlockKey method');
    });

    it('should generate a new key when no nsec provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key', 'passphrase']);

        await createNewKey(admin as any, req);

        // Verify loadNsec was called with the key name and an nsec
        expect(admin.loadNsec).toHaveBeenCalledWith(
            'my-key',
            expect.stringMatching(/^nsec1/)
        );

        // Verify response contains npub
        expect(admin.rpc.sendResponse).toHaveBeenCalledTimes(1);
        const result = getResponseResult(admin);
        expect(result.npub).toMatch(/^npub1/);
    });

    it('should import existing key when nsec provided', async () => {
        const admin = createMockAdmin();
        // Valid nsec for testing (generates a known pubkey)
        const testNsec = 'nsec1qyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqstywftw';
        const req = createMockRequest(['my-key', 'passphrase', testNsec]);

        await createNewKey(admin as any, req);

        // Verify loadNsec was called
        expect(admin.loadNsec).toHaveBeenCalledWith(
            'my-key',
            expect.stringMatching(/^nsec1/)
        );

        // Verify response
        expect(admin.rpc.sendResponse).toHaveBeenCalledTimes(1);
        const result = getResponseResult(admin);
        expect(result.npub).toMatch(/^npub1/);
    });
});
