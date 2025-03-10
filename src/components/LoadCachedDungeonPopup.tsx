import React, { useState, useEffect } from "react";

interface CachedExpedition {
    id: string;
    timestamp: number;
    name?: string;
}

interface LoadCachedDungeonPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onLoad: (id: string) => void;
    onSave: (name?: string) => void;
    onDelete: (id: string) => void;
    cachedExpeditions: CachedExpedition[];
    currentExpeditionNumber: number;
}

export default function LoadCachedDungeonPopup({
    isOpen,
    onClose,
    onLoad,
    onSave,
    onDelete,
    cachedExpeditions,
    currentExpeditionNumber,
}: LoadCachedDungeonPopupProps) {
    const [selectedExpeditionId, setSelectedExpeditionId] = useState<
        string | null
    >(null);
    const [customName, setCustomName] = useState<string>("");
    const [showSaveForm, setShowSaveForm] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setSelectedExpeditionId(null);
            setCustomName("");
            setShowSaveForm(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(customName || undefined);
        setCustomName("");
        setShowSaveForm(false);
    };

    const handleLoad = () => {
        if (selectedExpeditionId) {
            onLoad(selectedExpeditionId);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    const handleDelete = (id: string) => {
        setPendingDeleteId(id);
    };

    const confirmDelete = () => {
        if (pendingDeleteId) {
            onDelete(pendingDeleteId);
            setPendingDeleteId(null);
        }
    };

    const cancelDelete = () => {
        setPendingDeleteId(null);
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 style={{ color: "black" }} className="text-xl font-bold">
                        Cached Dungeons
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <div style={{ color: "black" }} className="mb-6">
                    {!showSaveForm ? (
                        <div className="flex justify-between mb-4">
                            <h3 style={{ color: "black" }} className="text-lg font-semibold">Saved Dungeons</h3>
                            <button
                                onClick={() => setShowSaveForm(true)}
                                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                            >
                                Save Current
                            </button>
                        </div>
                    ) : (
                        <div className="bg-gray-50 p-4 rounded-lg mb-4">
                            <h3 className="text-lg font-semibold mb-2">
                                Save Current Dungeon
                            </h3>
                            <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Name (optional)
                                </label>
                                <input
                                    type="text"
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                    placeholder={`Expedition ${currentExpeditionNumber} - ${new Date().toLocaleString()}`}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setShowSaveForm(false)}
                                    className="px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    )}

                    {cachedExpeditions.length > 0 ? (
                        <div className="max-h-64 overflow-y-auto">
                            {/* Debug info */}
                            {process.env.NODE_ENV === "development" && (
                                <div style={{ color: "black" }} className="p-2 mb-2 bg-gray-100 text-xs">
                                    <p>Found {cachedExpeditions.length} cached expeditions</p>
                                </div>
                            )}

                            {cachedExpeditions.map((expedition) => {
                                let roomCount = 0;
                                try {
                                    const cachedData = localStorage.getItem(
                                        `cached-expedition-${expedition.id}`
                                    );
                                    if (cachedData) {
                                        const parsedData = JSON.parse(cachedData);
                                        roomCount = Array.isArray(parsedData)
                                            ? parsedData.length
                                            : 0;
                                    }
                                } catch (error) {
                                    console.error("Error parsing cached expedition data:", error);
                                }

                                return (
                                    <div
                                        style={{ color: "black" }}
                                        key={expedition.id}
                                        className={`p-3 mb-2 rounded-lg border cursor-pointer transition-colors ${selectedExpeditionId === expedition.id
                                            ? "bg-blue-50 border-blue-300"
                                            : "bg-white border-gray-200 hover:bg-gray-50"
                                            }`}
                                        onClick={() => setSelectedExpeditionId(expedition.id)}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-medium">
                                                    {expedition.name || `Cached Dungeon ${expedition.id}`}
                                                </h4>
                                                <div className="text-sm text-gray-500">
                                                    <p>{formatDate(expedition.timestamp)}</p>
                                                    <p>{roomCount} rooms</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(expedition.id);
                                                }}
                                                className="text-red-500 hover:text-red-700 text-sm"
                                                aria-label="Delete"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-gray-100 p-4 rounded-lg mb-4">
                            <p className="text-center text-gray-500 italic">
                                No cached dungeons available
                            </p>
                            <p className="text-center text-gray-400 text-sm mt-2">
                                Save a dungeon to see it here
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleLoad}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        disabled={!selectedExpeditionId}
                    >
                        Load Selected
                    </button>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            {pendingDeleteId && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4">Confirm Delete</h3>
                        <p className="mb-6">
                            Are you sure you want to delete this cached dungeon? This action
                            cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={cancelDelete}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
