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

/**
 * Interface representing a document in the database.
 */
export interface Document {
    /** Unique identifier for the document. */
    id: string;
    /** The title of the document. */
    title: string;
    /** The JSON content of the document (Tiptap structure). */
    content: any;
    /** Timestamp of the last update. */
    updatedAt: number;
    /** Whether the document is marked as favorite. */
    isFavorite?: boolean;
    /** Whether the document is marked as deleted (soft delete). */
    isDeleted?: boolean;
    /** Timestamp when the document was deleted. */
    deletedAt?: number;
}

/**
 * Dexie database instance for Dialog.
 * Manages local persistence of documents.
 */
class DialogDB extends Dexie {
    /** Table for storing documents. */
    documents!: Table<Document>;

    constructor() {
        super('DialogDB');
        this.version(3).stores({
            documents: 'id, updatedAt, isFavorite, isDeleted' // Primary key and indices
        });
        this.version(4).stores({
            documents: 'id, updatedAt, isFavorite, isDeleted, [isDeleted+updatedAt]'
        }).upgrade(tx => {
            return tx.table('documents').toCollection().modify(doc => {
                if (doc.isDeleted === undefined) doc.isDeleted = false;
            });
        });
        this.version(5).stores({
            documents: 'id, updatedAt, isFavorite, isDeleted, [isDeleted+updatedAt], [isFavorite+isDeleted+updatedAt]'
        }).upgrade(tx => {
            return tx.table('documents').toCollection().modify(doc => {
                if (doc.isFavorite === undefined) doc.isFavorite = false;
            });
        });
        this.version(6).stores({
            documents: 'id, updatedAt, isFavorite, isDeleted, [isDeleted+updatedAt], [isFavorite+isDeleted+updatedAt], [isDeleted+deletedAt]'
        });
        // Version 7: Add covering indices to include title, id, and other metadata fields to avoid fetching full object.
        this.version(7).stores({
            documents: 'id, updatedAt, isFavorite, isDeleted, [isDeleted+updatedAt+title+id+isFavorite], [isFavorite+isDeleted+updatedAt+title+id], [isDeleted+deletedAt+title+id+updatedAt+isFavorite]'
        });
    }
}

/** The singleton instance of the DialogDB. */
export const db = new DialogDB();

/**
 * Saves a document to the file system.
 * Writes the document content to a JSON file on disk.
 *
 * @param doc The document to save.
 * @returns {Promise<void>} A promise that resolves when the file is written.
 */
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

/**
 * Creates a new document.
 * Initializes the document in the database, saves it to disk, and updates the workspace.
 *
 * @param title The title of the new document. Defaults to 'Untitled'.
 * @returns {Promise<string>} The ID of the newly created document.
 */
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

/**
 * Updates an existing document.
 * Saves changes to the database and optionally syncs with the workspace.
 *
 * @param id The ID of the document to update.
 * @param content The new content for the document.
 * @param title The new title for the document.
 * @param options Additional options for the update.
 * @param options.isDeleted Update the deletion status.
 * @param options.skipWorkspaceSync If true, bypasses updating the workspace metadata.
 * @returns {Promise<void>} A promise that resolves when the update is complete.
 */
export const saveDocument = async (id: string, content: any, title?: string, options?: { isDeleted?: boolean, skipWorkspaceSync?: boolean }) => {
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
    if (!options?.isDeleted && !existing?.isDeleted && !options?.skipWorkspaceSync) {
        await updateNoteInWorkspace(id, { title: finalTitle, updatedAt: now });
    }
};

/**
 * Loads a document by its ID.
 *
 * @param id The ID of the document to load.
 * @returns {Promise<Document | undefined>} The loaded document, or undefined if not found.
 */
export const loadDocument = async (id: string) => {
    return await db.documents.get(id);
};

/**
 * Retrieves all active (non-deleted) documents.
 * Results are sorted by `updatedAt` in descending order.
 * Optimized to only fetch metadata (skips content) using covering index.
 *
 * @returns {Promise<Document[]>} A list of active documents (content is undefined).
 */
