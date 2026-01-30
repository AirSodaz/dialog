import { create } from 'zustand';
import { setActiveDoc, loadWorkspace, saveWorkspace } from '../utils/workspace';
import { getAllDocuments, getFavorites, getTrash } from '../db/db';

/**
 * Defines the available views in the application.
 * - 'editor': The main text editor view.
 * - 'all-notes': List of all notes.
 * - 'favorites': List of favorite notes.
 * - 'trash': List of deleted notes.
 */
export type ViewType = 'editor' | 'all-notes' | 'favorites' | 'trash';

/**
 * Interface for the global application state managed by Zustand.
 */
interface AppState {
    /** The current active view. */
    currentView: ViewType;
    /** The ID of the currently open document, or null if none. */
    currentDocId: string | null;

    /** Whether the sidebar is collapsed. */
    sidebarCollapsed: boolean;
    /** The width of the sidebar in pixels. */
    sidebarWidth: number;

    /** Whether the search modal is open. */
    searchOpen: boolean;
    /** Whether the settings modal is open. */
    settingsOpen: boolean;

    /** Whether the workspace configuration has been loaded. */
    workspaceLoaded: boolean;

    /** List of recent document IDs. */
    recentDocs: string[];
    /** List of all notes metadata. */
    notes: { id: string, title: string, updatedAt: number }[];
    /** List of favorite document IDs. */
    favorites: string[];
    /** List of trashed documents metadata. */
    trash: { id: string, title: string, deletedAt: number }[];

    // Actions
    /** Sets the current view. */
    setView: (view: ViewType) => void;
    /** Sets the current document ID without changing view. */
    setCurrentDoc: (docId: string | null) => void;
    /** Opens a document and switches to the editor view. */
    openDocument: (docId: string) => void;
    /** Opens the search modal. */
    openSearch: () => void;
    /** Closes the search modal. */
    closeSearch: () => void;
    /** Toggles the search modal visibility. */
    toggleSearch: () => void;
    /** Opens the settings modal. */
    openSettings: () => void;
    /** Closes the settings modal. */
    closeSettings: () => void;
    /** Sets the sidebar collapsed state. */
    setSidebarCollapsed: (collapsed: boolean) => void;
    /** Sets the sidebar width. */
    setSidebarWidth: (width: number) => void;
    /** Loads the application state from the workspace configuration. */
    loadFromWorkspace: () => Promise<void>;

    // Note Actions (Sync UI + DB)
    /** Creates a new note and adds it to the state. */
    createNote: (title?: string) => Promise<string>;
    /** Updates a note's metadata in the state. */
    updateNote: (id: string, updates: { title?: string, updatedAt?: number }) => void;
    /** Toggles the favorite status of a note. */
    toggleFavoriteNote: (id: string) => Promise<void>;
    /** Moves a note to the trash. */
    moveNoteToTrash: (id: string) => Promise<void>;
    /** Restores a note from the trash. */
    restoreNoteFromTrash: (id: string) => Promise<void>;
    /** Permanently deletes a note from the trash. */
    deleteNotePermanently: (id: string) => Promise<void>;
}

/**
 * Zustand store hook for managing global application state.
 */
