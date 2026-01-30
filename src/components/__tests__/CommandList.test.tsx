import { render, screen } from '@testing-library/react';
import { CommandList } from '../CommandList';
import { vi, describe, it, expect } from 'vitest';

// @vitest-environment jsdom

describe('CommandList Accessibility', () => {
    const mockItems = [
        { title: 'Heading 1', icon: () => null },
        { title: 'Heading 2', icon: () => null },
        { title: 'Bullet List', icon: () => null },
    ];
    const mockCommand = vi.fn();

    it('renders with correct accessibility roles', () => {
        render(<CommandList items={mockItems} command={mockCommand} />);

        const listbox = screen.getByRole('listbox');
        expect(listbox).toBeDefined();
        expect(listbox.getAttribute('aria-label')).toBe('Editor commands');
        expect(listbox.id).toBe('slash-command-list');

        const options = screen.getAllByRole('option');
        expect(options).toHaveLength(mockItems.length);

        // First item should be selected by default
        expect(options[0].getAttribute('aria-selected')).toBe('true');
        expect(options[1].getAttribute('aria-selected')).toBe('false');

        // ID check for active descendant logic
        expect(options[0].id).toBe('slash-command-item-0');
    });
});
