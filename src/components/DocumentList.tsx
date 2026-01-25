import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { Star, Trash2, RotateCcw, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import React, { useMemo, useCallback } from 'react';

interface DocumentListProps {
    viewType: 'all-notes' | 'favorites' | 'trash';
}

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
            onClick={() => onOpen(id)}
            className={cn(
                "group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all",
                "hover:bg-stone-100 dark:hover:bg-stone-800",
                isSelected && "bg-stone-100 dark:bg-stone-800"
            )}
        >
            <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 text-stone-400 shrink-0" />
                <div className="min-w-0">
                    <div className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">
                        {title || 'Untitled'}
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400">
                        {formatDate(updatedAt)}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {viewType === 'trash' ? (
                    <>
                        <button
                            onClick={(e) => onRestore(e, id)}
                            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400"
                            title="Restore"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => onPermanentDelete(e, id)}
                            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                            title="Delete permanently"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={(e) => onToggleFavorite(e, id)}
                            className={cn(
                                "p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700",
                                isFavorite
                                    ? "text-amber-500"
                                    : "text-stone-400"
                            )}
                            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                        >
                            <Star className={cn("w-4 h-4", isFavorite && "fill-current")} />
                        </button>
                        <button
                            onClick={(e) => onMoveToTrash(e, id)}
                            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-400 hover:text-red-500"
                            title="Move to trash"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
});

export default function DocumentList({ viewType }: DocumentListProps) {
    const {
        openDocument,
        currentDocId,
        notes,
        favorites,
        trash,
        toggleFavoriteNote,
        moveNoteToTrash,
        restoreNoteFromTrash,
        deleteNotePermanently
    } = useAppStore(useShallow(state => ({
        openDocument: state.openDocument,
        currentDocId: state.currentDocId,
        notes: state.notes,
        favorites: state.favorites,
        trash: state.trash,
        toggleFavoriteNote: state.toggleFavoriteNote,
        moveNoteToTrash: state.moveNoteToTrash,
        restoreNoteFromTrash: state.restoreNoteFromTrash,
        deleteNotePermanently: state.deleteNotePermanently
    })));

    // Optimize lookups by converting favorites array to a Set
    const favoritesSet = useMemo(() => new Set(favorites), [favorites]);

    // Derive documents from store data based on view type
    const documents = useMemo(() => {
        switch (viewType) {
            case 'all-notes':
                return notes;
            case 'favorites':
                return notes.filter(n => favoritesSet.has(n.id));
            case 'trash':
                return trash;
            default:
                return [];
        }
    }, [viewType, notes, favoritesSet, trash]);

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
            <h1 className="text-2xl font-serif font-semibold text-stone-800 dark:text-stone-200 mb-6">
                {getTitle()}
            </h1>

            {documents.length === 0 ? (
                <div className="text-stone-500 dark:text-stone-400 py-8 text-center">
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
