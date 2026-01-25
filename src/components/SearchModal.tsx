import { useEffect, useState, useRef, useCallback } from 'react';
import { Document, searchDocuments, getAllDocuments } from '../db/db';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { Search, FileText, X } from 'lucide-react';
import { cn } from '../lib/utils';

export default function SearchModal() {
    const { searchOpen, closeSearch, openDocument } = useAppStore(useShallow((state) => ({
        searchOpen: state.searchOpen,
        closeSearch: state.closeSearch,
        openDocument: state.openDocument,
    })));
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Document[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Load all documents on open, then filter as user types
    useEffect(() => {
        if (searchOpen) {
            setQuery('');
            setSelectedIndex(0);
            // Load all documents initially
            getAllDocuments().then(setResults);
            // Focus input after a small delay for animation
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [searchOpen]);

    // Search as user types
    useEffect(() => {
        const search = async () => {
            if (query.trim()) {
                const docs = await searchDocuments(query);
                setResults(docs);
            } else {
                const docs = await getAllDocuments();
                setResults(docs);
            }
            setSelectedIndex(0);
        };
        search();
    }, [query]);

    // Global keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                useAppStore.getState().toggleSearch();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, results.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (results[selectedIndex]) {
                    openDocument(results[selectedIndex].id);
                }
                break;
            case 'Escape':
                e.preventDefault();
                closeSearch();
                break;
        }
    }, [results, selectedIndex, openDocument, closeSearch]);

    if (!searchOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
            onClick={closeSearch}
        >
            <div
                className="w-full max-w-xl bg-white dark:bg-stone-900 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-700 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-200 dark:border-stone-700">
                    <Search className="w-5 h-5 text-stone-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search notes..."
                        className="flex-1 bg-transparent text-stone-800 dark:text-stone-200 placeholder-stone-400 outline-none text-base"
                    />
                    <button
                        onClick={closeSearch}
                        className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto">
                    {results.length === 0 ? (
                        <div className="px-4 py-8 text-center text-stone-500 dark:text-stone-400">
                            {query ? 'No notes found' : 'No notes yet'}
                        </div>
                    ) : (
                        <div className="py-2">
                            {results.map((doc, index) => (
                                <div
                                    key={doc.id}
                                    onClick={() => openDocument(doc.id)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors",
                                        index === selectedIndex
                                            ? "bg-stone-100 dark:bg-stone-800"
                                            : "hover:bg-stone-50 dark:hover:bg-stone-800/50"
                                    )}
                                >
                                    <FileText className="w-4 h-4 text-stone-400 shrink-0" />
                                    <span className="text-sm text-stone-800 dark:text-stone-200 truncate">
                                        {doc.title || 'Untitled'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                <div className="px-4 py-2 border-t border-stone-200 dark:border-stone-700 text-xs text-stone-400 flex items-center gap-4">
                    <span>↑↓ to navigate</span>
                    <span>↵ to open</span>
                    <span>esc to close</span>
                </div>
            </div>
        </div>
    );
}
