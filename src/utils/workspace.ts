import { invoke } from '@tauri-apps/api/core';

/**
 * Workspace configuration - stores current UI state
 * Similar to Obsidian's workspace.json
 */
export interface WorkspaceConfig {
    // Currently active document
    activeDocId: string | null;

    // Sidebar state
    sidebar: {
        collapsed: boolean;
        width: number;
    };

    // Recently opened documents (for quick access)
    recentDocs: string[];

    // All notes metadata
    notes: {
        id: string;
        title: string;
        updatedAt: number;
    }[];

    // Favorited document IDs
    favorites: string[];

    // Trashed documents metadata
    trash: {
        id: string;
        title: string;
        deletedAt: number;
    }[];

    // Window state (optional, for restoring window position/size)
    window?: {
        width: number;
        height: number;
        x?: number;
        y?: number;
        maximized: boolean;
    };
}

const DEFAULT_WORKSPACE: WorkspaceConfig = {
    activeDocId: null,
    sidebar: {
        collapsed: false,
        width: 240,
    },
    recentDocs: [],
    notes: [],
    favorites: [],
    trash: [],
};

let workspaceCache: WorkspaceConfig | null = null;

// Cache for path resolution to avoid redundant IPC calls
let cachedCwd: string | null = null;
let cachedSeparator: string = '/';
let cachedWorkspacePath: string | null = null;
let cachedContentDir: string | null = null;

async function ensurePathConfig(): Promise<void> {
    if (cachedCwd) return;

    cachedCwd = await invoke<string>('get_cwd');

    // Heuristic: detect separator from cwd
    // If we see backslashes, we assume Windows. Otherwise Unix-like.
    // This is a safe assumption for almost all environments Tauri runs in.
    if (cachedCwd.includes('\\')) {
        cachedSeparator = '\\';
    } else {
        cachedSeparator = '/';
    }

    // Pre-calculate paths
    // Handle potential trailing slash in cwd (though unlikely for get_cwd)
    const base = cachedCwd.endsWith(cachedSeparator) ? cachedCwd.slice(0, -1) : cachedCwd;

    cachedWorkspacePath = `${base}${cachedSeparator}.dialog${cachedSeparator}workspace.json`;
    cachedContentDir = `${base}${cachedSeparator}.dialog${cachedSeparator}content`;
}


/**
 * Get the path to the workspace file
 */
export async function getWorkspacePath(): Promise<string> {
    if (!cachedWorkspacePath) {
        await ensurePathConfig();
    }
    return cachedWorkspacePath!;
}

/**
 * Get the path to a content file
 */
export async function getContentPath(docId: string): Promise<string> {
    if (!cachedContentDir) {
        await ensurePathConfig();
    }
    return `${cachedContentDir}${cachedSeparator}${docId}.json`;
}

/**
 * Load workspace configuration
 */
export async function loadWorkspace(): Promise<WorkspaceConfig> {
    if (workspaceCache) {
        return workspaceCache;
    }

    try {
        const workspacePath = await getWorkspacePath();
        const content = await invoke<string>('read_json', { path: workspacePath });
        const parsed = JSON.parse(content);
        workspaceCache = { ...DEFAULT_WORKSPACE, ...parsed };
        return workspaceCache!;
    } catch {
        // Workspace file doesn't exist yet, return defaults
        console.log('[Workspace] Workspace not found, using defaults...');
        workspaceCache = { ...DEFAULT_WORKSPACE };
        return workspaceCache;
    }
}

/**
 * Save workspace configuration
 */
export async function saveWorkspace(workspace: Partial<WorkspaceConfig>): Promise<void> {
    const currentWorkspace = workspaceCache || await loadWorkspace();
    const newWorkspace = { ...currentWorkspace, ...workspace };
    workspaceCache = newWorkspace;

    const workspacePath = await getWorkspacePath();
    await invoke('write_json', {
        path: workspacePath,
        content: JSON.stringify(newWorkspace, null, 2)
    });
}

/**
 * Update a specific workspace value
 */
export async function updateWorkspace<K extends keyof WorkspaceConfig>(
    key: K,
    value: WorkspaceConfig[K]
): Promise<void> {
    await saveWorkspace({ [key]: value });
}

/**
 * Add a document to recent docs list
 */
export async function addRecentDoc(docId: string): Promise<void> {
    const workspace = await loadWorkspace();
    const recentDocs = workspace.recentDocs.filter(id => id !== docId);
    recentDocs.unshift(docId); // Add to beginning

    // Keep only last 10 recent docs
    if (recentDocs.length > 10) {
        recentDocs.pop();
    }

    await saveWorkspace({ recentDocs });
}

