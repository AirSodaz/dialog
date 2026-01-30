import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { DragHandle } from './DragHandle';
import { SlashCommand, getSuggestionItems, renderSuggestionItems } from '../extensions/SlashCommand';
import { AudioNode } from '../extensions/AudioNode';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Underline } from '@tiptap/extension-underline';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { useEffect, useState, useRef } from 'react';
import { saveDocument, loadDocument, createDocument, getAllDocuments } from '../db/db';
import { invoke } from '@tauri-apps/api/core';
// import { join } from '@tauri-apps/api/path'; // Removed
import { getContentPath } from '../utils/workspace';
import { SyncStatus } from './SyncStatus';
import { NodeSelection } from '@tiptap/pm/state';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { Sparkles } from 'lucide-react';

import { AINode } from '../extensions/AINode';

const lowlight = createLowlight(common);

/**
 * Main text editor component based on Tiptap.
 * Handles document loading, saving (to both DB and filesystem), and editing interactions.
 */
const Editor = () => {
    const { currentDocId, setCurrentDoc, updateNote } = useAppStore(useShallow((state) => ({
        currentDocId: state.currentDocId,
        setCurrentDoc: state.setCurrentDoc,
        updateNote: state.updateNote,
    })));
    const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'unsaved'>('synced');
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLoadingRef = useRef(false);
    const lastTitleRef = useRef<string>("");


    /**
     * Extracts the title from the document content.
     * Uses the text of the first heading, or defaults to 'Untitled'.
     *
     * @param content The Tiptap JSON content.
     * @returns {string} The extracted title.
     */
    const extractTitle = (content: any): string => {
        if (!content?.content) return 'Untitled';

        // Find first heading
        const firstHeading = content.content.find((node: any) => node.type === 'heading');

        if (firstHeading?.content) {
            // Extract text from heading content
            const title = firstHeading.content.map((node: any) => node.text || '').join('').trim();
            return title || 'Untitled';
        }

        return 'Untitled';
    };

    const editor = useEditor({
        onUpdate: ({ editor }) => {
            if (!currentDocId || isLoadingRef.current) return;

            const content = editor.getJSON();
            const title = extractTitle(content);
            const titleChanged = title !== lastTitleRef.current;
            console.log('[Editor] Content changed, triggering save. DocID:', currentDocId, 'Title:', title);

            // Save to Dexie (Layer 1)
            // Skip workspace sync (IPC call) if title hasn't changed to prevent rapid IO/renders
            saveDocument(currentDocId, content, title, { skipWorkspaceSync: !titleChanged })
                .then(() => {
                    console.log('[Editor] Saved to IndexedDB (Dexie)');
                    // Update the store to keep UI in sync ONLY if title changed (priority update)
                    if (titleChanged) {
                        updateNote(currentDocId, { title, updatedAt: Date.now() });
                        lastTitleRef.current = title;
                    }
                })
                .catch(err => console.error('[Editor] Failed to save to Dexie:', err));

            setSyncStatus('unsaved');

            // Debounced save to file system (Layer 2) & Finalize Workspace Sync
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }

            saveTimerRef.current = setTimeout(async () => {
                setSyncStatus('saving');
                console.log('[Editor] Starting file system save...');
                try {
                    // 1. Write content file
                    const fileContent = JSON.stringify({
                        title: title,
                        content: content
                    });

                    const filePath = await getContentPath(currentDocId);
                    console.log('[Editor] Target File Path:', filePath);

                    await invoke('write_json', {
                        path: filePath,
                        content: fileContent
                    });

                    // 2. Ensure workspace.json and global store are up to date (timestamp update)
                    const now = Date.now();
                    // We call saveDocument again with skipWorkspaceSync=false to force workspace update
                    await saveDocument(currentDocId, content, title, { skipWorkspaceSync: false });
                    updateNote(currentDocId, { title, updatedAt: now });

                    console.log(`[Editor] Document saved to ${filePath} and workspace synced`);
                    setSyncStatus('synced');
                } catch (error) {
                    console.error('[Editor] Failed to save document to file system:', error);
                    setSyncStatus('unsaved');
                }
            }, 2000);

        },
        extensions: [
            StarterKit.configure({
                bulletList: {
                    keepMarks: true,
                    keepAttributes: false,
                },
                orderedList: {
                    keepMarks: true,
                    keepAttributes: false,
                },
                codeBlock: false,
            }),
            Placeholder.configure({
                placeholder: 'Type \'/\' for commands...',
            }),
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            BubbleMenuExtension.configure({}),
            SlashCommand.configure({
                suggestion: {
                    items: getSuggestionItems,
                    render: renderSuggestionItems,
                },
            }),
            AudioNode,
            AINode,
            Link.configure({
                openOnClick: false,
                autolink: true,
            }),
            Image,
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            Underline,
            CodeBlockLowlight.configure({
                lowlight,
            }),
        ],
        content: null,
        editorProps: {
            attributes: {
                class: 'focus:outline-none min-h-[50vh] prose max-w-none dark:prose-invert',
            },
        },
    });

    // Initialize with the most recent document on startup
    useEffect(() => {
        const init = async () => {
            if (!currentDocId) {
                // First, try to get the most recent document from the database
                const recentDocs = await getAllDocuments();

                if (recentDocs.length > 0) {
                    // Open the most recent document
                    const mostRecent = recentDocs[0];
                    window.localStorage.setItem('lastDocUUID', mostRecent.id);
                    setCurrentDoc(mostRecent.id);
                } else {
                    // No documents exist, create a new one
                    const newId = await createDocument();
                    window.localStorage.setItem('lastDocUUID', newId);
                    setCurrentDoc(newId);
                }
            }
        };
        init();
    }, [currentDocId, setCurrentDoc]);

    // Load document when currentDocId changes
    useEffect(() => {
        const loadDoc = async () => {
            if (!editor || !currentDocId) return;

            isLoadingRef.current = true;

            // Update localStorage
            window.localStorage.setItem('lastDocUUID', currentDocId);

            const doc = await loadDocument(currentDocId);
            if (doc?.content) {
                editor.commands.setContent(doc.content);
            } else {
                // Fallback: Try loading from file system if Dexie is empty
                try {
                    const filePath = await getContentPath(currentDocId);
                    const fileContent = await invoke<string>('read_json', { path: filePath });
                    const parsed = JSON.parse(fileContent);
                    if (parsed?.content) {
                        editor.commands.setContent(parsed.content);
                        // Sync back to Dexie for faster loading next time
                        await saveDocument(currentDocId, parsed.content, parsed.title, { isDeleted: parsed.isDeleted });
                        console.log('Document loaded from file system and synced to Dexie');
                    }
                } catch {
                    // New empty document
                    editor.commands.setContent(null);
                    console.log('Starting fresh document');
                }
            }

            setSyncStatus('synced');
            isLoadingRef.current = false;
        };
        loadDoc();
    }, [editor, currentDocId]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
        };
    }, []);

    return (
        <div className="max-w-4xl mx-auto w-full py-12 px-12 relative">
            <div className="absolute top-6 right-6">
                <SyncStatus status={syncStatus} />
            </div>

            {editor && <DragHandle editor={editor} />}
            {editor && (
                <BubbleMenu
                    editor={editor}
                    shouldShow={({ state }) => {
                        // Only show for text selections, not node selections (like audio)
                        const { empty } = state.selection;
                        // Check if it's a NodeSelection using instanceof
                        const isNodeSelection = state.selection instanceof NodeSelection;
                        return !empty && !isNodeSelection;
                    }}
                    className="bg-modal border border-border-base px-1 py-1 rounded-lg shadow-lg flex gap-0.5"
                >
                    <button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        aria-label="Toggle bold"
                        title="Toggle bold"
                        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${editor.isActive('bold')
                            ? 'bg-surface-hover text-ink'
                            : 'text-muted hover:bg-surface-hover'
                            }`}
                    >
                        <span className="font-bold text-sm">B</span>
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        aria-label="Toggle italic"
                        title="Toggle italic"
                        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${editor.isActive('italic')
                            ? 'bg-surface-hover text-ink'
                            : 'text-muted hover:bg-surface-hover'
                            }`}
                    >
                        <span className="italic text-sm">I</span>
                    </button>
                    <div className="w-px h-4 bg-border-base my-auto mx-1" />
                    <button
                        onClick={() => {
                            // Insert AINode at selection
                            const { from, to } = editor.state.selection;
                            const text = editor.state.doc.textBetween(from, to);

                            // Insert AI Node AFTER the selection, so we don't overwrite it
                            // And set the prompt to the selected text
                            editor.chain()
                                .focus()
                                .setTextSelection(to) // Move cursor to end of selection
                                .insertContent({
                                    type: 'aiNode',
                                    attrs: {
                                        initialPrompt: text,
                                        autoTrigger: true
                                    }
                                })
                                .run();
                        }}
                        aria-label="Ask AI"
                        title="Ask AI"
                        className="w-8 h-8 rounded flex items-center justify-center transition-colors text-muted hover:bg-surface-hover"
                    >
                        <Sparkles className="w-4 h-4" />
                    </button>
                </BubbleMenu>
            )}
            <EditorContent editor={editor} />
        </div>
    );
};

export default Editor;
