import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContentPath, loadWorkspace, clearWorkspaceCache } from './workspace';

// Mock the tauri invoke function
const invokeMock = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => invokeMock(...args),
}));

describe('Workspace Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearWorkspaceCache();
    // Default mock implementations
    invokeMock.mockImplementation((cmd, args) => {
      if (cmd === 'get_cwd') return Promise.resolve('/usr/home/user');
      if (cmd === 'join_path') {
        return Promise.resolve(args.parts.join('/'));
      }
      if (cmd === 'read_json') {
          return Promise.resolve(JSON.stringify({ activeDocId: null }));
      }
      return Promise.resolve(null);
    });
  });

  it('getContentPath should use cached paths (Optimized)', async () => {
    await getContentPath('doc1');
    // Optimized implementation: get_cwd (1 call), join_path is done in JS
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith('get_cwd');
    // join_path should NOT be called
    expect(invokeMock).not.toHaveBeenCalledWith('join_path', expect.any(Object));
  });

  it('Sequential getContentPath calls should NOT repeat IPC calls (Optimized)', async () => {
      await getContentPath('doc1');
      await getContentPath('doc2');
      // 1 call for get_cwd, 0 for second call
      expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  it('loadWorkspace should reduce IPC calls', async () => {
      await loadWorkspace();
      // get_cwd + read_json = 2 calls (was 3 calls: get_cwd + join_path + read_json)
      expect(invokeMock).toHaveBeenCalledWith('get_cwd');
      expect(invokeMock).toHaveBeenCalledWith('read_json', expect.any(Object));
      expect(invokeMock).not.toHaveBeenCalledWith('join_path', expect.any(Object));
  });
});
