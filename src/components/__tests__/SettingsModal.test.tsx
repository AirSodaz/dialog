// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import SettingsModal from '../SettingsModal';
import { useAppStore } from '../../store/appStore';
import * as configUtils from '../../utils/config';

// Mock dependencies
vi.mock('../../store/appStore', () => ({
    useAppStore: vi.fn(),
}));

vi.mock('../../utils/config', () => ({
    getConfigValue: vi.fn(),
    setConfigValue: vi.fn(),
    getStorageDir: vi.fn().mockResolvedValue('/mock/path'),
    DialogConfig: {},
}));

// Mock useShallow to just return the selector result
vi.mock('zustand/react/shallow', () => ({
    useShallow: (selector: any) => selector,
}));

describe('SettingsModal', () => {
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        // Default store mock
        (useAppStore as any).mockImplementation((selector: any) => {
            return selector({
                settingsOpen: true,
                closeSettings: vi.fn(),
            });
        });

        // Default config mock
        (configUtils.getConfigValue as any).mockImplementation((key: string) => {
            if (key === 'theme') return Promise.resolve('light');
            if (key === 'ai') return Promise.resolve(undefined);
            return Promise.resolve(undefined);
        });

        (configUtils.setConfigValue as any).mockResolvedValue(undefined);
    });

    it('renders when open', async () => {
        render(<SettingsModal />);
        expect(screen.getByText('Settings')).toBeDefined();
        expect(screen.getByText('General Settings')).toBeDefined();
    });

    it('toggles theme from light to dark', async () => {
        // Setup initial state: light mode
        document.documentElement.classList.remove('dark');
        (configUtils.getConfigValue as any).mockResolvedValue('light');

        render(<SettingsModal />);

        // Wait for useEffect to load settings
        await waitFor(() => {
            expect(configUtils.getConfigValue).toHaveBeenCalledWith('theme');
        });

        // Find the toggle button
        const toggles = screen.getAllByTestId('theme-toggle');
        const toggleBtn = toggles[0];
        expect(toggleBtn).toBeDefined();
        expect(toggleBtn.textContent).toContain('Light');

        // Click it
        fireEvent.click(toggleBtn);

        // Expect setConfigValue to be called with 'dark'
        await waitFor(() => {
            expect(configUtils.setConfigValue).toHaveBeenCalledWith('theme', 'dark');
        });

        // Expect html class to have 'dark'
        expect(document.documentElement.classList.contains('dark')).toBe(true);

        // Expect button text to change to 'Dark'
        expect(screen.getByTestId('theme-toggle').textContent).toContain('Dark');
    });

    it('toggles theme from dark to light', async () => {
        // Setup initial state: dark mode
        document.documentElement.classList.add('dark');
        (configUtils.getConfigValue as any).mockResolvedValue('dark');

        render(<SettingsModal />);

        // Wait for useEffect to load settings
        await waitFor(() => {
            expect(configUtils.getConfigValue).toHaveBeenCalledWith('theme');
        });

        // Find the toggle button
        const toggleBtn = screen.getByTestId('theme-toggle');
        expect(toggleBtn).toBeDefined();
        expect(toggleBtn.textContent).toContain('Dark');

        // Click it
        fireEvent.click(toggleBtn);

        // Expect setConfigValue to be called with 'light'
        await waitFor(() => {
            expect(configUtils.setConfigValue).toHaveBeenCalledWith('theme', 'light');
        });

        // Expect html class to NOT have 'dark'
        expect(document.documentElement.classList.contains('dark')).toBe(false);

        // Expect button text to change to 'Light'
        expect(screen.getByTestId('theme-toggle').textContent).toContain('Light');
    });

    it('optimistically updates theme even if persistence fails', async () => {
        // Setup initial state: light mode
        document.documentElement.classList.remove('dark');
        (configUtils.getConfigValue as any).mockResolvedValue('light');
        (configUtils.setConfigValue as any).mockRejectedValue(new Error('Persistence failed'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<SettingsModal />);

        await waitFor(() => {
            expect(configUtils.getConfigValue).toHaveBeenCalledWith('theme');
        });

        // Click toggle
        const toggles = screen.getAllByTestId('theme-toggle');
        const toggleBtn = toggles[0];
        fireEvent.click(toggleBtn);

        // UI should update immediately
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(toggleBtn.textContent).toContain('Dark');

        // Verify setConfigValue was called (and failed)
        await waitFor(() => {
            expect(configUtils.setConfigValue).toHaveBeenCalledWith('theme', 'dark');
        });

        consoleSpy.mockRestore();
    });

    it('has accessible form inputs in AI tab', async () => {
        render(<SettingsModal />);

        // Switch to AI tab
        const aiTab = screen.getByRole('button', { name: /AI Services/i });
        expect(aiTab).toBeDefined();
        fireEvent.click(aiTab);

        // Verify inputs are accessible by label
        await waitFor(() => {
            expect(screen.getByLabelText('AI Provider')).toBeDefined();
            expect(screen.getByLabelText('Base URL')).toBeDefined();
            expect(screen.getByLabelText('API Key')).toBeDefined();
            expect(screen.getByLabelText('Model Name')).toBeDefined();
        });

        // Verify they are associated with the correct inputs
        expect(screen.getByLabelText('AI Provider').tagName).toBe('SELECT');
        expect(screen.getByLabelText('Base URL').tagName).toBe('INPUT');
        expect(screen.getByLabelText('API Key').tagName).toBe('INPUT');
        expect(screen.getByLabelText('Model Name').tagName).toBe('INPUT');
    });
});
