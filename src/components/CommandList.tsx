import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

export interface CommandListProps {
    /** The list of command items to display. */
    items: any[];
    /** Callback function to execute when a command is selected. */
    command: (item: any) => void;
}

/**
 * Component for rendering the slash command menu.
 * Displays a list of available commands and handles keyboard navigation.
 */
export const CommandList = forwardRef((props: CommandListProps, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
        const item = props.items[index];
        if (item) {
            props.command(item);
        }
    };

    const upHandler = () => {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
    };

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
        selectItem(selectedIndex);
    };

    useEffect(() => {
        setSelectedIndex(0);
    }, [props.items]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'ArrowUp') {
                upHandler();
                return true;
            }

            if (event.key === 'ArrowDown') {
                downHandler();
                return true;
            }

            if (event.key === 'Enter') {
                enterHandler();
                return true;
            }

            return false;
        },
    }));

    if (props.items.length === 0) {
        return null;
    }

    return (
        <div
            id="slash-command-list"
            role="listbox"
            aria-label="Editor commands"
            className="bg-white dark:bg-stone-900 rounded-lg shadow-xl border border-stone-200 dark:border-stone-800 overflow-hidden min-w-72 p-2 max-h-[50vh] overflow-y-auto"
        >
            <div className="text-xs font-medium text-stone-500 mb-2 px-2" aria-hidden="true">Basic blocks</div>
            {props.items.map((item, index) => (
                <button
                    className={`flex items-center gap-3 w-full text-left px-2 py-2 rounded transition-colors ${index === selectedIndex
                        ? 'bg-stone-100 dark:bg-stone-800'
                        : 'hover:bg-stone-50 dark:hover:bg-stone-800/50'
                        }`}
                    key={index}
                    onClick={() => selectItem(index)}
                    role="option"
                    aria-selected={index === selectedIndex}
                    id={`slash-command-item-${index}`}
                >
                    {item.icon && (
                        <div className="flex items-center justify-center w-10 h-10 border border-stone-200 dark:border-stone-700 rounded bg-white dark:bg-stone-800">
                            <item.icon className="w-5 h-5 text-stone-600 dark:text-stone-300" />
                        </div>
                    )}
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-stone-900 dark:text-stone-100">{item.title}</span>
                        {item.description && (
                            <span className="text-xs text-stone-500 dark:text-stone-400">{item.description}</span>
                        )}
                    </div>
                </button>
            ))}
        </div>
    );
});

CommandList.displayName = 'CommandList';

export default CommandList;
