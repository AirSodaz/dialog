// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SyncStatus } from '../SyncStatus';

describe('SyncStatus Accessibility', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders "Saving..." with status role and polite aria-live', () => {
        render(<SyncStatus status="saving" />);

        const statusEl = screen.getByText('Saving...');
        expect(statusEl.getAttribute('role')).toBe('status');
        expect(statusEl.getAttribute('aria-live')).toBe('polite');
        expect(statusEl.className).toContain('opacity-100');
    });

    it('renders "Unsaved" with status role', () => {
        render(<SyncStatus status="unsaved" />);

        const statusEl = screen.getByText('Unsaved');
        expect(statusEl.getAttribute('role')).toBe('status');
        expect(statusEl.className).toContain('opacity-100');
    });

    it('renders "Saved" but invisible when synced', () => {
        render(<SyncStatus status="synced" />);

        const statusEl = screen.getByText('Saved');
        expect(statusEl.getAttribute('role')).toBe('status');
        expect(statusEl.className).toContain('opacity-0');
    });
});
