
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveWorkspace, loadWorkspace, clearWorkspaceCache } from './workspace';

// Fix hoisting issue
const { invokeMock } = vi.hoisted(() => {
  return { invokeMock: vi.fn() };
});

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => invokeMock(...args),
}));

describe('Workspace Performance Benchmark', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearWorkspaceCache();
    vi.useFakeTimers();
    // Default mock implementations
    invokeMock.mockImplementation((cmd, args) => {
      if (cmd === 'get_cwd') return Promise.resolve('/usr/home/user');
      if (cmd === 'read_json') {
          return Promise.resolve(JSON.stringify({
              activeDocId: null,
              notes: []
          }));
      }
      return Promise.resolve(null);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Optimized: multiple rapid saves result in SINGLE write', async () => {
    await loadWorkspace(); // Initialize cache
    invokeMock.mockClear(); // Clear initial read calls

    // Simulate rapid updates (e.g. resizing sidebar or typing)
    for (let i = 0; i < 10; i++) {
        // We await saveWorkspace, but it returns immediately after scheduling
        await saveWorkspace({ sidebar: { collapsed: false, width: 200 + i } });
    }

    // Should NOT have written yet
    let writeCalls = invokeMock.mock.calls.filter(call => call[0] === 'write_json');
    expect(writeCalls.length).toBe(0);

    // Fast forward time
    await vi.advanceTimersByTimeAsync(1500);

    // Check calls to write_json
    writeCalls = invokeMock.mock.calls.filter(call => call[0] === 'write_json');
    expect(writeCalls.length).toBe(1);
  });

  it('Optimized: identical saves do not trigger write', async () => {
      await loadWorkspace();
      invokeMock.mockClear();

      // Trigger a save
      await saveWorkspace({ activeDocId: 'doc1' });
      await vi.advanceTimersByTimeAsync(1500);
      expect(invokeMock).toHaveBeenCalledWith('write_json', expect.any(Object));
      invokeMock.mockClear();

      // Trigger identical save
      await saveWorkspace({ activeDocId: 'doc1' });
      await vi.advanceTimersByTimeAsync(1500);

      const writeCalls = invokeMock.mock.calls.filter(call => call[0] === 'write_json');
      expect(writeCalls.length).toBe(0);
  });
});
