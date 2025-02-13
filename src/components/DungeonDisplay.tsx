"use client";

import { useState, useRef, useEffect } from "react";
import {
    DungeonGenerator,
    Room,
    RoomCategory,
    RoomConfig,
    Door,
} from "../lib/dungeonGenerator";

const CELL_SIZE = 30;
const GRID_SIZE = 100;
const COORD_SIZE = 20;

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

// Default room configurations that can be customized
const defaultRoomConfigs: RoomConfig[] = [
    {
        id: "A",
        doors: ["N", "S"],
        weight: 0.33,
    },
    {
        id: "B",
        doors: ["N", "S", "E", "W"],
        weight: 0.34,
    },
    {
        id: "C",
        doors: ["E", "W"],
        weight: 0.33,
    },
];

export default function DungeonDisplay() {
    const [dungeon, setDungeon] = useState<Room[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    // Configuration state
    const [totalRooms, setTotalRooms] = useState(20);
    const [offshoots, setOffshoots] = useState([{ count: 3, depth: 2 }]);
    const [staticRooms, setStaticRooms] = useState<
        { index: number; type: RoomConfig["id"] }[]
    >([{ index: 3, type: "A" }]);
    const [roomConfigs, setRoomConfigs] =
        useState<RoomConfig[]>(defaultRoomConfigs);
    const [shortcuts, setShortcuts] = useState(2);
    const [zoomLevel, setZoomLevel] = useState(1);

    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const [fastestPathSteps, setFastestPathSteps] = useState<number | null>(null);

    const addRoomConfig = () => {
        setRoomConfigs([
            ...roomConfigs,
            {
                id: `CUSTOM_${roomConfigs.length}`,
                doors: [],
                weight: 0.1,
            },
        ]);
    };

    const updateRoomConfig = (
        index: number,
        field: keyof RoomConfig,
        value: any
    ) => {
        const newConfigs = [...roomConfigs];
        if (field === "doors") {
            // Handle door toggles
            const door = value as Door;
            const doors = new Set(newConfigs[index].doors);
            if (doors.has(door)) {
                doors.delete(door);
            } else {
                doors.add(door);
            }
            newConfigs[index] = { ...newConfigs[index], doors: Array.from(doors) };
        } else {
            newConfigs[index] = { ...newConfigs[index], [field]: value };
        }
        setRoomConfigs(newConfigs);
    };

    const removeRoomConfig = (index: number) => {
        setRoomConfigs(roomConfigs.filter((_, i) => i !== index));
    };

    const generateDungeon = () => {
        const generator = new DungeonGenerator({
            totalRooms,
            offshoots,
            staticRooms,
            roomConfigs,
            shortcuts,
        });
        let { rooms, fastestPathSteps } = generator.generate();
        setDungeon(rooms);
        setFastestPathSteps(fastestPathSteps);
    };

    const centerView = () => {
        if (containerRef.current) {
            const centerX = (GRID_SIZE * CELL_SIZE) / 2;
            const centerY = (GRID_SIZE * CELL_SIZE) / 2;
            const containerWidth = containerRef.current.clientWidth;
            const containerHeight = containerRef.current.clientHeight;

            containerRef.current.scrollTo({
                left: centerX - containerWidth / 2,
                top: centerY - containerHeight / 2,
                behavior: "smooth",
            });
        }
    };

    const addOffshoot = () => {
        setOffshoots([...offshoots, { count: 1, depth: 1 }]);
    };

    const updateOffshoot = (
        index: number,
        field: "count" | "depth",
        value: number
    ) => {
        const newOffshoots = [...offshoots];
        newOffshoots[index][field] = value;
        setOffshoots(newOffshoots);
    };

    const removeOffshoot = (index: number) => {
        setOffshoots(offshoots.filter((_, i) => i !== index));
    };

    const addStaticRoom = () => {
        setStaticRooms([...staticRooms, { index: 0, type: roomConfigs[0].id }]);
    };

    const updateStaticRoom = (
        index: number,
        field: keyof (typeof staticRooms)[0],
        value: any
    ) => {
        const newStaticRooms = [...staticRooms];
        if (field === "type") {
            if (roomConfigs.some((config) => config.id === value)) {
                newStaticRooms[index] = { ...newStaticRooms[index], [field]: value };
            }
        } else {
            newStaticRooms[index] = { ...newStaticRooms[index], [field]: value };
        }
        setStaticRooms(newStaticRooms);
    };

    const removeStaticRoom = (index: number) => {
        setStaticRooms(staticRooms.filter((_, i) => i !== index));
    };

    const renderCoordinates = () => {
        return (
            <>
                {/* Y-axis coordinates */}
                <div className="absolute right-full top-0 bottom-0 w-[20px] flex flex-col">
                    {Array.from({ length: GRID_SIZE }, (_, i) => (
                        <div
                            key={i}
                            style={{ height: CELL_SIZE }}
                            className="flex items-center justify-end pr-1 text-xs text-gray-500"
                        >
                            {i}
                        </div>
                    ))}
                </div>
                {/* X-axis coordinates */}
                <div className="absolute bottom-full left-0 right-0 h-[20px] flex">
                    {Array.from({ length: GRID_SIZE }, (_, i) => (
                        <div
                            key={i}
                            style={{ width: CELL_SIZE }}
                            className="flex items-end justify-center pb-1 text-xs text-gray-500"
                        >
                            {i}
                        </div>
                    ))}
                </div>
            </>
        );
    };

    const renderLegend = () => {
        return (
            <div className="mt-4 p-4 bg-white rounded border border-gray-300">
                <h3 className="font-bold mb-2">Legend</h3>
                <div className="grid grid-cols-2 gap-4">
                    {Object.entries(categoryColors).map(([category, color]) => (
                        <div key={category} className="flex items-center gap-2">
                            <div
                                className="w-6 h-6 border border-black"
                                style={{ backgroundColor: color }}
                            />
                            <span>{categoryDescriptions[category as RoomCategory]}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const zoomIn = () => {
        setZoomLevel((prev) => Math.min(prev + 0.1, 2)); // Max zoom level of 2
    };

    const zoomOut = () => {
        setZoomLevel((prev) => Math.max(prev - 0.1, 0.5)); // Min zoom level of 0.5
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setStartX(e.pageX - (containerRef.current?.offsetLeft || 0));
        setScrollLeft(containerRef.current?.scrollLeft || 0);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - (containerRef.current?.offsetLeft || 0);
        const walk = (x - startX) * 2; // Adjust the drag speed
        if (containerRef.current) {
            containerRef.current.scrollLeft = scrollLeft - walk;
        }
    };

    useEffect(() => {
        generateDungeon();
        centerView();
    }, []);

    return (
        <div className="p-4 text-black">
            <div className="mb-6 space-y-4">
                <div className="space-y-2">
                    <h3 className="font-bold">Basic Configuration</h3>
                    <div className="flex items-center gap-2">
                        <label>Total Rooms:</label>
                        <input
                            type="number"
                            value={totalRooms}
                            onChange={(e) =>
                                setTotalRooms(Math.max(1, parseInt(e.target.value) || 1))
                            }
                            className="border p-1 rounded w-20"
                            min="1"
                        />
                        <label className="ml-4">Shortcuts:</label>
                        <input
                            type="number"
                            value={shortcuts}
                            onChange={(e) =>
                                setShortcuts(Math.max(0, parseInt(e.target.value) || 0))
                            }
                            className="border p-1 rounded w-20"
                            min="0"
                        />
                    </div>
                </div>

                <div className="space-y-2 ">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold">Offshoots</h3>
                        <button
                            onClick={addOffshoot}
                            className="px-2 py-1 bg-blue-500 text-white rounded text-sm"
                        >
                            Add Offshoot
                        </button>
                    </div>
                    {offshoots.map((offshoot, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-2 bg-gray-50 p-2 rounded"
                        >
                            <label>Count:</label>
                            <input
                                type="number"
                                value={offshoot.count}
                                onChange={(e) =>
                                    updateOffshoot(
                                        i,
                                        "count",
                                        Math.max(1, parseInt(e.target.value) || 1)
                                    )
                                }
                                className="border p-1 rounded w-16"
                                min="1"
                            />
                            <label>Depth:</label>
                            <input
                                type="number"
                                value={offshoot.depth}
                                onChange={(e) =>
                                    updateOffshoot(
                                        i,
                                        "depth",
                                        Math.max(1, parseInt(e.target.value) || 1)
                                    )
                                }
                                className="border p-1 rounded w-16"
                                min="1"
                            />
                            <button
                                onClick={() => removeOffshoot(i)}
                                className="px-2 py-1 bg-red-500 text-white rounded text-sm"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold">Static Rooms</h3>
                        <button
                            onClick={addStaticRoom}
                            className="px-2 py-1 bg-blue-500 text-white rounded text-sm"
                        >
                            Add Static Room
                        </button>
                    </div>
                    {staticRooms.map((room, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-2 bg-gray-50 p-2 rounded"
                        >
                            <label>Index:</label>
                            <input
                                type="number"
                                value={room.index}
                                onChange={(e) =>
                                    updateStaticRoom(
                                        i,
                                        "index",
                                        Math.max(0, parseInt(e.target.value) || 0)
                                    )
                                }
                                className="border p-1 rounded w-16"
                                min="0"
                            />
                            <label>Type:</label>
                            <select
                                value={room.type}
                                onChange={(e) => updateStaticRoom(i, "type", e.target.value)}
                                className="border p-1 rounded"
                            >
                                {roomConfigs.map((config) => (
                                    <option key={config.id} value={config.id}>
                                        Room {config.id}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={() => removeStaticRoom(i)}
                                className="px-2 py-1 bg-red-500 text-white rounded text-sm"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold">Room Types</h3>
                        <button
                            onClick={addRoomConfig}
                            className="px-2 py-1 bg-blue-500 text-white rounded text-sm"
                        >
                            Add Room Type
                        </button>
                    </div>
                    {roomConfigs.map((config, i) => (
                        <div key={i} className="flex flex-col gap-2 bg-gray-50 p-2 rounded">
                            <div className="flex items-center gap-2">
                                <label>ID:</label>
                                <input
                                    type="text"
                                    value={config.id}
                                    onChange={(e) => updateRoomConfig(i, "id", e.target.value)}
                                    className="border p-1 rounded w-32"
                                />
                                <label>Weight:</label>
                                <input
                                    type="number"
                                    value={config.weight}
                                    onChange={(e) =>
                                        updateRoomConfig(
                                            i,
                                            "weight",
                                            parseFloat(e.target.value) || 0
                                        )
                                    }
                                    className="border p-1 rounded w-20"
                                    step="0.01"
                                    min="0"
                                    max="1"
                                />
                                <button
                                    onClick={() => removeRoomConfig(i)}
                                    className="px-2 py-1 bg-red-500 text-white rounded text-sm ml-auto"
                                >
                                    Remove
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <label>Doors:</label>
                                {(["N", "S", "E", "W"] as const).map((door) => (
                                    <label key={door} className="flex items-center gap-1">
                                        <input
                                            type="checkbox"
                                            checked={config.doors.includes(door)}
                                            onChange={() => updateRoomConfig(i, "doors", door)}
                                        />
                                        {door}
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex gap-2 mb-4">
                <button
                    onClick={generateDungeon}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Generate Dungeon
                </button>
                <button
                    onClick={centerView}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                    Center View
                </button>
            </div>

            {fastestPathSteps !== null && (
                <div className="mt-4">
                    <h4 className="font-bold">Fastest Path Steps:</h4>
                    <p>{fastestPathSteps === -1 ? "No path found." : fastestPathSteps}</p>
                </div>
            )}

            <div className="zoom-controls">
                <button onClick={zoomIn}>Zoom In</button>
                <button onClick={zoomOut}>Zoom Out</button>
            </div>

            <div
                ref={containerRef}
                className="border border-gray-300 overflow-auto relative"
                style={{
                    width: Math.min(800, window.innerWidth - 32),
                    height: Math.min(800, window.innerHeight - 200),
                    marginLeft: COORD_SIZE,
                    marginTop: COORD_SIZE,
                }}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
            >
                <div
                    style={{
                        width: GRID_SIZE * CELL_SIZE,
                        height: GRID_SIZE * CELL_SIZE,
                        position: "relative",
                        backgroundColor: "#f0f0f0",
                        backgroundImage:
                            "linear-gradient(#ccc 1px, transparent 1px), linear-gradient(90deg, #ccc 1px, transparent 1px)",
                        backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: "top left",
                    }}
                >
                    {renderCoordinates()}
                    {dungeon.map((room, i) => (
                        <div
                            key={i}
                            style={{
                                position: "absolute",
                                left: room.x * CELL_SIZE,
                                top: room.y * CELL_SIZE,
                                width: CELL_SIZE - 2,
                                height: CELL_SIZE - 2,
                                backgroundColor: categoryColors[room.category],
                                border: "1px solid black",
                                zIndex: 1,
                            }}
                            title={`Type: ${room.type}, Category: ${room.category}, Depth: ${room.depth}, Position: (${room.x},${room.y})`}
                        >
                            {room.doors.map((door) => (
                                <div
                                    key={`${door.direction}-${door.destinationRoomId}`}
                                    style={{
                                        position: "absolute",
                                        ...(door.direction === "N" && {
                                            top: 0,
                                            left: "40%",
                                            width: "20%",
                                            height: "2px",
                                        }),
                                        ...(door.direction === "S" && {
                                            bottom: 0,
                                            left: "40%",
                                            width: "20%",
                                            height: "2px",
                                        }),
                                        ...(door.direction === "E" && {
                                            right: 0,
                                            top: "40%",
                                            width: "2px",
                                            height: "20%",
                                        }),
                                        ...(door.direction === "W" && {
                                            left: 0,
                                            top: "40%",
                                            width: "2px",
                                            height: "20%",
                                        }),
                                        backgroundColor: door.destinationRoomId
                                            ? door.isShortcut
                                                ? "#7ef623"
                                                : "white"
                                            : "red",
                                        zIndex: 2,
                                    }}
                                    title={
                                        door.destinationRoomId
                                            ? `${door.isShortcut ? "Shortcut " : ""
                                            }Connects to room ${door.destinationRoomId} (${door.destinationDoor
                                            })`
                                            : "Unconnected door"
                                    }
                                />
                            ))}
                            <div className="text-[8px] text-center text-white font-bold flex flex-col">
                                <span>{room.type}</span>
                                <span className="text-[6px]">
                                    {room.id.split("-")[0].slice(0, 5)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {renderLegend()}
        </div>
    );
}
