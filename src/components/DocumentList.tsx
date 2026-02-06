import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { Star, Trash2, RotateCcw, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import React, { useMemo, useCallback } from 'react';

interface DocumentListProps {
    viewType: 'all-notes' | 'favorites' | 'trash';
}

/**
 * Formats a timestamp into a human-readable date string.
 *
 * @param timestamp The timestamp to format.
 * @returns {string} The formatted date string (e.g., "Jan 1, 2024").
 */
const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

interface DocItemProps {
    id: string;
    title: string;
    updatedAt: number;
    isFavorite: boolean;
    isSelected: boolean;
    viewType: 'all-notes' | 'favorites' | 'trash';
    onOpen: (id: string) => void;
    onToggleFavorite: (e: React.MouseEvent, id: string) => void;
    onMoveToTrash: (e: React.MouseEvent, id: string) => void;
    onRestore: (e: React.MouseEvent, id: string) => void;
    onPermanentDelete: (e: React.MouseEvent, id: string) => void;
}

/**
 * Individual document item in the list.
 * Memoized to prevent unnecessary re-renders when other items change.
 */
const DocumentListItem = React.memo(({
    id,
    title,
    updatedAt,
    isFavorite,
    isSelected,
    viewType,
    onOpen,
    onToggleFavorite,
    onMoveToTrash,
    onRestore,
    onPermanentDelete
}: DocItemProps) => {
    return (
        <div
            className={cn(
                "group flex items-center justify-between p-3 rounded-lg transition-all relative",
                "hover:bg-surface-hover",
                isSelected && "bg-surface-hover"
            )}
        >
            <button
                onClick={() => onOpen(id)}
                aria-label={`Open ${title || 'Untitled'}`}
                className="absolute inset-0 w-full h-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-stone-400 dark:focus-visible:ring-stone-600 text-left"
            />
            <div className="flex items-center gap-3 min-w-0 relative z-10 pointer-events-none">
                <FileText className="w-5 h-5 text-subtle shrink-0" />
                <div className="min-w-0">
                    <div className="text-sm font-medium text-ink truncate">
                        {title || 'Untitled'}
                    </div>
                    <div className="text-xs text-muted">
                        {formatDate(updatedAt)}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity relative z-20">
                {viewType === 'trash' ? (
                    <>
                        <button
                            onClick={(e) => onRestore(e, id)}
                            className="p-1.5 rounded hover:bg-border-base text-muted"
                            title="Restore"
                            aria-label="Restore"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => onPermanentDelete(e, id)}
                            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                            title="Delete permanently"
                            aria-label="Delete permanently"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={(e) => onToggleFavorite(e, id)}
                            className={cn(
                                "p-1.5 rounded hover:bg-border-base",
                                isFavorite
                                    ? "text-amber-500"
                                    : "text-subtle"
                            )}
                            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                        >
                            <Star className={cn("w-4 h-4", isFavorite && "fill-current")} />
                        </button>
                        <button
                            onClick={(e) => onMoveToTrash(e, id)}
                            className="p-1.5 rounded hover:bg-border-base text-subtle hover:text-red-500"
                            title="Move to trash"
                            aria-label="Move to trash"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
});

/**
 * Component for listing documents based on the current view type.
 * Supports 'all-notes', 'favorites', and 'trash' views.
 * Handles document actions like opening, toggling favorites, and deletion.
 */
export default function DocumentList({ viewType }: DocumentListProps) {
    // 1. Subscribe to stable actions
    const {
        openDocument,
        toggleFavoriteNote,
        moveNoteToTrash,
        restoreNoteFromTrash,
        deleteNotePermanently
    } = useAppStore(useShallow(state => ({
        openDocument: state.openDocument,
        toggleFavoriteNote: state.toggleFavoriteNote,
        moveNoteToTrash: state.moveNoteToTrash,
        restoreNoteFromTrash: state.restoreNoteFromTrash,
        deleteNotePermanently: state.deleteNotePermanently
    })));

    // 2. Subscribe to currentDocId (primitive)
    const currentDocId = useAppStore(useShallow(state => state.currentDocId));

    // 3. Subscribe to favorites (needed for star icon in all views, stable unless toggled)
    const favorites = useAppStore(useShallow(state => state.favorites));

    // 4. Optimized documents selection:
    // Only subscribe to the specific list needed for the current view.
    // This prevents re-renders when `notes` updates but we are in `trash` view,
    // or when `notes` updates but the filtered `favorites` list remains shallowly equal.
    const documents = useAppStore(useShallow(state => {
        switch (viewType) {
            case 'all-notes':
                return state.notes;
            case 'favorites':
                // Only return notes that are in favorites.
                // useShallow will prevent re-render if the resulting array is shallowly equal to previous.
                return state.notes.filter(n => state.favorites.includes(n.id));
            case 'trash':
                return state.trash;
            default:
                return [];
        }
    }));

    // Optimize lookups by converting favorites array to a Set
    const favoritesSet = useMemo(() => new Set(favorites), [favorites]);

    const handleToggleFavorite = useCallback(async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await toggleFavoriteNote(id);
    }, [toggleFavoriteNote]);

    const handleMoveToTrash = useCallback(async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await moveNoteToTrash(id);
    }, [moveNoteToTrash]);

    const handleRestore = useCallback(async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await restoreNoteFromTrash(id);
    }, [restoreNoteFromTrash]);

    const handlePermanentDelete = useCallback(async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Permanently delete this document? This cannot be undone.')) {
            await deleteNotePermanently(id);
        }
    }, [deleteNotePermanently]);

    const getTitle = (): string => {
        switch (viewType) {
            case 'all-notes': return 'All Notes';
            case 'favorites': return 'Favorites';
            case 'trash': return 'Trash';
        }
    };

    return (
        <div className="max-w-4xl mx-auto w-full py-12 px-12">
            <h1 className="text-2xl font-serif font-semibold text-ink mb-6">
                {getTitle()}
            </h1>

            {documents.length === 0 ? (
                <div className="text-muted py-8 text-center">
                    {viewType === 'trash'
                        ? 'Trash is empty'
                        : viewType === 'favorites'
                            ? 'No favorites yet. Star a note to add it here.'
                            : 'No notes yet. Create your first note!'}
                </div>
            ) : (
                <div className="space-y-2">
                    {documents.map((doc) => {
                        const timestamp = 'updatedAt' in doc ? doc.updatedAt : (doc as any).deletedAt;
                        const isFav = favoritesSet.has(doc.id);

                        return (
                            <DocumentListItem
                                key={doc.id}
                                id={doc.id}
                                title={doc.title}
                                updatedAt={timestamp}
                                isFavorite={isFav}
                                isSelected={currentDocId === doc.id}
                                viewType={viewType}
                                onOpen={openDocument}
                                onToggleFavorite={handleToggleFavorite}
                                onMoveToTrash={handleMoveToTrash}
                                onRestore={handleRestore}
                                onPermanentDelete={handlePermanentDelete}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
