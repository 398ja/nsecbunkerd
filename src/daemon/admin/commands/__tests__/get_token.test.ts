import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockAdmin, createMockRequest, getResponseResult, resetMocks, mockPrisma } from './test-utils';

// Mock the prisma module
vi.mock('../../../../db.js', () => ({
    default: mockPrisma,
}));

import getToken from '../get_token';

describe('get_token', () => {
    beforeEach(() => {
        resetMocks();
    });

    it('should throw error when tokenId is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest([]);

        await expect(getToken(admin as any, req)).rejects.toThrow('Invalid params: tokenId required');
    });

    it('should throw error when tokenId is not a number', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['invalid']);

        await expect(getToken(admin as any, req)).rejects.toThrow('Invalid params: tokenId must be a number');
    });

    it('should throw error when token is not found', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['1']);

        mockPrisma.token.findUnique.mockResolvedValue(null);

        await expect(getToken(admin as any, req)).rejects.toThrow("Token with id '1' not found");
    });

    it('should return token details with npub prefix', async () => {
        const admin = createMockAdmin({
            getKeys: vi.fn().mockResolvedValue([
                { name: 'my-key', npub: 'npub1xyz123' },
            ]),
        });
        const req = createMockRequest(['1']);

        mockPrisma.token.findUnique.mockResolvedValue({
            id: 1,
            keyName: 'my-key',
            token: 'abc123token',
            clientName: 'Test App',
            createdBy: 'admin-pubkey',
            policyId: 1,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
            expiresAt: new Date('2024-12-31'),
            deletedAt: null,
            redeemedAt: null,
            policy: { name: 'signing-policy' },
            KeyUser: null,
        });

        await getToken(admin as any, req);

        expect(admin.rpc.sendResponse).toHaveBeenCalledTimes(1);
        const result = getResponseResult(admin);
        expect(result.id).toBe(1);
        expect(result.key_name).toBe('my-key');
        expect(result.token).toBe('npub1xyz123#abc123token');
        expect(result.client_name).toBe('Test App');
        expect(result.policy_name).toBe('signing-policy');
    });

    it('should return token without npub prefix if key not found', async () => {
        const admin = createMockAdmin({
            getKeys: vi.fn().mockResolvedValue([]),
        });
        const req = createMockRequest(['1']);

        mockPrisma.token.findUnique.mockResolvedValue({
            id: 1,
            keyName: 'unknown-key',
            token: 'abc123token',
            clientName: 'Test App',
            createdBy: 'admin-pubkey',
            policyId: null,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
            expiresAt: null,
            deletedAt: null,
            redeemedAt: null,
            policy: null,
            KeyUser: null,
        });

        await getToken(admin as any, req);

        const result = getResponseResult(admin);
        expect(result.token).toBe('abc123token');
    });

    it('should include redeemed_by when token is redeemed', async () => {
        const admin = createMockAdmin({
            getKeys: vi.fn().mockResolvedValue([
                { name: 'my-key', npub: 'npub1xyz123' },
            ]),
        });
        const req = createMockRequest(['1']);

        mockPrisma.token.findUnique.mockResolvedValue({
            id: 1,
            keyName: 'my-key',
            token: 'abc123token',
            clientName: 'Test App',
            createdBy: 'admin-pubkey',
            policyId: 1,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
            expiresAt: null,
            deletedAt: null,
            redeemedAt: new Date('2024-01-05'),
            policy: { name: 'signing-policy' },
            KeyUser: { description: 'Redeemed by Test Client' },
        });

        await getToken(admin as any, req);

        const result = getResponseResult(admin);
        expect(result.redeemed_at).toBeDefined();
        expect(result.redeemed_by).toBe('Redeemed by Test Client');
    });
});
