// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { db, getTrash } from './db';
import Dexie from 'dexie';

// Mock dependencies
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

vi.mock('../utils/workspace', () => ({
    getContentPath: vi.fn(),
    addNoteToWorkspace: vi.fn(),
    updateNoteInWorkspace: vi.fn(),
    removeNoteFromWorkspace: vi.fn(),
    toggleFavoriteInWorkspace: vi.fn(),
    addTrashToWorkspace: vi.fn(),
    restoreFromTrashInWorkspace: vi.fn(),
    permanentlyDeleteFromWorkspace: vi.fn(),
}));

describe('getTrash optimization', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('uses the [isDeleted+deletedAt] index', async () => {
        const toArrayMock = vi.fn().mockResolvedValue([]);
        const reverseMock = vi.fn().mockReturnValue({ toArray: toArrayMock });
        const betweenMock = vi.fn().mockReturnValue({ reverse: reverseMock });
        const whereMock = vi.fn().mockReturnValue({ between: betweenMock });

        // Mock db.documents.where
        const whereSpy = vi.spyOn(db.documents, 'where').mockImplementation(whereMock as any);

        // Mock db.documents.filter (current implementation)
        const filterMock = vi.fn().mockReturnValue({
             reverse: vi.fn().mockReturnValue({
                 sortBy: vi.fn().mockResolvedValue([])
             })
        });
        const filterSpy = vi.spyOn(db.documents, 'filter').mockImplementation(filterMock as any);

        await getTrash();

        // Expectation: The new implementation should use `where`, not `filter`
        if (whereSpy.mock.calls.length > 0) {
            expect(whereSpy).toHaveBeenCalledWith('[isDeleted+deletedAt]');
            expect(betweenMock).toHaveBeenCalledWith(
                [true, Dexie.minKey],
                [true, Dexie.maxKey]
            );
            expect(reverseMock).toHaveBeenCalled();
            expect(toArrayMock).toHaveBeenCalled();
            expect(filterSpy).not.toHaveBeenCalled();
        } else {
            // If it's still using filter (current state), this test should fail appropriately
            // But for TDD, we want it to fail "expecting where to be called"
            expect(whereSpy).toHaveBeenCalledWith('[isDeleted+deletedAt]');
        }
    });
});
