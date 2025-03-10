interface ActionMenuProps {
    onRegenerate: () => void;
    onCopyJson: () => void;
    onShowJson: () => void;
    onClearMemory: () => void;
    onSaveToExpedition: () => void;
    isSaveDisabled: boolean;
    loading: boolean;
    expnum: number;
}

export default function ActionMenu({
    onRegenerate,
    onCopyJson,
    onShowJson,
    onClearMemory,
    onSaveToExpedition,
    isSaveDisabled,
    expnum
}: ActionMenuProps) {
    return (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-50 bg-white p-2 rounded-lg shadow-lg border border-gray-200">
            <button
                onClick={onRegenerate}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
                Regenerate
            </button>
            <button
                onClick={onCopyJson}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
            >
                Copy JSON
            </button>
            <button
                onClick={onShowJson}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
            >
                Show JSON
            </button>
            <button
                onClick={onClearMemory}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
                Clear Memory
            </button>
            <button
                onClick={onSaveToExpedition}
                disabled={isSaveDisabled}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                Save Current Dungeon ({expnum})
            </button>
        </div>
    );
} 