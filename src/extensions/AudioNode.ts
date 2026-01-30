import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { AudioCapsule } from '../components/AudioCapsule';

/**
 * Options for the AudioNode extension.
 */
export interface AudioNodeOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        audioNode: {
            setAudioNode: (attrs: { src: string }) => ReturnType;
        };
    }
}

/**
 * Tiptap extension for handling audio content.
 * Renders an `audio-node` element using the AudioCapsule component.
 */
export const AudioNode = Node.create<AudioNodeOptions>({
    name: 'audioNode',

    group: 'block',

    atom: true,

    addAttributes() {
        return {
            src: {
                default: null,
            },
            filePath: {
                default: null,
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'audio-node',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['audio-node', mergeAttributes(HTMLAttributes)];
    },

    addNodeView() {
        return ReactNodeViewRenderer(AudioCapsule);
    },

    addCommands() {
        return {
            setAudioNode:
                (attrs) =>
                    ({ commands }) => {
                        return commands.insertContent({
                            type: this.name,
                            attrs,
                        });
                    },
        };
    },
});
