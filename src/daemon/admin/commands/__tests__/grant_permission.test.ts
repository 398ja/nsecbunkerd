import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockAdmin, createMockRequest, getResponseResult, resetMocks, mockPrisma } from './test-utils';

// Mock the prisma module
vi.mock('../../../../db.js', () => ({
    default: mockPrisma,
}));

import grantPermission from '../grant_permission';

describe('grant_permission', () => {
    beforeEach(() => {
        resetMocks();
    });

    it('should throw error when keyName is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest([]);

        await expect(grantPermission(admin as any, req)).rejects.toThrow('Invalid params: keyName, userPubkey, and policyId required');
    });

    it('should throw error when userPubkey is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key']);

        await expect(grantPermission(admin as any, req)).rejects.toThrow('Invalid params: keyName, userPubkey, and policyId required');
    });

    it('should throw error when policyId is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key', 'pubkey123']);

        await expect(grantPermission(admin as any, req)).rejects.toThrow('Invalid params: keyName, userPubkey, and policyId required');
    });

    it('should throw error when policyId is not a number', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key', 'pubkey123', 'invalid']);

        await expect(grantPermission(admin as any, req)).rejects.toThrow('Invalid params: policyId must be a number');
    });

    it('should throw error when policy is not found', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key', 'pubkey123', '1']);

        mockPrisma.policy.findUnique.mockResolvedValue(null);

        await expect(grantPermission(admin as any, req)).rejects.toThrow("Policy with id '1' not found");
    });

    it('should throw error when policy is deleted', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key', 'pubkey123', '1']);

        mockPrisma.policy.findUnique.mockResolvedValue({
            id: 1,
            deletedAt: new Date('2024-01-01'),
            rules: [],
        });

        await expect(grantPermission(admin as any, req)).rejects.toThrow("Policy with id '1' has been deleted");
    });

    it('should grant permission successfully with hex pubkey', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key', 'abc123def456', '1', 'Test User']);

        mockPrisma.policy.findUnique.mockResolvedValue({
            id: 1,
            deletedAt: null,
            rules: [
                { method: 'sign_event', kind: '1' },
            ],
        });

        mockPrisma.keyUser.upsert.mockResolvedValue({
            id: 1,
            keyName: 'my-key',
            userPubkey: 'abc123def456',
            createdAt: new Date('2024-01-01'),
            description: 'Test User',
        });

        mockPrisma.signingCondition.deleteMany.mockResolvedValue({ count: 0 });
        mockPrisma.signingCondition.create.mockResolvedValue({});

        await grantPermission(admin as any, req);

        // Verify KeyUser was upserted
        expect(mockPrisma.keyUser.upsert).toHaveBeenCalledWith({
            where: {
                unique_key_user: {
                    keyName: 'my-key',
                    userPubkey: 'abc123def456',
                },
            },
            update: {
                revokedAt: null,
                description: 'Test User',
            },
            create: {
                keyName: 'my-key',
                userPubkey: 'abc123def456',
                description: 'Test User',
            },
        });

        // Verify old signing conditions were deleted
        expect(mockPrisma.signingCondition.deleteMany).toHaveBeenCalledWith({
            where: { keyUserId: 1 },
        });

        // Verify new signing conditions were created
        expect(mockPrisma.signingCondition.create).toHaveBeenCalledWith({
            data: {
                keyUserId: 1,
                method: 'sign_event',
                kind: '1',
                allowed: true,
            },
        });

        // Verify response
        expect(admin.rpc.sendResponse).toHaveBeenCalledTimes(1);
        const result = getResponseResult(admin);
        expect(result.id).toBe(1);
        expect(result.key_name).toBe('my-key');
        expect(result.description).toBe('Test User');
    });

    it('should convert npub to hex pubkey', async () => {
        const admin = createMockAdmin();
        // Use a properly encoded npub (this is a valid bech32 encoded pubkey)
        // npub for hex pubkey: 0000000000000000000000000000000000000000000000000000000000000001
        const req = createMockRequest(['my-key', 'npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqshp52w2', '1']);

        mockPrisma.policy.findUnique.mockResolvedValue({
            id: 1,
            deletedAt: null,
            rules: [],
        });

        mockPrisma.keyUser.upsert.mockResolvedValue({
            id: 1,
            keyName: 'my-key',
            userPubkey: '0000000000000000000000000000000000000000000000000000000000000001',
            createdAt: new Date('2024-01-01'),
            description: null,
        });

        mockPrisma.signingCondition.deleteMany.mockResolvedValue({ count: 0 });

        await grantPermission(admin as any, req);

        // Verify the pubkey was converted from npub (should be hex, not npub)
        expect(mockPrisma.keyUser.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    unique_key_user: {
                        keyName: 'my-key',
                        userPubkey: expect.not.stringMatching(/^npub1/),
                    },
                },
            })
        );
    });
});
