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

    it('uses the covering index', async () => {
        const keysMock = vi.fn().mockResolvedValue([]);
        const reverseMock = vi.fn().mockReturnValue({ keys: keysMock });
        const betweenMock = vi.fn().mockReturnValue({ reverse: reverseMock });
        const whereMock = vi.fn().mockReturnValue({ between: betweenMock });

        // Mock db.documents.where
        const whereSpy = vi.spyOn(db.documents, 'where').mockImplementation(whereMock as any);

        await getTrash();

        expect(whereSpy).toHaveBeenCalledWith('[isDeleted+deletedAt+title+id+updatedAt+isFavorite]');
        expect(betweenMock).toHaveBeenCalledWith(
            [true, Dexie.minKey, Dexie.minKey, Dexie.minKey, Dexie.minKey, Dexie.minKey],
            [true, Dexie.maxKey, Dexie.maxKey, Dexie.maxKey, Dexie.maxKey, Dexie.maxKey]
        );
        expect(reverseMock).toHaveBeenCalled();
        expect(keysMock).toHaveBeenCalled();
    });
});
