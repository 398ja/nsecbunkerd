import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockAdmin, createMockRequest, resetMocks } from './test-utils';

import ping from '../ping';

describe('ping', () => {
    beforeEach(() => {
        resetMocks();
    });

    it('should respond with ok', async () => {
        const admin = createMockAdmin();
        const req = createMockRequest([]);

        await ping(admin as any, req);

        expect(admin.rpc.sendResponse).toHaveBeenCalledTimes(1);
        expect(admin.rpc.sendResponse).toHaveBeenCalledWith(
            req.id,
            req.pubkey,
            'ok',
            expect.anything()
        );
    });
});
