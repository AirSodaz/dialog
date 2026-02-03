import { useState, useRef, useEffect, FocusEvent, useCallback, memo } from "react";
import { type JSONContent } from "@tiptap/react";
import { cn } from "../lib/utils";
import {
    FileText,
    Star,
    Trash2,
    Settings,
    Plus,
    Search
} from "lucide-react";
import { useAppStore } from "../store/appStore";
import { useShallow } from "zustand/react/shallow";
import { loadDocument } from "../db/db";

/**
 * Checks if Tiptap content is considered empty.
 * An empty document typically has no content or just an empty paragraph.
 *
 * @param content The Tiptap JSON content.
 * @returns {boolean} True if the content is empty, false otherwise.
 */
function isContentEmpty(content: JSONContent | null | undefined): boolean {
    if (!content) return true;
    if (!content.content || content.content.length === 0) return true;
    // Check if it's just an empty paragraph
    if (content.content.length === 1) {
        const firstNode = content.content[0];
        if (firstNode.type === 'paragraph' && (!firstNode.content || firstNode.content.length === 0)) {
            return true;
        }
    }
    return false;
}

/**
 * Sidebar component.
 * Provides navigation, search, quick actions, and a list of recent documents.
 * It handles its own visibility state (hover to reveal).
 */
export default function Sidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const timeoutRef = useRef<number | null>(null);
    const {
        currentView,
        currentDocId,
        setView,
        openDocument,
        openSearch,
        openSettings,
        createNote
    } = useAppStore(useShallow((state) => ({
        currentView: state.currentView,
        currentDocId: state.currentDocId,
        setView: state.setView,
        openDocument: state.openDocument,
        openSearch: state.openSearch,
        openSettings: state.openSettings,
        createNote: state.createNote,
    })));

    // Derive recent pages from store data using JSON serialization for stability.
    // This prevents re-renders when only timestamps change (common during typing)
    // or when object references change but content is identical.
    const recentPagesJson = useAppStore((state) => {
        const pages = state.recentDocs
            .map(id => {
                const note = state.notes.find(n => n.id === id);
                return note ? { id: note.id, title: note.title } : null;
            })
            .filter((n): n is { id: string, title: string } => !!n)
            .slice(0, 5);
        return JSON.stringify(pages);
    });

    const recentPages: { id: string, title: string }[] = JSON.parse(recentPagesJson);

    /** Handles mouse enter event to show sidebar. */
    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsOpen(true);
    };

    /** Handles mouse leave event to hide sidebar with a delay. */
    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 400); // Slightly longer delay for usability
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }
    }, []);

    /**
     * Creates a new page.
     * If the current page is empty, it switches to it instead of creating a new one.
     */
    const handleNewPage = useCallback(async () => {
        // Check if current document is empty
        if (currentDocId) {
            const currentDoc = await loadDocument(currentDocId);
            // Only prevent creation if the current doc exists, is NOT deleted, and IS empty
            if (currentDoc && !currentDoc.isDeleted && isContentEmpty(currentDoc.content)) {
                // Current page is empty, don't create a new one
                // Optionally switch to it if we aren't already there
                if (currentView !== 'editor') {
                    openDocument(currentDocId);
                }
                return;
            }
        }
        const newId = await createNote();
        openDocument(newId);
    }, [currentDocId, currentView, openDocument, createNote]);

    const handleSearch = useCallback(() => {
        openSearch();
    }, [openSearch]);

    const handleNavAllNotes = useCallback(() => setView('all-notes'), [setView]);
    const handleNavFavorites = useCallback(() => setView('favorites'), [setView]);
    const handleNavTrash = useCallback(() => setView('trash'), [setView]);

    /**
     * Handles focus loss on the sidebar.
     * Closes the sidebar only if focus moves outside of it.
     */
    const handleFocusLeave = (e: FocusEvent) => {
        // Only close if focus is moving outside the sidebar
        if (!e.currentTarget.contains(e.relatedTarget)) {
            handleMouseLeave();
        }
    };

    return (
        <>
            <div
                className="fixed top-0 left-0 bottom-0 w-6 z-50 bg-transparent"
                onMouseEnter={handleMouseEnter}
            />

            <aside
                className={cn(
                    "fixed top-0 left-0 bottom-0 z-40 w-[280px] bg-sidebar border-r border-border-base",
                    "shadow-[4px_0_24px_rgba(0,0,0,0.02)]",
                    "transition-all duration-300 ease-in-out transform",
                    isOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-90",
                    "flex flex-col py-4 px-3"
                )}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onFocus={handleMouseEnter}
                onBlur={handleFocusLeave}
            >

                {/* Quick Actions */}
                <div className="mb-4 px-2">
                    <button
                        onClick={handleNewPage}
                        className="w-full flex items-center gap-2 px-2 py-1.5 bg-paper hover:bg-surface-hover border border-border-base shadow-sm rounded-md text-muted transition-all group"
                    >
                        <Plus className="w-4 h-4 text-subtle group-hover:text-muted" />
                        <span className="text-sm font-medium">New Page</span>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-0.5 overflow-y-auto" aria-label="Main Navigation">
                    <SidebarItem
                        icon={Search}
                        label="Search"
                        shortcut="Cmd+K"
                        onClick={handleSearch}
                    />
                    <SidebarItem
                        icon={FileText}
                        label="All Notes"
                        active={currentView === 'all-notes'}
                        onClick={handleNavAllNotes}
                    />
                    <SidebarItem
                        icon={Star}
                        label="Favorites"
                        active={currentView === 'favorites'}
                        onClick={handleNavFavorites}
                    />
                    <SidebarItem
                        icon={Trash2}
                        label="Trash"
                        active={currentView === 'trash'}
                        onClick={handleNavTrash}
                    />

                    {/* Recent Pages */}
                    {recentPages.length > 0 && (
                        <div className="pt-4 pb-2" role="region" aria-label="Recent Notes">
                            <div className="px-3 text-xs font-semibold text-subtle uppercase tracking-wider mb-1" aria-hidden="true">
                                Recent
                            </div>
                            {recentPages.map((doc) => (
                                <RecentPageItem
                                    key={doc.id}
                                    id={doc.id}
                                    title={doc.title || 'Untitled'}
                                    active={currentView === 'editor' && currentDocId === doc.id}
                                    onOpen={openDocument}
                                />
                            ))}
                        </div>
                    )}
                </nav>

                {/* Footer */}
                <div className="mt-auto px-1 pt-2 border-t border-border-base">
                    <SidebarItem
                        icon={Settings}
                        label="Settings"
                        onClick={openSettings}
                    />
                </div>
            </aside>
        </>
    );
}

