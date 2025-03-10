import { RoomCategory } from "../lib/dungeonGenerator";

const categoryColors: Record<RoomCategory, string> = {
    START: "#4CAF50",
    BOSS: "#f44336",
    REGULAR_PATH: "#2196F3",
    STATIC: "#9C27B0",
    OFFSHOOT: "#FF9800",
    GNELLEN: "#db8080",
    SHORTCUT: "#673AB7",
};

const categoryDescriptions: Record<RoomCategory, string> = {
    START: "Starting Room",
    BOSS: "Boss Room",
    REGULAR_PATH: "Main Path Room",
    STATIC: "Static Room",
    OFFSHOOT: "Offshoot Room",
    GNELLEN: "Gnellen Room",
    SHORTCUT: "Shortcut Room",
};

export default function Legend() {
    return (
        <div className="fixed top-4 left-4 z-50 bg-white p-4 rounded-lg shadow-lg border border-gray-200">
            <h3 className="font-bold mb-2">Legend</h3>
            <div className="grid grid-cols-1 gap-2">
                {Object.entries(categoryColors).map(([category, color]) => (
                    <div key={category} className="flex items-center gap-2">
                        <div
                            className="w-4 h-4"
                            style={{
                                backgroundColor: color,
                                border: '1px solid rgba(0, 0, 0, 0.2)',
                                boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.1)'
                            }}
                        />
                        <span className="text-sm text-black">{categoryDescriptions[category as RoomCategory]}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export { categoryColors, categoryDescriptions }; 