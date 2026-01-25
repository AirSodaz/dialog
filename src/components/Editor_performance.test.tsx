// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import Editor from './Editor';
import { useAppStore } from '../store/appStore';
import { clearWorkspaceCache } from '../utils/workspace';

// Mock Tauri invoke
const invokeMock = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => invokeMock(...args),
}));

// Mock DB
vi.mock('../db/db', () => ({
  saveDocument: vi.fn().mockResolvedValue(undefined),
  loadDocument: vi.fn().mockResolvedValue({ content: {}, title: 'Test' }),
  createDocument: vi.fn().mockResolvedValue('new-doc-id'),
  getAllDocuments: vi.fn().mockResolvedValue([]),
}));

// Mock TipTap
let capturedEditorConfig: any = null;
vi.mock('@tiptap/react', async (importOriginal) => {
    const actual: any = await importOriginal();
    return {
        ...actual,
        useEditor: (config: any) => {
            capturedEditorConfig = config;
            return {
                getJSON: () => ({ content: [{ type: 'heading', content: [{ text: 'Test Title' }] }] }),
                commands: { setContent: vi.fn() },
                chain: () => ({
                    focus: () => ({
                        toggleBold: () => ({ run: () => {} }),
                        toggleItalic: () => ({ run: () => {} }),
                        setTextSelection: () => ({ insertContent: () => ({ run: () => {} }) }),
                    })
                }),
                isActive: () => false,
                state: {
                    selection: { empty: true },
                    doc: { textBetween: () => '' }
                },
                isDestroyed: false,
            };
        },
        EditorContent: () => null,
    };
});

vi.mock('@tiptap/react/menus', () => ({
    BubbleMenu: () => null,
}));

// Mock other components that might render
vi.mock('./DragHandle', () => ({ DragHandle: () => null }));
vi.mock('./SyncStatus', () => ({ SyncStatus: () => null }));

describe('Editor Performance', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearWorkspaceCache(); // Clear cache to ensure consistent behavior
        vi.useFakeTimers();
        useAppStore.setState({ currentDocId: 'test-doc-id' });

        // Reset invoke mock implementation
        invokeMock.mockImplementation((cmd, args) => {
            if (cmd === 'get_cwd') return Promise.resolve('/usr/home/user');
            if (cmd === 'join_path') return Promise.resolve(args.parts.join('/'));
            if (cmd === 'write_json') return Promise.resolve();
            if (cmd === 'read_json') return Promise.resolve('{}');
            return Promise.resolve(null);
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should use optimized paths during save', async () => {
        // Render Editor
        render(<Editor />);

        // Verify useEditor was called
        expect(capturedEditorConfig).toBeTruthy();

        // Wait for initial load to settle (isLoadingRef to become false)
        // Advance timers to handle any effects
        await vi.advanceTimersByTimeAsync(100);

        // Clear mocks after initial load to focus on save behavior
        // Note: initial load might have populated the cache in workspace.ts if it called getContentPath
        // But since we mocked loadDocument to return content, Editor logic:
        // if (doc?.content) ... else { try load from file ... }
        // So it likely didn't call getContentPath during load.
        invokeMock.mockClear();

        // Trigger onUpdate
        // We simulate a change
        capturedEditorConfig.onUpdate({ editor: { getJSON: () => ({ content: [{ type: 'paragraph', content: [{ type: 'text', text: 'New content' }] }] }) } });

        // Fast forward time to trigger debounce (2000ms)
        await vi.advanceTimersByTimeAsync(2500);

        // Check invoke calls
        // Logic in Editor.tsx (Optimized):
        // const filePath = await getContentPath(currentDocId); // calls get_cwd ONCE if not cached, 0 join_path
        // await invoke('write_json', ...);

        const getCwdCalls = invokeMock.mock.calls.filter(call => call[0] === 'get_cwd');
        const joinPathCalls = invokeMock.mock.calls.filter(call => call[0] === 'join_path');

        console.log('get_cwd calls:', getCwdCalls.length);
        console.log('join_path calls:', joinPathCalls.length);

        // Expectation for OPTIMIZED code:
        // get_cwd: 1 (called by ensurePathConfig inside getContentPath)
        // join_path: 0 (handled by string concatenation in JS)
        expect(getCwdCalls.length).toBe(1);
        expect(joinPathCalls.length).toBe(0);
    });
});
