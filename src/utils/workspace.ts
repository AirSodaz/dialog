import { invoke } from '@tauri-apps/api/core';

/**
 * Workspace configuration interface.
 * Stores current UI state, similar to Obsidian's workspace.json.
 */
export interface WorkspaceConfig {
    /** Currently active document ID. */
    activeDocId: string | null;

    /** Sidebar state configuration. */
    sidebar: {
        collapsed: boolean;
        width: number;
    };

    /** List of recently opened document IDs for quick access. */
    recentDocs: string[];

    /** Metadata for all notes in the workspace. */
    notes: {
        id: string;
        title: string;
        updatedAt: number;
    }[];

    /** List of favorited document IDs. */
    favorites: string[];

    /** Metadata for trashed documents. */
    trash: {
        id: string;
        title: string;
        deletedAt: number;
    }[];

    /** Optional window state for restoring position and size. */
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
let lastSavedWorkspaceStr: string | null = null;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

// Cache for path resolution to avoid redundant IPC calls
let cachedCwd: string | null = null;
let cachedSeparator: string = '/';
let cachedWorkspacePath: string | null = null;
let cachedContentDir: string | null = null;
let cachedStorageDir: string | null = null;
let cachedConfigPath: string | null = null;
let cachedAssetsDir: string | null = null;

/**
 * Ensures path configuration is initialized.
 * Detects the current working directory and sets up cached paths.
 *
 * @returns {Promise<void>} A promise that resolves when paths are configured.
 */
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

    cachedStorageDir = `${base}${cachedSeparator}.dialog`;
    cachedWorkspacePath = `${cachedStorageDir}${cachedSeparator}workspace.json`;
    cachedContentDir = `${cachedStorageDir}${cachedSeparator}content`;
    cachedConfigPath = `${cachedStorageDir}${cachedSeparator}.dialog.json`;
    cachedAssetsDir = `${cachedStorageDir}${cachedSeparator}assets`;
}


/**
 * Gets the path to the workspace file.
 *
 * @returns {Promise<string>} The absolute path to workspace.json.
 */
export async function getWorkspacePath(): Promise<string> {
    if (!cachedWorkspacePath) {
        await ensurePathConfig();
    }
    return cachedWorkspacePath!;
}

/**
 * Gets the path to a content file for a given document.
 *
 * @param docId The ID of the document.
 * @returns {Promise<string>} The absolute path to the document's JSON file.
 */
export async function getContentPath(docId: string): Promise<string> {
    if (!cachedContentDir) {
        await ensurePathConfig();
    }
    return `${cachedContentDir}${cachedSeparator}${docId}.json`;
}

/**
 * Gets the storage directory path (.dialog folder).
 *
 * @returns {Promise<string>} The absolute path to the storage directory.
 */
export async function getStorageDirPath(): Promise<string> {
    if (!cachedStorageDir) {
        await ensurePathConfig();
    }
    return cachedStorageDir!;
}

/**
 * Gets the path to the app configuration file (.dialog.json).
 *
 * @returns {Promise<string>} The absolute path to the app config file.
 */
export async function getAppConfigPath(): Promise<string> {
    if (!cachedConfigPath) {
        await ensurePathConfig();
    }
    return cachedConfigPath!;
}

/**
 * Gets the path to the assets directory.
 *
 * @returns {Promise<string>} The absolute path to the assets directory.
 */
export async function getAssetsDirPath(): Promise<string> {
    if (!cachedAssetsDir) {
        await ensurePathConfig();
    }
    return cachedAssetsDir!;
}

/**
 * Gets the full path for a specific asset file.
 *
 * @param filename The name of the asset file.
 * @returns {Promise<string>} The absolute path to the asset file.
 */
export async function getAssetPath(filename: string): Promise<string> {
    if (!cachedAssetsDir) {
        await ensurePathConfig();
    }
    return `${cachedAssetsDir}${cachedSeparator}${filename}`;
}

/**
 * Loads the workspace configuration.
 * Returns cached configuration if available, otherwise reads from disk.
 *
 * @returns {Promise<WorkspaceConfig>} The loaded workspace configuration.
 */
export async function loadWorkspace(): Promise<WorkspaceConfig> {
    if (workspaceCache) {
        return workspaceCache;
    }

    try {
        const workspacePath = await getWorkspacePath();
        const content = await invoke<string>('read_json', { path: workspacePath });
        lastSavedWorkspaceStr = content;
        const parsed = JSON.parse(content);
        workspaceCache = { ...DEFAULT_WORKSPACE, ...parsed };
        return workspaceCache!;
    } catch {
        // Workspace file doesn't exist yet, return defaults
        console.log('[Workspace] Workspace not found, using defaults...');
        workspaceCache = { ...DEFAULT_WORKSPACE };
        lastSavedWorkspaceStr = JSON.stringify(workspaceCache, null, 2);
        return workspaceCache;
    }
}

