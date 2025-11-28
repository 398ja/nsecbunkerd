import { vi } from 'vitest';
import type { NDKRpcRequest } from '@nostr-dev-kit/ndk';
import type AdminInterface from '../../index.js';

// Mock Prisma client
export const mockPrisma = {
    key: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
    },
    keyUser: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
        count: vi.fn(),
    },
    policy: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    policyRule: {
        create: vi.fn(),
    },
    token: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
    },
    signingCondition: {
        create: vi.fn(),
        deleteMany: vi.fn(),
    },
};

// Reset all mocks
export function resetMocks() {
    vi.clearAllMocks();
}

// Create a mock NDKRpcRequest
export function createMockRequest(params: string[] = []): NDKRpcRequest {
    return {
        id: 'test-request-id',
        pubkey: 'test-pubkey-hex',
        method: 'test-method',
        params,
        event: {
            kind: 24133, // NIP-46 NostrConnect kind
        },
    } as NDKRpcRequest;
}

// Create a mock AdminInterface
export function createMockAdmin(overrides: Partial<MockAdminInterface> = {}): MockAdminInterface {
    const sendResponseMock = vi.fn();

    return {
        configFile: '/tmp/test-config.json',
        rpc: {
            sendResponse: sendResponseMock,
        },
        getKeys: vi.fn().mockResolvedValue([]),
        getKeyUsers: vi.fn().mockResolvedValue([]),
        unlockKey: vi.fn().mockResolvedValue(true),
        loadNsec: vi.fn(),
        config: vi.fn().mockResolvedValue({}),
        ...overrides,
    } as MockAdminInterface;
}

export interface MockAdminInterface {
    configFile: string;
    rpc: {
        sendResponse: ReturnType<typeof vi.fn>;
    };
    getKeys?: ReturnType<typeof vi.fn>;
    getKeyUsers?: ReturnType<typeof vi.fn>;
    unlockKey?: ReturnType<typeof vi.fn>;
    loadNsec?: ReturnType<typeof vi.fn>;
    config?: ReturnType<typeof vi.fn>;
}

// Helper to extract the result from sendResponse mock call
export function getResponseResult(admin: MockAdminInterface): any {
    const calls = admin.rpc.sendResponse.mock.calls;
    if (calls.length === 0) return null;
    const lastCall = calls[calls.length - 1];
    return JSON.parse(lastCall[2]); // result is the 3rd argument
}

// Helper to check if response was an error
export function getResponseError(admin: MockAdminInterface): string | null {
    const calls = admin.rpc.sendResponse.mock.calls;
    if (calls.length === 0) return null;
    const lastCall = calls[calls.length - 1];
    return lastCall[4] || null; // error is the 5th argument
}
