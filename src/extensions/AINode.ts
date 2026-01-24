import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { AIBlock } from '../components/AIBlock';

export const AINode = Node.create({
    name: 'aiNode',

    group: 'block',

    atom: true,

    parseHTML() {
        return [
            {
                tag: 'ai-node',
            },
        ];
    },

    addAttributes() {
        return {
            initialPrompt: {
                default: null,
            },
            autoTrigger: {
                default: false,
            },
        };
    },

    renderHTML({ HTMLAttributes }) {
        return ['ai-node', mergeAttributes(HTMLAttributes)];
    },

    addNodeView() {
        return ReactNodeViewRenderer(AIBlock);
    },

    addInputRules() {
        return [
            new InputRule({
                find: /^\/ai\s$/,
                handler: ({ range, chain }) => {
                    chain()
                        .focus()
                        .deleteRange(range)
                        .insertContent({ type: this.name })
                        .run();
                },
            }),
        ];
    },
});
