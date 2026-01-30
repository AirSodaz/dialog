import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Editor } from '@tiptap/react';
import { GripVertical } from 'lucide-react';

interface DragHandleProps {
    editor: Editor;
}

/**
 * Component for dragging and dropping blocks in the editor.
 * Renders a handle next to the currently hovered block.
 */
export const DragHandle = ({ editor }: DragHandleProps) => {
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
    const [activeBlock, setActiveBlock] = useState<HTMLElement | null>(null);
    const handleRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Tiptap editor.options.element can be just Element, but we need HTMLElement properties
        const editorElement = editor.options.element as HTMLElement;

        const handleMouseMove = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // Allow interaction with the handle itself without flickering
            if (handleRef.current && handleRef.current.contains(target)) {
                return;
            }

            // Find the closest block-level element within the prose content
            const block = target.closest('.prose > *') as HTMLElement;

            // Check if we are hovering a valid block INSIDE this editor
            if (block && editorElement.contains(block)) {
                const rect = block.getBoundingClientRect();

                // Using createPortal to body, so we use absolute viewport coordinates + scroll
                setPosition({
                    top: rect.top + window.scrollY,
                    left: rect.left + window.scrollX - 24, // 24px left of the block
                });
                setActiveBlock(block);
            } else {
                // If moved mouse to somewhere else (not handle, not block), hide it
                if (handleRef.current && !handleRef.current.contains(target)) {
                    setPosition(null);
                }
            }
        };

        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [editor]);

    if (!position) return null;

    // Use z-30 to be below Sidebar (z-40) but above Editor (default)
    return createPortal(
        <div
            ref={handleRef}
            className="absolute z-30 flex items-center justify-center w-6 h-6 rounded hover:bg-stone-200 dark:hover:bg-stone-700 cursor-grab transition-opacity duration-200"
            style={{
                top: position.top,
                left: position.left,
                opacity: 1,
            }}
            onClick={() => {
                if (activeBlock) {
                    // Logic to select block?
                    console.log('Clicked block', activeBlock);
                }
            }}
        >
            <GripVertical className="w-4 h-4 text-stone-400" />
        </div>,
        document.body
    );
};
