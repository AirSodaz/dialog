import { Extension, Editor, Range } from '@tiptap/core';
import Suggestion, { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance, Props } from 'tippy.js';
import CommandList from '../components/CommandList';
import {
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    CheckSquare,
    TextQuote,
    Code,
    Minus,
    Mic,
    Table as TableIcon,
    Image as ImageIcon,
    Sparkles,
} from 'lucide-react';

/**
 * Tiptap extension for slash commands.
 * Provides a popup menu with suggestions when the user types '/'.
 */
export const SlashCommand = Extension.create({
    name: 'slashCommand',

    addOptions() {
        return {
            suggestion: {
                char: '/',
                command: ({ editor, range, props }: { editor: Editor; range: Range; props: any }) => {
                    props.command({ editor, range });
                },
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ];
    },
});

interface CommandProps {
    editor: Editor;
    range: Range;
}

/**
 * List of available slash commands.
 * Each item includes the title, description, icon, and the command function to execute.
 */
const SUGGESTION_ITEMS = [
    {
        title: 'Heading 1',
        description: 'Big section heading.',
        searchTerms: ['title', 'big', 'large'],
        icon: Heading1,
        command: ({ editor, range }: CommandProps) => {
            editor
                .chain()
                .focus()
                .deleteRange(range)
                .setNode('heading', { level: 1 })
                .run();
        },
    },
    {
        title: 'Heading 2',
        description: 'Medium section heading.',
        searchTerms: ['subtitle', 'medium'],
        icon: Heading2,
        command: ({ editor, range }: CommandProps) => {
            editor
                .chain()
                .focus()
                .deleteRange(range)
                .setNode('heading', { level: 2 })
                .run();
        },
    },
    {
        title: 'Heading 3',
        description: 'Small section heading.',
        searchTerms: ['subtitle', 'small'],
        icon: Heading3,
        command: ({ editor, range }: CommandProps) => {
            editor
                .chain()
                .focus()
                .deleteRange(range)
                .setNode('heading', { level: 3 })
                .run();
        },
    },
    {
        title: 'Bullet List',
        description: 'Create a simple bulleted list.',
        searchTerms: ['unordered', 'point'],
        icon: List,
        command: ({ editor, range }: CommandProps) => {
            editor.chain().focus().deleteRange(range).toggleBulletList().run();
        },
    },
    {
        title: 'Numbered List',
        description: 'Create a list with numbering.',
        searchTerms: ['ordered'],
        icon: ListOrdered,
        command: ({ editor, range }: CommandProps) => {
            editor.chain().focus().deleteRange(range).toggleOrderedList().run();
        },
    },
    {
        title: 'To-do List',
        description: 'Track tasks with a to-do list.',
        searchTerms: ['todo', 'task', 'check', 'checkbox'],
        icon: CheckSquare,
        command: ({ editor, range }: CommandProps) => {
            editor.chain().focus().deleteRange(range).toggleTaskList().run();
        },
    },
    {
        title: 'Quote',
        description: 'Capture a quote.',
        searchTerms: ['blockquote'],
        icon: TextQuote,
        command: ({ editor, range }: CommandProps) => {
            editor
                .chain()
                .focus()
                .deleteRange(range)
                .setNode('blockquote')
                .run();
        },
    },
    {
        title: 'Code',
        description: 'Capture a code snippet.',
        searchTerms: ['codeblock'],
        icon: Code,
        command: ({ editor, range }: CommandProps) => {
            editor.chain().focus().deleteRange(range).setCodeBlock().run();
        },
    },
    {
        title: 'Divider',
        description: 'Visually divide content.',
        searchTerms: ['line', 'hr'],
        icon: Minus,
        command: ({ editor, range }: CommandProps) => {
            editor.chain().focus().deleteRange(range).setHorizontalRule().run();
        },
    },
    {
        title: 'Audio',
        description: 'Insert a voice memo or audio clip.',
        searchTerms: ['voice', 'sound', 'recording', 'memo'],
        icon: Mic,
        command: ({ editor, range }: CommandProps) => {
            editor
                .chain()
                .focus()
                .deleteRange(range)
                .insertContent({
                    type: 'audioNode',
                    attrs: { src: '' }, // Mock empty src for now
                })
                .run();
        },
    },
    {
        title: 'Table',
        description: 'Insert a table.',
        searchTerms: ['table', 'grid', 'spreadsheet'],
        icon: TableIcon,
        command: ({ editor, range }: CommandProps) => {
            editor
                .chain()
                .focus()
                .deleteRange(range)
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run();
        },
    },
    {
        title: 'Image',
        description: 'Insert an image.',
        searchTerms: ['image', 'picture', 'photo'],
        icon: ImageIcon,
        command: ({ editor, range }: CommandProps) => {
            const url = window.prompt('Enter image URL');
            if (url) {
                editor
                    .chain()
                    .focus()
                    .deleteRange(range)
                    .setImage({ src: url })
                    .run();
            }
        },
    },
    {
        title: 'Ask AI',
        description: 'Generate or edit text with AI.',
        searchTerms: ['ai', 'gpt', 'generate', 'ask'],
        icon: Sparkles,
        command: ({ editor, range }: CommandProps) => {
            editor
                .chain()
                .focus()
                .deleteRange(range)
                .insertContent({ type: 'aiNode' })
                .run();
        },
    },
];

/**
 * Filters the available commands based on the user's query.
 *
 * @param options The filter options.
 * @param options.query The search query string.
 * @returns {Array} The filtered list of suggestion items.
 */
export const getSuggestionItems = ({ query }: { query: string }) => {
    return SUGGESTION_ITEMS.filter((item) => {
        if (typeof query === 'string' && query.length > 0) {
            const search = query.toLowerCase();
            return (
                item.title.toLowerCase().includes(search) ||
                item.description.toLowerCase().includes(search) ||
                (item.searchTerms && item.searchTerms.some((term: string) => term.includes(search)))
            );
        }
        return true;
    });
};

/**
 * Creates the renderer configuration for the suggestion list (Tippy.js + React).
 *
 * @returns {object} The suggestion renderer configuration.
 */
export const renderSuggestionItems = () => {
    let component: ReactRenderer;
    let popup: Instance<Props>[];

    return {
        onStart: (props: SuggestionProps) => {
            component = new ReactRenderer(CommandList, {
                props,
                editor: props.editor,
            });

            if (!props.clientRect) {
                return;
            }

            // @ts-ignore
            popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
            });
        },

        onUpdate: (props: SuggestionProps) => {
            component.updateProps(props);

            if (!props.clientRect) {
                return;
            }

            if (popup && popup[0]) {
                popup[0].setProps({
                    getReferenceClientRect: props.clientRect as any,
                });
            }
        },

        onKeyDown: (props: SuggestionKeyDownProps) => {
            if (props.event.key === 'Escape') {
                if (popup && popup[0]) {
                    popup[0].hide();
                }
                return true;
            }

            return (component.ref as any)?.onKeyDown(props);
        },

        onExit: () => {
            if (popup && popup[0]) {
                popup[0].destroy();
            }
            if (component) {
                component.destroy();
            }
        },
    };
};
