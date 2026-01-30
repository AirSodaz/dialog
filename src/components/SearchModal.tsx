import { useEffect, useState, useRef, useCallback } from 'react';
import { Document, searchDocuments, getAllDocuments } from '../db/db';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { Search, FileText, X } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Modal component for searching notes.
 * Provides a global search interface with keyboard navigation.
 */
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
                className="w-full max-w-xl bg-modal rounded-xl shadow-2xl border border-border-base overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border-base">
                    <Search className="w-5 h-5 text-subtle" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search notes..."
                        className="flex-1 bg-transparent text-ink placeholder-subtle outline-none text-base"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={results.length > 0}
                        aria-controls="search-results"
                        aria-activedescendant={results[selectedIndex] ? `result-${results[selectedIndex].id}` : undefined}
                    />
                    <button
                        onClick={closeSearch}
                        aria-label="Close search"
                        title="Close search"
                        className="p-1 rounded hover:bg-surface-hover text-subtle"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto">
                    {results.length === 0 ? (
                        <div className="px-4 py-8 text-center text-muted">
                            {query ? 'No notes found' : 'No notes yet'}
                        </div>
                    ) : (
                        <div
                            className="py-2"
                            id="search-results"
                            role="listbox"
                        >
                            {results.map((doc, index) => (
                                <div
                                    key={doc.id}
                                    id={`result-${doc.id}`}
                                    role="option"
                                    aria-selected={index === selectedIndex}
                                    onClick={() => openDocument(doc.id)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors",
                                        index === selectedIndex
                                            ? "bg-surface-hover"
                                            : "hover:bg-surface-hover"
                                    )}
                                >
                                    <FileText className="w-4 h-4 text-subtle shrink-0" />
                                    <span className="text-sm text-ink truncate">
                                        {doc.title || 'Untitled'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                <div className="px-4 py-2 border-t border-border-base text-xs text-subtle flex items-center gap-4">
                    <span>↑↓ to navigate</span>
                    <span>↵ to open</span>
                    <span>esc to close</span>
                </div>
            </div>
        </div>
    );
}
