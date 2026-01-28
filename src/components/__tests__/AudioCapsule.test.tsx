// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AudioCapsule } from '../AudioCapsule';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock deps
vi.mock('../../utils/workspace', () => ({
    getAssetPath: vi.fn(),
}));
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
    convertFileSrc: vi.fn(),
}));

describe('AudioCapsule Accessibility', () => {
    const mockProps: any = {
        node: { attrs: { src: 'audio.mp3', filePath: 'audio.mp3' } },
        updateAttributes: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();

        Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
            writable: true,
            value: vi.fn(),
        });
        Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
            writable: true,
            value: vi.fn(),
        });
    });

    afterEach(() => {
        cleanup();
    });

    it('renders waveform with slider role', () => {
        render(<AudioCapsule {...mockProps} />);

        const slider = screen.getByRole('slider');
        expect(slider).not.toBeNull();
        expect(slider.getAttribute('aria-label')).toBe('Seek audio');
        expect(slider.getAttribute('tabindex')).toBe('0');
        expect(slider.getAttribute('aria-valuemin')).toBe('0');
    });

    it('shows mic error with alert role', async () => {
        const recordingProps: any = {
            node: { attrs: { src: '', filePath: '' } },
            updateAttributes: vi.fn(),
        };

        const originalMediaDevices = navigator.mediaDevices;
        Object.defineProperty(navigator, 'mediaDevices', {
            value: {
                getUserMedia: vi.fn().mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError')),
            },
            writable: true,
            configurable: true
        });

        render(<AudioCapsule {...recordingProps} />);

        const recordBtn = screen.getByLabelText('Start recording');
        fireEvent.click(recordBtn);

        const alert = await screen.findByRole('alert');
        expect(alert).not.toBeNull();
        expect(alert.textContent).toContain('麦克风权限');

        if (originalMediaDevices) {
            Object.defineProperty(navigator, 'mediaDevices', { value: originalMediaDevices });
        } else {
             delete (navigator as any).mediaDevices;
        }
    });

    it('handles keyboard navigation on waveform', () => {
        render(<AudioCapsule {...mockProps} />);
        const slider = screen.getByRole('slider');

        fireEvent.keyDown(slider, { key: 'ArrowRight' });
        expect(slider).not.toBeNull();
    });
});
