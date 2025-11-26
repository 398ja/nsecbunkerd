import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockAdmin, createMockRequest, getResponseResult, resetMocks, mockPrisma } from './test-utils';

// Mock the prisma module
vi.mock('../../../../db.js', () => ({
    default: mockPrisma,
}));

import createNewToken from '../create_new_token';

describe('create_new_token', () => {
    beforeEach(() => {
        resetMocks();
    });

    it('should throw error when clientName is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key']);

        await expect(createNewToken(admin as any, req)).rejects.toThrow('Invalid params');
    });

    it('should throw error when policyId is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key', 'Test App']);

        await expect(createNewToken(admin as any, req)).rejects.toThrow('Invalid params');
    });

    it('should throw error when policy is not found', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key', 'Test App', '999']);

        mockPrisma.policy.findUnique.mockResolvedValue(null);

        await expect(createNewToken(admin as any, req)).rejects.toThrow('Policy not found');
    });

    it('should create token without expiration', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key', 'Test App', '1']);

        mockPrisma.policy.findUnique.mockResolvedValue({
            id: 1,
            name: 'test-policy',
            rules: [],
        });

        mockPrisma.token.create.mockResolvedValue({
            id: 1,
            token: 'generated-token',
        });

        await createNewToken(admin as any, req);

        expect(mockPrisma.token.create).toHaveBeenCalledWith({
            data: {
                keyName: 'my-key',
                clientName: 'Test App',
                policyId: '1',
                createdBy: 'test-pubkey-hex',
                token: expect.any(String),
            },
        });

        expect(admin.rpc.sendResponse).toHaveBeenCalledTimes(1);
        const result = getResponseResult(admin);
        expect(result).toEqual(['ok']);
    });

    it('should create token with expiration', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key', 'Test App', '1', '24']); // 24 hours

        mockPrisma.policy.findUnique.mockResolvedValue({
            id: 1,
            name: 'test-policy',
            rules: [],
        });

        mockPrisma.token.create.mockResolvedValue({
            id: 1,
            token: 'generated-token',
        });

        await createNewToken(admin as any, req);

        expect(mockPrisma.token.create).toHaveBeenCalledWith({
            data: {
                keyName: 'my-key',
                clientName: 'Test App',
                policyId: '1',
                createdBy: 'test-pubkey-hex',
                token: expect.any(String),
                expiresAt: expect.any(Date),
            },
        });

        // Verify expiration is approximately 24 hours from now
        const createCall = mockPrisma.token.create.mock.calls[0][0];
        const expiresAt = createCall.data.expiresAt as Date;
        const expectedExpiry = Date.now() + (24 * 60 * 60 * 1000);
        expect(expiresAt.getTime()).toBeCloseTo(expectedExpiry, -4); // Within 10 seconds
    });

    it('should generate 64-character hex token', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['my-key', 'Test App', '1']);

        mockPrisma.policy.findUnique.mockResolvedValue({
            id: 1,
            name: 'test-policy',
            rules: [],
        });

        mockPrisma.token.create.mockResolvedValue({
            id: 1,
            token: 'generated-token',
        });

        await createNewToken(admin as any, req);

        const createCall = mockPrisma.token.create.mock.calls[0][0];
        const token = createCall.data.token as string;
        expect(token).toHaveLength(64);
        expect(token).toMatch(/^[0-9a-f]+$/);
    });
});