/**
 * Set the active document
 */
export async function setActiveDoc(docId: string | null): Promise<void> {
    await saveWorkspace({ activeDocId: docId });
    if (docId) {
        await addRecentDoc(docId);
    }
}

/**
 * Update sidebar state
 */
export async function updateSidebarState(sidebar: Partial<WorkspaceConfig['sidebar']>): Promise<void> {
    const workspace = await loadWorkspace();
    await saveWorkspace({
        sidebar: { ...workspace.sidebar, ...sidebar }
    });
}

/**
 * Clear workspace cache (useful for testing or resetting)
 */
export function clearWorkspaceCache(): void {
    workspaceCache = null;
    // Clear path caches as well
    cachedCwd = null;
    cachedWorkspacePath = null;
    cachedContentDir = null;
}

// --- Note Management Helpers ---

export async function addNoteToWorkspace(note: { id: string, title: string, updatedAt: number }): Promise<void> {
    const workspace = await loadWorkspace();
    // Check if exists, update if so
    const existingIndex = workspace.notes.findIndex(n => n.id === note.id);
    let newNotes = [...workspace.notes];

    if (existingIndex >= 0) {
        newNotes[existingIndex] = note;
    } else {
        newNotes.push(note);
    }

    // Sort by updatedAt desc
    newNotes.sort((a, b) => b.updatedAt - a.updatedAt);

    await saveWorkspace({ notes: newNotes });
}

export async function updateNoteInWorkspace(id: string, updates: Partial<{ title: string, updatedAt: number }>): Promise<void> {
    const workspace = await loadWorkspace();
    const existingIndex = workspace.notes.findIndex(n => n.id === id);

    if (existingIndex >= 0) {
        const newNotes = [...workspace.notes];
        newNotes[existingIndex] = { ...newNotes[existingIndex], ...updates };
        // Sort by updatedAt desc
        newNotes.sort((a, b) => b.updatedAt - a.updatedAt);
        await saveWorkspace({ notes: newNotes });
    }
}

export async function removeNoteFromWorkspace(id: string): Promise<void> {
    const workspace = await loadWorkspace();
    const newNotes = workspace.notes.filter(n => n.id !== id);
    await saveWorkspace({ notes: newNotes });
}

// --- Favorite Management Helpers ---

export async function toggleFavoriteInWorkspace(id: string): Promise<void> {
    const workspace = await loadWorkspace();
    const isFavorite = workspace.favorites.includes(id);
    let newFavorites;

    if (isFavorite) {
        newFavorites = workspace.favorites.filter(favId => favId !== id);
    } else {
        newFavorites = [id, ...workspace.favorites];
    }

    await saveWorkspace({ favorites: newFavorites });
}

// --- Trash Management Helpers ---

export async function addTrashToWorkspace(note: { id: string, title: string, deletedAt: number }): Promise<void> {
    const workspace = await loadWorkspace();

    // Remove from notes/favorites if present (safety check)
    const newNotes = workspace.notes.filter(n => n.id !== note.id);
    const newFavorites = workspace.favorites.filter(id => id !== note.id);

    // Add to trash
    const newTrash = [note, ...workspace.trash];
    // Sort by deletedAt desc
    newTrash.sort((a, b) => b.deletedAt - a.deletedAt);

    await saveWorkspace({
        notes: newNotes,
        favorites: newFavorites,
        trash: newTrash
    });
}

export async function restoreFromTrashInWorkspace(id: string): Promise<void> {
    const workspace = await loadWorkspace();
    const trashItem = workspace.trash.find(t => t.id === id);

    if (!trashItem) return; // Not in trash

    const newTrash = workspace.trash.filter(t => t.id !== id);

    // Add back to notes with current time as update time roughly? 
    // Or prefer keeping original timestamp if we had it?
    // For simplicity, we just add it back. The db.ts should handle the 'addNote' call separately or we do it here.
    // To keep responsibilities clean, db.ts should call 'addNoteToWorkspace' after this.
    // BUT 'addTrashToWorkspace' removed it from notes. So we MUST add it back to notes here or ensure caller does.
    // Let's assume caller (db.ts) will call 'addNoteToWorkspace' immediately after.
    // So here we strictly just remove from trash.

    await saveWorkspace({ trash: newTrash });
}

export async function permanentlyDeleteFromWorkspace(id: string): Promise<void> {
    const workspace = await loadWorkspace();
    const newTrash = workspace.trash.filter(t => t.id !== id);
    await saveWorkspace({ trash: newTrash });
}