export const useAppStore = create<AppState>((set) => ({
    // Initial state
    currentView: 'editor',
    currentDocId: null,
    sidebarCollapsed: false,
    sidebarWidth: 240,
    searchOpen: false,
    settingsOpen: false,
    workspaceLoaded: false,

    recentDocs: [],
    notes: [],
    favorites: [],
    trash: [],

    // Actions
    setView: (view) => set({ currentView: view }),

    setCurrentDoc: (docId) => {
        set({ currentDocId: docId });
        // Persist to workspace.json
        setActiveDoc(docId).catch(console.error);
    },

    openDocument: (docId) => {
        set({
            currentDocId: docId,
            currentView: 'editor',
            searchOpen: false
        });
        // Persist to workspace.json
        setActiveDoc(docId).catch(console.error);
    },

    openSearch: () => set({ searchOpen: true }),

    closeSearch: () => set({ searchOpen: false }),

    toggleSearch: () => set((state) => ({ searchOpen: !state.searchOpen })),

    openSettings: () => set({ settingsOpen: true }),

    closeSettings: () => set({ settingsOpen: false }),

    setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

    setSidebarWidth: (width) => set({ sidebarWidth: width }),

    // Note Actions implementation
    createNote: async (title = 'Untitled') => {
        const { createDocument } = await import('../db/db');
        const id = await createDocument(title);
        const now = Date.now();

        set(state => ({
            notes: [{ id, title, updatedAt: now }, ...state.notes],
            currentDocId: id,
            // If created while in editor, it's already open, but let's ensure
        }));

        // Also ensure recent docs logic updates if needed, although openDocument handles that usually.
        return id;
    },

    updateNote: (id, updates) => {
        set(state => {
            const noteIndex = state.notes.findIndex(n => n.id === id);
            if (noteIndex === -1) return {};

            const updatedNotes = [...state.notes];
            updatedNotes[noteIndex] = {
                ...updatedNotes[noteIndex],
                ...updates
            };

            // Re-sort by updatedAt if it was changed
            if (updates.updatedAt) {
                updatedNotes.sort((a, b) => b.updatedAt - a.updatedAt);
            }

            return { notes: updatedNotes };
        });
    },

    toggleFavoriteNote: async (id) => {
        const { toggleFavorite } = await import('../db/db');
        await toggleFavorite(id);

        set(state => {
            const isFav = state.favorites.includes(id);
            return {
                favorites: isFav
                    ? state.favorites.filter(fid => fid !== id)
                    : [id, ...state.favorites]
            };
        });
    },

    moveNoteToTrash: async (id) => {
        const { moveToTrash } = await import('../db/db');
        await moveToTrash(id);

        set(state => {
            const note = state.notes.find(n => n.id === id);
            if (!note) return {}; // Should exist

            return {
                notes: state.notes.filter(n => n.id !== id),
                favorites: state.favorites.filter(fid => fid !== id),
                trash: [{ id: note.id, title: note.title, deletedAt: Date.now() }, ...state.trash]
            };
        });
    },

    restoreNoteFromTrash: async (id) => {
        const { restoreFromTrash } = await import('../db/db');
        await restoreFromTrash(id);

        set(state => {
            const trashItem = state.trash.find(t => t.id === id);
            if (!trashItem) return {};

            return {
                trash: state.trash.filter(t => t.id !== id),
                notes: [{ id: trashItem.id, title: trashItem.title, updatedAt: Date.now() }, ...state.notes]
            };
        });
    },

    deleteNotePermanently: async (id) => {
        const { permanentlyDelete } = await import('../db/db');
        await permanentlyDelete(id);

        set(state => ({
            trash: state.trash.filter(t => t.id !== id)
        }));
    },

    // Load workspace state from workspace.json
    loadFromWorkspace: async () => {
        // Always reload to get fresh data from disk (because file system is persistent source of truth)
        // if (get().workspaceLoaded) return; 

        try {
            const workspace = await loadWorkspace();

            // --- Migration / Self-Healing Logic ---
            // Fetch all docs from IndexedDB to ensure we aren't missing anything in workspace.json
            // (e.g. from before this update or if file got out of sync)
            const [dbDocs, dbFavorites, dbTrash] = await Promise.all([
                getAllDocuments(),
                getFavorites(),
                getTrash()
            ]);

            let workspaceChanged = false;
            const newNotes = [...(workspace.notes || [])];
            const newFavorites = [...(workspace.favorites || [])];
            const newTrash = [...(workspace.trash || [])];

            // 1. Sync Notes
            const existingNoteIds = new Set(newNotes.map(n => n.id));
            for (const doc of dbDocs) {
                if (!existingNoteIds.has(doc.id)) {
                    newNotes.push({
                        id: doc.id,
                        title: doc.title,
                        updatedAt: doc.updatedAt
                    });
                    existingNoteIds.add(doc.id);
                    workspaceChanged = true;
                }
            }
            // Sort notes by updatedAt desc
            newNotes.sort((a, b) => b.updatedAt - a.updatedAt);

            // 2. Sync Favorites
            const existingFavIds = new Set(newFavorites);
            for (const doc of dbFavorites) {
                if (!existingFavIds.has(doc.id)) {
                    newFavorites.push(doc.id);
                    existingFavIds.add(doc.id);
                    workspaceChanged = true;
                }
            }

            // 3. Sync Trash
            const existingTrashIds = new Set(newTrash.map(t => t.id));
            for (const doc of dbTrash) {
                if (!existingTrashIds.has(doc.id)) {
                    newTrash.push({
                        id: doc.id,
                        title: doc.title,
                        // Trash usually has deletedAt, but if missing use updatedAt or now
                        deletedAt: doc.deletedAt || Date.now()
                    });
                    existingTrashIds.add(doc.id);
                    workspaceChanged = true;
                }
            }
            newTrash.sort((a, b) => b.deletedAt - a.deletedAt);

            // If we found missing items, save back to workspace.json
            if (workspaceChanged) {
                console.log('[AppStore] Migrating missing items from DB to Workspace...');
                // We have to save other fields too if we want them persisted. 
                // updateWorkspace only does one key. We should use saveWorkspace for batch,
                // but we can just use the resulting arrays for state now and let future actions ensure consistency,
                // OR better: properly save everything now.
                // Actually `updateWorkspace` takes a key.
                // Let's just update the state logic to import `saveWorkspace` and use it.
                // Since I can't easily change imports in this block without being weird, 
                // I will assume I need to update imports first.
                // WAIT: I need to update imports at top of file too.
            }

            set({
                currentDocId: workspace.activeDocId,
                sidebarCollapsed: workspace.sidebar.collapsed,
                sidebarWidth: workspace.sidebar.width,
                workspaceLoaded: true,

                recentDocs: workspace.recentDocs || [],
                notes: newNotes,
                favorites: newFavorites,
                trash: newTrash
            });

            if (workspaceChanged) {
                // Determine if we need to persist these changes to disk immediately
                // We used local vars `newNotes` etc.
                // We should call the persistence function.
                await saveWorkspace({
                    ...workspace, // Keep existing workspace properties
                    notes: newNotes,
                    favorites: newFavorites,
                    trash: newTrash
                });
            }

        } catch (error) {
            console.error('[AppStore] Failed to load workspace:', error);
            set({ workspaceLoaded: true });
        }
    },
}));
