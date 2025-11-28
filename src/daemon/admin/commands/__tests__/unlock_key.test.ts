import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockAdmin, createMockRequest, getResponseResult, resetMocks } from './test-utils';

import unlockKey from '../unlock_key';

describe('unlock_key', () => {
    beforeEach(() => {
        resetMocks();
    });

    it('should throw error when keyName is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest([]);

        await expect(unlockKey(admin as any, req)).rejects.toThrow('Invalid params');
    });

    it('should throw error when passphrase is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key']);

        await expect(unlockKey(admin as any, req)).rejects.toThrow('Invalid params');
    });

    it('should throw error when unlockKey method is not implemented', async () => {
        const admin = createMockAdmin({ unlockKey: undefined });
        const req = createMockRequest(['my-key', 'passphrase']);

        await expect(unlockKey(admin as any, req)).rejects.toThrow('No unlockKey method');
    });

    it('should return success true when unlock succeeds', async () => {
        const admin = createMockAdmin({
            unlockKey: vi.fn().mockResolvedValue(true),
        });
        const req = createMockRequest(['my-key', 'correct-passphrase']);

        await unlockKey(admin as any, req);

        expect(admin.unlockKey).toHaveBeenCalledWith('my-key', 'correct-passphrase');
        expect(admin.rpc.sendResponse).toHaveBeenCalledTimes(1);

        const result = getResponseResult(admin);
        expect(result.success).toBe(true);
    });

    it('should return success false with error when unlock fails', async () => {
        const admin = createMockAdmin({
            unlockKey: vi.fn().mockRejectedValue(new Error('Wrong passphrase')),
        });
        const req = createMockRequest(['my-key', 'wrong-passphrase']);

        await unlockKey(admin as any, req);

        expect(admin.rpc.sendResponse).toHaveBeenCalledTimes(1);

        const result = getResponseResult(admin);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Wrong passphrase');
    });
});
