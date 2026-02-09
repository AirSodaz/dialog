// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import DocumentList from '../DocumentList';
import { useAppStore } from '../../store/appStore';

// Mock dependencies
vi.mock('../../store/appStore', () => ({
    useAppStore: vi.fn(),
}));

// Mock useShallow to just return the selector result
vi.mock('zustand/react/shallow', () => ({
    useShallow: (selector: any) => selector,
}));

describe('DocumentList', () => {
    afterEach(() => {
        cleanup();
    });

    const mockNotes = [
        { id: '1', title: 'Note 1', updatedAt: 1000 },
        { id: '2', title: 'Note 2', updatedAt: 2000 },
        { id: '3', title: 'Note 3', updatedAt: 3000 },
    ];

    const mockTrash = [
        { id: '4', title: 'Trash 1', deletedAt: 4000 },
    ];

    const mockStore = {
        notes: mockNotes,
        favorites: ['2'], // Note 2 is favorite
        trash: mockTrash,
        currentDocId: '1',
        openDocument: vi.fn(),
        toggleFavoriteNote: vi.fn(),
        moveNoteToTrash: vi.fn(),
        restoreNoteFromTrash: vi.fn(),
        deleteNotePermanently: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Default store mock implementation
        (useAppStore as any).mockImplementation((selector: any) => {
            return selector(mockStore);
        });
    });

    it('renders all notes in "all-notes" view', () => {
        render(<DocumentList viewType="all-notes" />);

        expect(screen.getByText('All Notes')).toBeDefined();
        expect(screen.getByText('Note 1')).toBeDefined();
        expect(screen.getByText('Note 2')).toBeDefined();
        expect(screen.getByText('Note 3')).toBeDefined();
        expect(screen.queryByText('Trash 1')).toBeNull();
    });

    it('renders only favorites in "favorites" view', () => {
        render(<DocumentList viewType="favorites" />);

        expect(screen.getByText('Favorites')).toBeDefined();
        expect(screen.queryByText('Note 1')).toBeNull();
        expect(screen.getByText('Note 2')).toBeDefined();
        expect(screen.queryByText('Note 3')).toBeNull();
    });

    it('renders trash in "trash" view', () => {
        render(<DocumentList viewType="trash" />);

        expect(screen.getByText('Trash')).toBeDefined();
        expect(screen.queryByText('Note 1')).toBeNull();
        expect(screen.queryByText('Note 2')).toBeNull();
        expect(screen.getByText('Trash 1')).toBeDefined();
    });

    it('calls openDocument when clicking a note', () => {
        render(<DocumentList viewType="all-notes" />);

        const note1Button = screen.getByRole('button', { name: 'Open Note 1' });
        fireEvent.click(note1Button);

        expect(mockStore.openDocument).toHaveBeenCalledWith('1');
    });
});
