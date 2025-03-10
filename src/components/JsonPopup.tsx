import React from 'react';

interface JsonPopupProps {
    isOpen: boolean;
    onClose: () => void;
    jsonViewMode: "full" | "simplified";
    onViewModeChange: (mode: "full" | "simplified") => void;
    jsonContent: string;
}

export default function JsonPopup({ isOpen, onClose, jsonViewMode, onViewModeChange, jsonContent }: JsonPopupProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div
                className="bg-white p-4 rounded shadow-lg relative"
                style={{ maxHeight: "80vh", overflowY: "auto", minWidth: "50vw" }}
            >
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                    title="Close"
                >
                    <span className="text-gray-500 text-xl">×</span>
                </button>
                <div className="flex gap-2 mb-4 mt-2">
                    <button
                        onClick={() => onViewModeChange("full")}
                        className={`px-3 py-1.5 rounded ${jsonViewMode === "full"
                                ? "bg-blue-500 text-white"
                                : "bg-gray-200"
                            }`}
                    >
                        Full
                    </button>
                    <button
                        onClick={() => onViewModeChange("simplified")}
                        className={`px-3 py-1.5 rounded ${jsonViewMode === "simplified"
                                ? "bg-blue-500 text-white"
                                : "bg-gray-200"
                            }`}
                    >
                        Simplified
                    </button>
                </div>
                <div className="mt-4">
                    <pre>{jsonContent}</pre>
                </div>
            </div>
        </div>
    );
} 