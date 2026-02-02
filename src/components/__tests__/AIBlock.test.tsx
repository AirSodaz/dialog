// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { AIBlock } from '../AIBlock';
import * as configUtils from '../../utils/config';

// Mock dependencies
vi.mock('../../utils/config', () => ({
    getConfigValue: vi.fn(),
}));

describe('AIBlock', () => {
    const mockNode = {
        attrs: {
            autoTrigger: false,
            initialPrompt: '',
        },
    };
    const mockDeleteNode = vi.fn();
    const mockEditor = {
        commands: {
            insertContent: vi.fn(),
        },
    };

    // Backup fetch
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        cleanup();
        globalThis.fetch = originalFetch;
    });

    beforeEach(() => {
        vi.clearAllMocks();
        (configUtils.getConfigValue as any).mockResolvedValue({});
        // Default success mock
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'Generated content' } }]
            })
        });
    });

    it('renders with accessibility attributes', () => {
        render(
            <AIBlock
                node={mockNode as any}
                updateAttributes={() => {}}
                deleteNode={mockDeleteNode}
                editor={mockEditor as any}
                getPos={() => 0}
                selected={false}
                extension={{} as any}
                decorations={[]}
                view={{} as any}
                innerDecorations={[] as any}
                HTMLAttributes={{}}
            />
        );

        // Check input accessibility
        const input = screen.getByLabelText('AI prompt');
        expect(input).toBeDefined();
        expect(input.getAttribute('placeholder')).toBe('Ask AI to write something...');

        // Type something to enable button
        fireEvent.change(input, { target: { value: 'Hello' } });

        const button = screen.getByLabelText('Submit prompt');
        expect(button).toBeDefined();
        expect(button.getAttribute('title')).toBe('Submit prompt');
    });

    it('shows correct status label', () => {
        render(
            <AIBlock
                node={mockNode as any}
                updateAttributes={() => {}}
                deleteNode={mockDeleteNode}
                editor={mockEditor as any}
                getPos={() => 0}
                selected={false}
                extension={{} as any}
                decorations={[]}
                view={{} as any}
                innerDecorations={[] as any}
                HTMLAttributes={{}}
            />
        );

        const status = screen.getByRole('status');
        expect(status).toBeDefined();
        expect(status.getAttribute('aria-label')).toBe('AI Assistant');
    });

    it('displays error message when API fails', async () => {
        // Provide mock config with API key to bypass the check
        (configUtils.getConfigValue as any).mockResolvedValue({
            apiKey: 'test-key',
            provider: 'openai'
        });

        // Mock fetch failure
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        render(
            <AIBlock
                node={mockNode as any}
                updateAttributes={() => {}}
                deleteNode={mockDeleteNode}
                editor={mockEditor as any}
                getPos={() => 0}
                selected={false}
                extension={{} as any}
                decorations={[]}
                view={{} as any}
                innerDecorations={[] as any}
                HTMLAttributes={{}}
            />
        );

        const input = screen.getByLabelText('AI prompt');
        fireEvent.change(input, { target: { value: 'Test prompt' } });

        const form = input.closest('form');
        fireEvent.submit(form!);

        await waitFor(() => {
            const alert = screen.getByRole('alert');
            expect(alert).toBeDefined();
            expect(alert.textContent).toContain('Network error');
        });
    });
});