/**
 * Saves the workspace configuration.
 * Updates the cache and writes to disk.
 *
 * @param workspace Partial configuration to update.
 * @returns {Promise<void>} A promise that resolves when save is complete.
 */
export async function saveWorkspace(workspace: Partial<WorkspaceConfig>): Promise<void> {
    const currentWorkspace = workspaceCache || await loadWorkspace();
    const newWorkspace = { ...currentWorkspace, ...workspace };
    workspaceCache = newWorkspace;

    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }

    saveTimeout = setTimeout(async () => {
        const workspacePath = await getWorkspacePath();
        const content = JSON.stringify(workspaceCache, null, 2);

        if (content !== lastSavedWorkspaceStr) {
            try {
                await invoke('write_json', {
                    path: workspacePath,
                    content
                });
                lastSavedWorkspaceStr = content;
            } catch (error) {
                console.error('[Workspace] Failed to save workspace:', error);
            }
        }
        saveTimeout = null;
    }, 1000);
}

/**
 * Updates a specific workspace value by key.
 *
 * @param key The configuration key to update.
 * @param value The new value for the key.
 * @returns {Promise<void>} A promise that resolves when update is complete.
 */
export async function updateWorkspace<K extends keyof WorkspaceConfig>(
    key: K,
    value: WorkspaceConfig[K]
): Promise<void> {
    await saveWorkspace({ [key]: value });
}

/**
 * Adds a document to the recent documents list.
 * Maintains a maximum size of 10 recent documents.
 *
 * @param docId The ID of the document to add.
 * @returns {Promise<void>} A promise that resolves when the list is updated.
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
 * Sets the active document ID.
 * Also adds the document to the recent documents list.
 *
 * @param docId The ID of the document to activate, or null to clear.
 * @returns {Promise<void>} A promise that resolves when the state is updated.
 */
export async function setActiveDoc(docId: string | null): Promise<void> {
    await saveWorkspace({ activeDocId: docId });
    if (docId) {
        await addRecentDoc(docId);
    }
}

/**
 * Updates the sidebar state.
 *
 * @param sidebar Partial sidebar configuration to update.
 * @returns {Promise<void>} A promise that resolves when the state is updated.
 */
export async function updateSidebarState(sidebar: Partial<WorkspaceConfig['sidebar']>): Promise<void> {
    const workspace = await loadWorkspace();
    await saveWorkspace({
        sidebar: { ...workspace.sidebar, ...sidebar }
    });
}

/**
 * Clears the workspace cache.
 * Useful for testing or resetting state.
 */
export function clearWorkspaceCache(): void {
    workspaceCache = null;
    lastSavedWorkspaceStr = null;
    if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
    }
    // Clear path caches as well
    cachedCwd = null;
    cachedWorkspacePath = null;
    cachedContentDir = null;
}

// --- Note Management Helpers ---

/**
 * Adds or updates a note in the workspace metadata.
 *
 * @param note The note metadata object.
 * @param note.id The ID of the note.
 * @param note.title The title of the note.
 * @param note.updatedAt The timestamp of the last update.
 * @returns {Promise<void>} A promise that resolves when the workspace is updated.
 */
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

/**
 * Updates an existing note's metadata in the workspace.
 *
 * @param id The ID of the note to update.
 * @param updates Partial metadata to apply.
 * @returns {Promise<void>} A promise that resolves when the workspace is updated.
 */
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

/**
 * Removes a note from the workspace metadata.
 *
 * @param id The ID of the note to remove.
 * @returns {Promise<void>} A promise that resolves when the workspace is updated.
 */
export async function removeNoteFromWorkspace(id: string): Promise<void> {
    const workspace = await loadWorkspace();
    const newNotes = workspace.notes.filter(n => n.id !== id);
    await saveWorkspace({ notes: newNotes });
}

// --- Favorite Management Helpers ---

/**
 * Toggles the favorite status of a document in the workspace.
 *
 * @param id The ID of the document to toggle.
 * @returns {Promise<void>} A promise that resolves when the workspace is updated.
 */
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

/**
 * Moves a note to the trash metadata in the workspace.
 * Removes the note from the main notes list and favorites list.
 *
 * @param note The trash item metadata.
 * @param note.id The ID of the note.
 * @param note.title The title of the note.
 * @param note.deletedAt The timestamp when the note was deleted.
 * @returns {Promise<void>} A promise that resolves when the workspace is updated.
 */
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

/**
 * Restores a note from the trash metadata in the workspace.
 *
 * @param id The ID of the note to restore.
 * @returns {Promise<void>} A promise that resolves when the workspace is updated.
 */
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

/**
 * Permanently removes a note from the trash metadata in the workspace.
 *
 * @param id The ID of the note to delete.
 * @returns {Promise<void>} A promise that resolves when the workspace is updated.
 */
export async function permanentlyDeleteFromWorkspace(id: string): Promise<void> {
    const workspace = await loadWorkspace();
    const newTrash = workspace.trash.filter(t => t.id !== id);
    await saveWorkspace({ trash: newTrash });
}
