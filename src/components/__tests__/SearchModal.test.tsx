// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import SearchModal from '../SearchModal';
import { useAppStore } from '../../store/appStore';

// Mock dependencies
vi.mock('../../store/appStore', () => ({
    useAppStore: vi.fn(),
}));

// Mock useShallow
vi.mock('zustand/react/shallow', () => ({
    useShallow: (selector: any) => selector,
}));

describe('SearchModal', () => {
    afterEach(() => {
        cleanup();
    });

    const mockDocs = [
        { id: 'doc1', title: 'Note 1', updatedAt: 1000 },
        { id: 'doc2', title: 'Note 2', updatedAt: 2000 },
        { id: 'doc3', title: 'Note 3', updatedAt: 3000 },
    ];

    const mockStore = {
        searchOpen: true,
        closeSearch: vi.fn(),
        openDocument: vi.fn(),
        toggleSearch: vi.fn(),
        notes: mockDocs,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useAppStore as any).mockImplementation((selector: any) => {
            return selector(mockStore);
        });
    });

    it('renders when searchOpen is true', async () => {
        render(<SearchModal />);
        await waitFor(() => expect(screen.getByPlaceholderText('Search notes...')).toBeDefined());
    });

    it('does not render when searchOpen is false', () => {
        (useAppStore as any).mockImplementation((selector: any) => {
            return selector({ ...mockStore, searchOpen: false });
        });
        render(<SearchModal />);
        expect(screen.queryByPlaceholderText('Search notes...')).toBeNull();
    });

    it('navigates results with keyboard', async () => {
        render(<SearchModal />);

        // Wait for results to load
        await waitFor(() => expect(screen.getByText('Note 1')).toBeDefined());

        const input = screen.getByPlaceholderText('Search notes...');
        fireEvent.keyDown(input, { key: 'ArrowDown' });

        // We can't easily check internal state, but we can check visual classes if we knew them.
        // Or we can check if the accessibility attributes update (which is what we want to implement).
        // For now, let's assume the component adds a specific class 'bg-surface-hover' to selected item.

        const items = screen.getAllByText(/Note \d/);
        // Note 1 is initially selected (index 0)
        // After ArrowDown, Note 2 (index 1) should be selected.

        // Let's verify initial state first
        expect(items[0].parentElement?.className).toContain('bg-surface-hover');

        // After KeyDown
        // Wait for re-render
        await waitFor(() => {
             expect(items[1].parentElement?.className).toContain('bg-surface-hover');
        });
    });

    it('has correct accessibility attributes', async () => {
        render(<SearchModal />);
        await waitFor(() => expect(screen.getByPlaceholderText('Search notes...')).toBeDefined());

        const input = screen.getByPlaceholderText('Search notes...');
        const list = screen.getByRole('listbox');
        expect(list).toBeDefined();

        expect(input.getAttribute('role')).toBe('combobox');
        expect(input.getAttribute('aria-autocomplete')).toBe('list');
        expect(input.getAttribute('aria-controls')).toBe('search-results');
        expect(input.getAttribute('aria-expanded')).toBe('true');

        // Check active descendant
        const activeId = input.getAttribute('aria-activedescendant');
        expect(activeId).toBeTruthy();

        const selectedOption = document.getElementById(activeId!);
        expect(selectedOption?.getAttribute('aria-selected')).toBe('true');
        expect(selectedOption?.textContent).toContain('Note 1');
    });
});
