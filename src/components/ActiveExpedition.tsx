interface ActiveExpeditionProps {
    currentExpeditionNumber: number | null;
    expeditionNumberInput: string;
    loading: boolean;
    error: string | null;
    expeditionNumbers: number[];
    apiMessage: { type: "success" | "error"; text: string } | null;
    apiKey: string;
    onSetExpeditionNumber: () => void;
    onDeleteExpedition: (expNum: number) => void;
    onExpeditionInputChange: (value: string) => void;
    onApiKeyChange: (value: string) => void;
    onApiMessageClose: () => void;
}

export default function ActiveExpedition({
    currentExpeditionNumber,
    expeditionNumberInput,
    loading,
    error,
    expeditionNumbers,
    apiMessage,
    apiKey,
    onSetExpeditionNumber,
    onDeleteExpedition,
    onExpeditionInputChange,
    onApiKeyChange,
    onApiMessageClose,
}: ActiveExpeditionProps) {
    return (
        <div className="expedition-controls" style={{ marginBottom: "20px" }}>
            {apiMessage && (
                <div
                    className={`api-message ${apiMessage.type} fixed top-20 right-4 z-50`}
                    style={{
                        padding: "8px",
                        backgroundColor:
                            apiMessage.type === "success" ? "#d4edda" : "#f8d7da",
                        color: apiMessage.type === "success" ? "#155724" : "#721c24",
                        borderRadius: "4px",
                        maxWidth: "300px",
                    }}
                >
                    {apiMessage.text}
                    <button
                        onClick={onApiMessageClose}
                        style={{
                            marginLeft: "10px",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}

            <div className="fixed top-4 right-4 z-50 bg-white p-4 rounded-lg shadow-lg border border-gray-200 w-[400px]">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium text-black">Current Expedition:</span>
                        <div>
                            <span className="text-black font-semibold">
                                {currentExpeditionNumber !== null
                                    ? currentExpeditionNumber
                                    : "Loading..."}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="font-medium text-sm text-black">
                            Update Live Expedition to:
                        </label>
                        <input
                            type="number"
                            value={expeditionNumberInput}
                            onChange={(e) => onExpeditionInputChange(e.target.value)}
                            className="w-24 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                        />
                    </div>

                    <button
                        onClick={onSetExpeditionNumber}
                        disabled={loading || expeditionNumberInput === ""}
                        className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Set Expedition #{expeditionNumberInput}
                    </button>

                    <div className="mt-4 border-t pt-4">
                        <div className="font-medium text-black mb-2">
                            Available Expeditions:
                        </div>
                        <div className="max-h-48 overflow-y-auto pr-2">
                            <div className="grid grid-cols-2 gap-2">
                                {expeditionNumbers.length > 0 ? (
                                    expeditionNumbers.map((expNum) => (
                                        <div key={expNum} className="flex items-center gap-1">
                                            <span className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm text-black flex-grow">
                                                Expedition #{expNum}
                                            </span>
                                            <button
                                                onClick={() => onDeleteExpedition(expNum)}
                                                disabled={loading || expNum === 100}
                                                className="p-1 text-red-500 hover:text-red-700"
                                                title="Delete expedition"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-gray-500 text-sm col-span-2">
                                        No expeditions available
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 border-t pt-4">
                        <div className="flex items-center gap-2 mb-2">
                            <label className="font-medium text-sm text-black">API Key:</label>
                            <input
                                type="text"
                                value={apiKey}
                                onChange={(e) => onApiKeyChange(e.target.value)}
                                className="flex-1 px-3 py-2 border rounded-md text-black text-sm"
                                placeholder="Enter API key for POST/DELETE requests"
                            />
                        </div>
                        <div className="text-xs text-gray-500">
                            Required for saving and deleting expeditions
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm mt-2">Error: {error}</div>
                    )}

                    {loading && (
                        <div className="text-blue-600 text-sm mt-2">Loading...</div>
                    )}
                </div>
            </div>
        </div>
    );
}
