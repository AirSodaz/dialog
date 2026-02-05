import { bench, describe, vi } from 'vitest';
import { render } from '@testing-library/react';
import { AudioCapsule } from '../AudioCapsule';

// Mock mocks for AudioCapsule dependencies
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
    convertFileSrc: vi.fn((path) => `asset://${path}`),
}));

vi.mock('../utils/workspace', () => ({
    getAssetPath: vi.fn((filename) => Promise.resolve(`/mock/assets/${filename}`)),
}));

// Mock props
const mockNode = {
    attrs: {
        src: '',
        filePath: '',
    },
};

const mockUpdateAttributes = vi.fn();

// Mock dependencies that might be heavy or browser-specific
// AudioContext or HTMLMediaElement are handled by jsdom but might be slow.
// We are primarily interested in the render loop overhead.

describe('AudioCapsule Render Performance', () => {

    // We want to simulate the "Recording" state rendering, as that's where the loop is.
    // However, getting into "Recording" state requires user interaction or state manipulation.
    // AudioCapsule doesn't export internal state.
    // But the issue is specifically about the render loop:
    /*
        {Array.from({ length: 32 }).map((_, i) => ( ... ))}
    */
    // This exists in the recording UI block.
    // We can simulate the conditions to reach that block.
    // The condition is: `!hasRecording` and `isRecording`?
    // Actually, `!hasRecording` renders the recording interface.
    // Inside that, if `isRecording` is true, it shows the wave animation.
    // We can trigger `isRecording` by clicking the button? No, `bench` shouldn't rely on interactions.

    // Wait, the component starts with `isRecording = false`.
    // If I cannot set internal state, I can't easily benchmark the specific "recording wave" part without interaction.
    // BUT, the optimization is also relevant for the non-recording state if the array creation happens there?
    // Let's check the code again.

    /*
    if (!hasRecording) {
        return (
            ...
            {isRecording ? (
                // THE EXPENSIVE LOOP
            ) : (
                // Placeholder waveform (also has a loop)
                // {Array.from({ length: 32 }).map((_, i) => ( ... ))}
            )}
            ...
        )
    }
    */

    // So both "Recording" (active) and "Ready to Record" (placeholder) have a loop.
    // The active recording loop has the `Date.now()` calculation which is the main culprit.
    // To measure that, I need to get `isRecording` to be true.

    // Since I can't easily inject state into a functional component from outside without changing code,
    // I might have to rely on the fact that *even the placeholder* loop has `Array.from` overhead,
    // although it doesn't have the `Date.now()` style calculation.

    // However, I can verify the improvement by checking if the style calculation is gone.
    // Benchmark might be tricky if I can't force `isRecording`.

    // ALTERNATIVE:
    // I can modify the component temporarily to accept an initial state prop for testing? No, I shouldn't modify source just for tests if possible.

    // I'll stick to benchmarking the render of the component in "Ready to Record" state.
    // Even though it's not the *active* animation, it still constructs 32 div elements every render.
    // The fix (moving array out) will benefit this too.
    // And if I fix the recording part, I'll likely fix the placeholder part too (same array).

    // Also, I can try to simulate a click in the benchmark setup?
    // `bench` functions can be async.

    bench('Render AudioCapsule (Default/Placeholder)', () => {
        const props: any = {
            node: mockNode,
            updateAttributes: mockUpdateAttributes,
            deleteNode: () => {},
            getPos: () => 0,
            editor: {},
            selected: false,
            extension: {},
            decorations: [],
            innerDecorations: [],
            view: {},
            HTMLAttributes: {}
        };

        render(
            <AudioCapsule {...props} />
        );
    });
});
