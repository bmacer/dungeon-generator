interface BasicConfigurationProps {
    expnum: number;
    totalRooms: number;
    shortcuts: number;
    defaultVariations: number;
    onExpnumChange: (value: number) => void;
    onTotalRoomsChange: (value: number) => void;
    onShortcutsChange: (value: number) => void;
    onDefaultVariationsChange: (value: number) => void;
}

export default function BasicConfiguration({
    expnum,
    totalRooms,
    shortcuts,
    defaultVariations,
    onExpnumChange,
    onTotalRoomsChange,
    onShortcutsChange,
    onDefaultVariationsChange,
}: BasicConfigurationProps) {
    return (
        <div
            style={{ top: "376px" }}
            className="fixed left-4 z-50 bg-white p-4 rounded-lg shadow-lg border border-gray-200"
        >
            <h4 className="font-bold text-sm mb-2">Basic Configuration</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
                <label>Expedition Number:</label>
                <input
                    type="number"
                    value={expnum}
                    onChange={(e) =>
                        onExpnumChange(Math.max(1, parseInt(e.target.value) || 100))
                    }
                    className="border p-1 rounded w-20"
                    min="1"
                />
                <label>Total Rooms:</label>
                <input
                    type="number"
                    value={totalRooms}
                    onChange={(e) =>
                        onTotalRoomsChange(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="border p-1 rounded w-20"
                    min="1"
                />
                <label>Shortcuts:</label>
                <input
                    type="number"
                    value={shortcuts}
                    onChange={(e) =>
                        onShortcutsChange(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="border p-1 rounded w-20"
                    min="0"
                />
                <label>Default Variations:</label>
                <input
                    type="number"
                    value={defaultVariations}
                    onChange={(e) =>
                        onDefaultVariationsChange(
                            Math.max(1, parseInt(e.target.value) || 1)
                        )
                    }
                    className="border p-1 rounded w-20"
                    min="1"
                />
            </div>
        </div>
    );
}