interface SidebarItemProps {
    /** Icon component to display. */
    icon: React.ComponentType<{ className?: string }>;
    /** Text label for the item. */
    label: string;
    /** Optional keyboard shortcut hint. */
    shortcut?: string;
    /** Whether the item is currently active/selected. */
    active?: boolean;
    /** Click handler. */
    onClick?: () => void;
}

/**
 * Reusable sidebar navigation item.
 */
function SidebarItemImpl({ icon: Icon, label, shortcut, active, onClick }: SidebarItemProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-current={active ? 'page' : undefined}
            className={cn(
                "w-full text-left flex items-center justify-between px-3 py-1.5 rounded-md cursor-pointer text-muted group transition-colors",
                active
                    ? "bg-surface-hover text-ink"
                    : "hover:bg-surface-hover"
            )}
        >
            <div className="flex items-center gap-2.5">
                <Icon className={cn(
                    "w-4 h-4",
                    active
                        ? "text-ink"
                        : "text-subtle group-hover:text-muted"
                )} />
                <span className="text-[13px] font-medium">{label}</span>
            </div>
            {shortcut && (
                <span className="text-[10px] text-subtle font-medium">{shortcut}</span>
            )}
        </button>
    )
}
const SidebarItem = memo(SidebarItemImpl);

interface RecentPageItemProps {
    id: string;
    title: string;
    active: boolean;
    onOpen: (id: string) => void;
}

/**
 * Item representing a recently opened page in the sidebar.
 */
function RecentPageItemImpl({ id, title, active, onOpen }: RecentPageItemProps) {
    const handleClick = useCallback(() => onOpen(id), [onOpen, id]);

    return (
        <SidebarItem
            icon={FileText}
            label={title}
            active={active}
            onClick={handleClick}
        />
    );
}
const RecentPageItem = memo(RecentPageItemImpl);
