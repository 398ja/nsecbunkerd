import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockAdmin, createMockRequest, getResponseResult, resetMocks, mockPrisma } from './test-utils';

// Mock the prisma module
vi.mock('../../../../db.js', () => ({
    default: mockPrisma,
}));

import validateToken from '../validate_token';

describe('validate_token', () => {
    beforeEach(() => {
        resetMocks();
    });

    it('should throw error when token is not provided', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest([]);

        await expect(validateToken(admin as any, req)).rejects.toThrow('Invalid params: token required');
    });

    it('should return invalid when token is not found', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['nonexistent-token']);

        mockPrisma.token.findUnique.mockResolvedValue(null);

        await validateToken(admin as any, req);

        const result = getResponseResult(admin);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Token not found');
    });

    it('should return invalid when token is revoked', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['revoked-token']);

        mockPrisma.token.findUnique.mockResolvedValue({
            token: 'revoked-token',
            deletedAt: new Date('2024-01-01'),
            expiresAt: null,
        });

        await validateToken(admin as any, req);

        const result = getResponseResult(admin);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Token has been revoked');
    });

    it('should return invalid when token is expired', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['expired-token']);

        mockPrisma.token.findUnique.mockResolvedValue({
            token: 'expired-token',
            deletedAt: null,
            expiresAt: new Date('2020-01-01'), // Past date
        });

        await validateToken(admin as any, req);

        const result = getResponseResult(admin);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Token has expired');
    });

    it('should return valid for active token', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['valid-token']);

        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        mockPrisma.token.findUnique.mockResolvedValue({
            token: 'valid-token',
            keyName: 'my-key',
            clientName: 'Test App',
            deletedAt: null,
            expiresAt: futureDate,
            redeemedAt: null,
        });

        await validateToken(admin as any, req);

        const result = getResponseResult(admin);
        expect(result.valid).toBe(true);
        expect(result.key_name).toBe('my-key');
        expect(result.client_name).toBe('Test App');
        expect(result.redeemed).toBe(false);
    });

    it('should return valid for token without expiration', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['valid-token']);

        mockPrisma.token.findUnique.mockResolvedValue({
            token: 'valid-token',
            keyName: 'my-key',
            clientName: 'Test App',
            deletedAt: null,
            expiresAt: null, // No expiration
            redeemedAt: new Date('2024-01-05'),
        });

        await validateToken(admin as any, req);

        const result = getResponseResult(admin);
        expect(result.valid).toBe(true);
        expect(result.redeemed).toBe(true);
    });

    it('should parse token with npub# prefix', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest(['npub1xyz123#actual-token-value']);

        mockPrisma.token.findUnique.mockResolvedValue({
            token: 'actual-token-value',
            keyName: 'my-key',
            clientName: 'Test App',
            deletedAt: null,
            expiresAt: null,
            redeemedAt: null,
        });

        await validateToken(admin as any, req);

        // Verify the token lookup used the parsed value
        expect(mockPrisma.token.findUnique).toHaveBeenCalledWith({
            where: { token: 'actual-token-value' },
        });

        const result = getResponseResult(admin);
        expect(result.valid).toBe(true);
    });
});
