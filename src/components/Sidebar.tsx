import { useState, useRef, useEffect, FocusEvent } from "react";
import { cn } from "../lib/utils";
import {
    FileText,
    Star,
    Trash2,
    Settings,
    Plus,
    Search
} from "lucide-react";
import { useAppStore, ViewType } from "../store/appStore";
import { useShallow } from "zustand/react/shallow";
import { loadDocument } from "../db/db";

// Helper function to check if Tiptap content is empty
const isContentEmpty = (content: any): boolean => {
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
};

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
        recentDocs,
        notes,
        createNote
    } = useAppStore(useShallow((state) => ({
        currentView: state.currentView,
        currentDocId: state.currentDocId,
        setView: state.setView,
        openDocument: state.openDocument,
        openSearch: state.openSearch,
        openSettings: state.openSettings,
        recentDocs: state.recentDocs,
        notes: state.notes,
        createNote: state.createNote,
    })));

    // Derive recent pages from store data
    const recentPages = recentDocs
        .map(id => notes.find(n => n.id === id))
        .filter((n): n is { id: string, title: string, updatedAt: number } => !!n)
        .slice(0, 5);

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsOpen(true);
    };

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

    const handleNewPage = async () => {
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
    };

    const handleSearch = () => {
        openSearch();
    };

    const handleNavigation = (view: ViewType) => {
        setView(view);
    };

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
                    "fixed top-0 left-0 bottom-0 z-40 w-[280px] bg-sidebar dark:bg-[#202020] border-r border-[#E0E0E0] dark:border-[#333]",
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
                        className="w-full flex items-center gap-2 px-2 py-1.5 bg-white dark:bg-[#2C2C2C] hover:bg-stone-50 dark:hover:bg-[#353535] border border-stone-200 dark:border-[#333] shadow-sm rounded-md text-stone-600 dark:text-stone-300 transition-all group"
                    >
                        <Plus className="w-4 h-4 text-stone-400 group-hover:text-stone-600 dark:text-stone-500 dark:group-hover:text-stone-300" />
                        <span className="text-sm font-medium">New Page</span>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-0.5 overflow-y-auto">
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
                        onClick={() => handleNavigation('all-notes')}
                    />
                    <SidebarItem
                        icon={Star}
                        label="Favorites"
                        active={currentView === 'favorites'}
                        onClick={() => handleNavigation('favorites')}
                    />
                    <SidebarItem
                        icon={Trash2}
                        label="Trash"
                        active={currentView === 'trash'}
                        onClick={() => handleNavigation('trash')}
                    />

                    {/* Recent Pages */}
                    {recentPages.length > 0 && (
                        <div className="pt-4 pb-2">
                            <div className="px-3 text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">
                                Recent
                            </div>
                            {recentPages.map((doc) => (
                                <SidebarItem
                                    key={doc.id}
                                    icon={FileText}
                                    label={doc.title || 'Untitled'}
                                    active={currentView === 'editor' && currentDocId === doc.id}
                                    onClick={() => openDocument(doc.id)}
                                />
                            ))}
                        </div>
                    )}
                </nav>

                {/* Footer */}
                <div className="mt-auto px-1 pt-2 border-t border-black/5 dark:border-white/5">
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
    icon: any;
    label: string;
    shortcut?: string;
    active?: boolean;
    onClick?: () => void;
}

function SidebarItem({ icon: Icon, label, shortcut, active, onClick }: SidebarItemProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "w-full text-left flex items-center justify-between px-3 py-1.5 rounded-md cursor-pointer text-stone-600 dark:text-stone-300 group transition-colors",
                active
                    ? "bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    : "hover:bg-black/5 dark:hover:bg-white/5"
            )}
        >
            <div className="flex items-center gap-2.5">
                <Icon className={cn(
                    "w-4 h-4",
                    active
                        ? "text-stone-700 dark:text-stone-200"
                        : "text-stone-500 dark:text-stone-400 group-hover:text-stone-800 dark:group-hover:text-stone-200"
                )} />
                <span className="text-[13px] font-medium">{label}</span>
            </div>
            {shortcut && (
                <span className="text-[10px] text-stone-400 dark:text-stone-600 font-medium">{shortcut}</span>
            )}
        </button>
    )
}

