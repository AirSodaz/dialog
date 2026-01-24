import { useAppStore } from '../store/appStore';
import { Star, Trash2, RotateCcw, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import React from 'react';

interface DocumentListProps {
    viewType: 'all-notes' | 'favorites' | 'trash';
}

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
    } = useAppStore();

    // Derive documents from store data based on view type
    const documents = (() => {
        switch (viewType) {
            case 'all-notes':
                return notes;
            case 'favorites':
                return notes.filter(n => favorites.includes(n.id));
            case 'trash':
                return trash;
            default:
                return [];
        }
    })();

    // Helper to format date consistent with how DB returned it (assuming store has same timestamp)
    // Note: store has { id, title, updatedAt/deletedAt }

    // We need to map store objects to what the list expects.
    // The list expects objects with { id, title, updatedAt, isFavorite?, isDeleted? }

    const displayDocuments = documents.map(doc => ({
        ...doc,
        // Handle trash having deletedAt instead of updatedAt
        updatedAt: 'updatedAt' in doc ? doc.updatedAt : (doc as any).deletedAt,
        isFavorite: favorites.includes(doc.id),
        isDeleted: viewType === 'trash'
    }));

    const handleToggleFavorite = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await toggleFavoriteNote(id);
        // No need to reloadDocuments, store updates automatically via db hooks
    };

    const handleMoveToTrash = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await moveNoteToTrash(id);
    };

    const handleRestore = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await restoreNoteFromTrash(id);
    };

    const handlePermanentDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Permanently delete this document? This cannot be undone.')) {
            await deleteNotePermanently(id);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

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

            {displayDocuments.length === 0 ? (
                <div className="text-stone-500 dark:text-stone-400 py-8 text-center">
                    {viewType === 'trash'
                        ? 'Trash is empty'
                        : viewType === 'favorites'
                            ? 'No favorites yet. Star a note to add it here.'
                            : 'No notes yet. Create your first note!'}
                </div>
            ) : (
                <div className="space-y-2">
                    {displayDocuments.map((doc) => (
                        <div
                            key={doc.id}
                            onClick={() => openDocument(doc.id)}
                            className={cn(
                                "group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all",
                                "hover:bg-stone-100 dark:hover:bg-stone-800",
                                currentDocId === doc.id && "bg-stone-100 dark:bg-stone-800"
                            )}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <FileText className="w-5 h-5 text-stone-400 shrink-0" />
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">
                                        {doc.title || 'Untitled'}
                                    </div>
                                    <div className="text-xs text-stone-500 dark:text-stone-400">
                                        {formatDate(doc.updatedAt)}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {viewType === 'trash' ? (
                                    <>
                                        <button
                                            onClick={(e) => handleRestore(e, doc.id)}
                                            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400"
                                            title="Restore"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => handlePermanentDelete(e, doc.id)}
                                            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                                            title="Delete permanently"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={(e) => handleToggleFavorite(e, doc.id)}
                                            className={cn(
                                                "p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700",
                                                doc.isFavorite
                                                    ? "text-amber-500"
                                                    : "text-stone-400"
                                            )}
                                            title={doc.isFavorite ? "Remove from favorites" : "Add to favorites"}
                                        >
                                            <Star className={cn("w-4 h-4", doc.isFavorite && "fill-current")} />
                                        </button>
                                        <button
                                            onClick={(e) => handleMoveToTrash(e, doc.id)}
                                            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-400 hover:text-red-500"
                                            title="Move to trash"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