export const getAllDocuments = async (): Promise<Document[]> => {
    const keys = await db.documents
        .where('[isDeleted+updatedAt+title+id+isFavorite]')
        .between(
            [false, Dexie.minKey, Dexie.minKey, Dexie.minKey, Dexie.minKey],
            [false, Dexie.maxKey, Dexie.maxKey, Dexie.maxKey, Dexie.maxKey]
        )
        .reverse()
        .keys();

    return keys.map(key => {
        // key is [isDeleted, updatedAt, title, id, isFavorite]
        const k = key as unknown as [boolean, number, string, string, boolean];
        return {
            isDeleted: k[0],
            updatedAt: k[1],
            title: k[2],
            id: k[3],
            isFavorite: k[4],
            content: undefined,
        } as Document;
    });
};

/**
 * Retrieves all favorite documents.
 * Results are sorted by `updatedAt` in descending order.
 * Optimized to only fetch metadata using covering index.
 *
 * @returns {Promise<Document[]>} A list of favorite documents (content is undefined).
 */
export const getFavorites = async (): Promise<Document[]> => {
    const keys = await db.documents
        .where('[isFavorite+isDeleted+updatedAt+title+id]')
        .between(
            [true, false, Dexie.minKey, Dexie.minKey, Dexie.minKey],
            [true, false, Dexie.maxKey, Dexie.maxKey, Dexie.maxKey]
        )
        .reverse()
        .keys();

    return keys.map(key => {
        // key is [isFavorite, isDeleted, updatedAt, title, id]
        const k = key as unknown as [boolean, boolean, number, string, string];
        return {
            isFavorite: k[0],
            isDeleted: k[1],
            updatedAt: k[2],
            title: k[3],
            id: k[4],
            content: undefined
        } as Document;
    });
};

/**
 * Retrieves all trashed (soft-deleted) documents.
 * Results are sorted by `deletedAt` in descending order.
 * Optimized to only fetch metadata using covering index.
 *
 * @returns {Promise<Document[]>} A list of trashed documents (content is undefined).
 */
export const getTrash = async (): Promise<Document[]> => {
    const keys = await db.documents
        .where('[isDeleted+deletedAt+title+id+updatedAt+isFavorite]')
        .between(
            [true, Dexie.minKey, Dexie.minKey, Dexie.minKey, Dexie.minKey, Dexie.minKey],
            [true, Dexie.maxKey, Dexie.maxKey, Dexie.maxKey, Dexie.maxKey, Dexie.maxKey]
        )
        .reverse()
        .keys();

    return keys.map(key => {
        // key is [isDeleted, deletedAt, title, id, updatedAt, isFavorite]
        const k = key as unknown as [boolean, number, string, string, number, boolean];
        return {
            isDeleted: k[0],
            deletedAt: k[1],
            title: k[2],
            id: k[3],
            updatedAt: k[4],
            isFavorite: k[5],
            content: undefined,
        } as Document;
    });
};

/**
 * Toggles the favorite status of a document.
 * Updates both the database and the workspace.
 *
 * @param id The ID of the document to toggle.
 * @returns {Promise<void>} A promise that resolves when the update is complete.
 */
export const toggleFavorite = async (id: string) => {
    const doc = await db.documents.get(id);
    if (doc) {
        await db.documents.update(id, { isFavorite: !doc.isFavorite });
        // Sync to workspace
        await toggleFavoriteInWorkspace(id);
    }
};

/**
 * Moves a document to the trash (soft delete).
 * Sets `isDeleted` to true and updates the deletion timestamp.
 *
 * @param id The ID of the document to trash.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
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

/**
 * Restores a document from the trash.
 * Resets `isDeleted` to false and updates the `updatedAt` timestamp.
 *
 * @param id The ID of the document to restore.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
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

/**
 * Permanently deletes a document from the database and disk.
 * This action cannot be undone.
 *
 * @param id The ID of the document to delete.
 * @returns {Promise<void>} A promise that resolves when the document is permanently deleted.
 */
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
