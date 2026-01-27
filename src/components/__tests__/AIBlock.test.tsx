// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
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

    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        (configUtils.getConfigValue as any).mockResolvedValue({});
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
            />
        );

        const status = screen.getByRole('status');
        expect(status).toBeDefined();
        expect(status.getAttribute('aria-label')).toBe('AI Assistant');
    });
});
