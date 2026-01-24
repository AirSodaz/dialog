import Dexie, { type Table } from 'dexie';
import { invoke } from '@tauri-apps/api/core';
import {
    getContentPath,
    addNoteToWorkspace,
    updateNoteInWorkspace,
    removeNoteFromWorkspace,
    toggleFavoriteInWorkspace,
    addTrashToWorkspace,
    restoreFromTrashInWorkspace,
    permanentlyDeleteFromWorkspace
} from '../utils/workspace';

export interface Document {
    id: string;
    title: string;
    content: any; // JSON content from Tiptap
    updatedAt: number;
    isFavorite?: boolean;
    isDeleted?: boolean;
    deletedAt?: number;
}

class DialogDB extends Dexie {
    documents!: Table<Document>;

    constructor() {
        super('DialogDB');
        this.version(3).stores({
            documents: 'id, updatedAt, isFavorite, isDeleted' // Primary key and indices
        });
    }
}

export const db = new DialogDB();

// Helper to sync to disk
const saveToDisk = async (doc: Document) => {
    try {
        const path = await getContentPath(doc.id);
        await invoke('write_json', {
            path,
            content: JSON.stringify(doc, null, 2)
        });
    } catch (error) {
        console.error('[DB] Failed to sync to disk:', error);
    }
};

// Create a new document
export const createDocument = async (title: string = 'Untitled'): Promise<string> => {
    const id = crypto.randomUUID();
    const now = Date.now();
    const newDoc = {
        id,
        title,
        content: null,
        updatedAt: now,
        isFavorite: false,
        isDeleted: false,
    };

    await db.documents.put(newDoc);

    // Create actual file on disk
    await saveToDisk(newDoc);

    // Sync to workspace
    await addNoteToWorkspace({ id, title, updatedAt: now });

    return id;
};

export const saveDocument = async (id: string, content: any, title?: string, options?: { isDeleted?: boolean }) => {
    const existing = await db.documents.get(id);
    const now = Date.now();
    const finalTitle = title ?? existing?.title ?? 'Untitled';

    await db.documents.put({
        id,
        title: finalTitle,
        content,
        updatedAt: now,
        isFavorite: existing?.isFavorite ?? false,
        isDeleted: options?.isDeleted ?? existing?.isDeleted ?? false,
        deletedAt: options?.isDeleted ? (existing?.deletedAt || now) : (options?.isDeleted === false ? undefined : existing?.deletedAt),
    });

    // Sync to workspace if it's a content/title update (and not deleted)
    if (!options?.isDeleted && !existing?.isDeleted) {
        await updateNoteInWorkspace(id, { title: finalTitle, updatedAt: now });
    }
};

export const loadDocument = async (id: string) => {
    return await db.documents.get(id);
};

// Get all active (non-deleted) documents
export const getAllDocuments = async () => {
    return await db.documents
        .filter(doc => !doc.isDeleted)
        .reverse()
        .sortBy('updatedAt');
};

// Get favorite documents
export const getFavorites = async () => {
    return await db.documents
        .filter(doc => doc.isFavorite === true && !doc.isDeleted)
        .reverse()
        .sortBy('updatedAt');
};

// Get trashed documents
export const getTrash = async () => {
    return await db.documents
        .filter(doc => doc.isDeleted === true)
        .reverse()
        .sortBy('deletedAt');
};

// Toggle favorite status
export const toggleFavorite = async (id: string) => {
    const doc = await db.documents.get(id);
    if (doc) {
        await db.documents.update(id, { isFavorite: !doc.isFavorite });
        // Sync to workspace
        await toggleFavoriteInWorkspace(id);
    }
};

// Move to trash (soft delete)
export const moveToTrash = async (id: string) => {
    const now = Date.now();
    await db.documents.update(id, {
        isDeleted: true,
        deletedAt: now
    });
    const doc = await db.documents.get(id);
    if (doc) {
        await saveToDisk(doc);
        // Sync to workspace
        await addTrashToWorkspace({
            id: doc.id,
            title: doc.title,
            deletedAt: now
        });
    }
};

// Restore from trash
export const restoreFromTrash = async (id: string) => {
    await db.documents.update(id, {
        isDeleted: false,
        deletedAt: undefined
    });
    const doc = await db.documents.get(id);
    if (doc) {
        // Update updated time to move to top? Or keep original?
        // Let's touch it so it goes to top of notes
        const now = Date.now();
        await db.documents.update(id, { updatedAt: now }); // Update DB time too

        await saveToDisk(doc);

        // Sync to workspace
        await restoreFromTrashInWorkspace(id);
        await addNoteToWorkspace({ id: doc.id, title: doc.title, updatedAt: now });
    }
};

// Permanently delete
export const permanentlyDelete = async (id: string) => {
    await db.documents.delete(id);
    try {
        const path = await getContentPath(id);
        await invoke('delete_file', { path });
    } catch (error) {
        console.error('[DB] Failed to delete from disk:', error);
    }

    // Sync to workspace
    await permanentlyDeleteFromWorkspace(id);
    await removeNoteFromWorkspace(id); // Safety ensure it's gone from notes if it was somehow there
};

// Search documents by title
export const searchDocuments = async (query: string) => {
    const lowerQuery = query.toLowerCase();
    return await db.documents
        .filter(doc => !doc.isDeleted && doc.title.toLowerCase().includes(lowerQuery))
        .toArray();
};
