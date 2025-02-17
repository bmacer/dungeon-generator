"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    DungeonGenerator,
    Room,
    RoomCategory,
    RoomConfig,
    Door,
} from "../lib/dungeonGenerator";
import dynamic from "next/dynamic";

const CELL_SIZE = 40;
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
        id: "RoomTemplateA",
        doors: ["N", "S"],
        weight: 0.33,
    },
    {
        id: "RoomTemplateB",
        doors: ["N", "S", "E", "W"],
        weight: 0.34,
    },
    {
        id: "RoomTemplateC",
        doors: ["E", "W"],
        weight: 0.33,
    },
];

const defaultStaticRoomConfigs: RoomConfig[] = [
    {
        id: "StaticRoomTemplateX",
        doors: ["N", "S"],
        weight: 0,
        category: "STATIC",
        isSpecial: true,
    },
    {
        id: "StaticRoomTemplateY",
        doors: ["N", "S", "E", "W"],
        weight: 0,
        category: "STATIC",
        isSpecial: true,
    },
    {
        id: "StaticRoomTemplateZ",
        doors: ["E", "W"],
        weight: 0,
        category: "STATIC",
        isSpecial: true,
    },
];

const defaultStaticRooms = [
    { index: 5, type: "StaticRoomTemplateX" },
    { index: 9, type: "StaticRoomTemplateY" },
];

const defaultOffshoots = [{ count: 1, depth: 1 }];

// Add type for room config update value
type RoomConfigUpdateValue = string | number | Door;

function DungeonDisplay() {
    const [dungeon, setDungeon] = useState<Room[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    // Configuration state with localStorage persistence
    const [totalRooms, setTotalRooms] = useState(() => {
        const saved = localStorage.getItem("totalRooms");
        return saved ? parseInt(saved) : 12;
    });
    const [offshoots, setOffshoots] = useState(() => {
        const saved = localStorage.getItem("offshoots");
        return saved ? JSON.parse(saved) : defaultOffshoots;
    });
    const [staticRooms, setStaticRooms] = useState(() => {
        const saved = localStorage.getItem("staticRooms");
        return saved ? JSON.parse(saved) : defaultStaticRooms;
    });
    const [roomConfigs, setRoomConfigs] = useState(() => {
        const saved = localStorage.getItem("roomConfigs");
        return saved ? JSON.parse(saved) : defaultRoomConfigs;
    });
    const [shortcuts, setShortcuts] = useState(() => {
        const saved = localStorage.getItem("shortcuts");
        return saved ? parseInt(saved) : 2;
    });
    const [staticRoomConfigs, setStaticRoomConfigs] = useState(() => {
        const saved = localStorage.getItem("staticRoomConfigs");
        return saved ? JSON.parse(saved) : defaultStaticRoomConfigs;
    });
    const [expnum, setExpnum] = useState(() => {
        const saved = localStorage.getItem("expnum");
        return saved ? parseInt(saved) : 100;
    });

    const generateDungeon = useCallback(() => {
        const generator = new DungeonGenerator({
            expnum,
            totalRooms,
            offshoots,
            staticRooms,
            roomConfigs,
            staticRoomConfigs,
            shortcuts,
        });
        const { rooms: generatedRooms, fastestPathSteps: newFastestPathSteps } =
            generator.generate();
        setDungeon(generatedRooms);
        setFastestPathSteps(newFastestPathSteps);
    }, [
        expnum,
        totalRooms,
        offshoots,
        staticRooms,
        roomConfigs,
        staticRoomConfigs,
        shortcuts,
    ]);

    const centerView = useCallback(() => {
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
    }, []);

    // Save to localStorage when values change
    useEffect(() => {
        localStorage.setItem("totalRooms", totalRooms.toString());
    }, [totalRooms]);

    useEffect(() => {
        localStorage.setItem("offshoots", JSON.stringify(offshoots));
    }, [offshoots]);

    useEffect(() => {
        localStorage.setItem("staticRooms", JSON.stringify(staticRooms));
    }, [staticRooms]);

    useEffect(() => {
        localStorage.setItem("roomConfigs", JSON.stringify(roomConfigs));
    }, [roomConfigs]);

    useEffect(() => {
        localStorage.setItem("shortcuts", shortcuts.toString());
    }, [shortcuts]);

    useEffect(() => {
        localStorage.setItem(
            "staticRoomConfigs",
            JSON.stringify(staticRoomConfigs)
        );
    }, [staticRoomConfigs]);

    useEffect(() => {
        localStorage.setItem("expnum", expnum.toString());
    }, [expnum]);

    const clearMemory = useCallback(() => {
        localStorage.removeItem("totalRooms");
        localStorage.removeItem("offshoots");
        localStorage.removeItem("staticRooms");
        localStorage.removeItem("roomConfigs");
        localStorage.removeItem("shortcuts");
        localStorage.removeItem("staticRoomConfigs");
        localStorage.removeItem("expnum");

        setTotalRooms(12);
        setOffshoots(defaultOffshoots);
        setStaticRooms(defaultStaticRooms);
        setRoomConfigs(defaultRoomConfigs);
        setShortcuts(2);
        setStaticRoomConfigs(defaultStaticRoomConfigs);
        setExpnum(100);
    }, []);

    const [zoomLevel, setZoomLevel] = useState(1);

    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const [fastestPathSteps, setFastestPathSteps] = useState<number | null>(null);

    // Replace the static width calculation with state
    const [containerWidth, setContainerWidth] = useState(800);
    const [containerHeight, setContainerHeight] = useState(800);

    const [showJsonPopup, setShowJsonPopup] = useState(false); // State for popup visibility

    // Add new state for JSON view mode
    const [jsonViewMode, setJsonViewMode] = useState<"full" | "simplified">(
        "full"
    );

    const [showToast, setShowToast] = useState(false);

    // Add useEffect to handle window-dependent calculations
    useEffect(() => {
        setContainerWidth(Math.min(800, window.innerWidth - 32));
        setContainerHeight(Math.min(800, window.innerHeight - 200));
        generateDungeon(); // Generate once on initial load
        centerView();
    }, [generateDungeon, centerView]);

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
        value: RoomConfigUpdateValue
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
        setRoomConfigs(
            roomConfigs.filter((_: RoomConfig, i: number) => i !== index)
        );
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
        setOffshoots(
            offshoots.filter(
                (_: { count: number; depth: number }, i: number) => i !== index
            )
        );
    };

    const addStaticRoom = () => {
        setStaticRooms([
            ...staticRooms,
            { index: totalRooms, type: staticRoomConfigs[0].id },
        ]);
    };

    const updateStaticRoom = (
        index: number,
        field: keyof (typeof staticRooms)[0],
        value: string | number
    ) => {
        const newStaticRooms = [...staticRooms];
        if (field === "type") {
            if (staticRoomConfigs.some((config: RoomConfig) => config.id === value)) {
                newStaticRooms[index] = {
                    ...newStaticRooms[index],
                    [field]: value as string,
                };
            }
        } else {
            newStaticRooms[index] = {
                ...newStaticRooms[index],
                [field]: value as number,
            };
        }
        setStaticRooms(newStaticRooms);
    };

    const removeStaticRoom = (index: number) => {
        setStaticRooms(
            staticRooms.filter(
                (_: { index: number; type: string }, i: number) => i !== index
            )
        );
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

    // Update function to simplify JSON
    const getSimplifiedDungeon = useCallback(() => {
        return dungeon.map(({ doors, id, templateId, depth, expnum }) => ({
            id,
            templateId,
            depth,
            expnum,
            doors: doors
                .filter((door) => door.destinationRoomId) // Only include doors with a destination
                .map(
                    ({ direction, destinationRoomId, isShortcut, destinationDoor }) => ({
                        direction,
                        destinationRoomId,
                        destinationDoor,
                        isShortcut,
                    })
                ),
        }));
    }, [dungeon]);

    // Update handleExportJson
    const handleExportJson = () => {
        const data = jsonViewMode === "full" ? dungeon : getSimplifiedDungeon();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "dungeon.json";
        a.click();
        URL.revokeObjectURL(url);
    };

    const copyJsonToClipboard = () => {
        const simplifiedJson = JSON.stringify(getSimplifiedDungeon(), null, 2);
        navigator.clipboard.writeText(simplifiedJson);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
    };

    // Function to toggle JSON popup visibility
    const toggleJsonPopup = () => {
        setShowJsonPopup((prev) => !prev);
    };

    // Add functions to manage static room configs
    const addStaticRoomConfig = () => {
        setStaticRoomConfigs([
            ...staticRoomConfigs,
            {
                id: `StaticRoomTemplate${String.fromCharCode(
                    65 + staticRoomConfigs.length
                )}`,
                doors: [],
                weight: 0,
                category: "STATIC",
                isSpecial: true,
            },
        ]);
    };

    const updateStaticRoomConfig = (
        index: number,
        field: keyof RoomConfig,
        value: RoomConfigUpdateValue
    ) => {
        const newConfigs = [...staticRoomConfigs];
        if (field === "doors") {
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
        setStaticRoomConfigs(newConfigs);
    };

    const removeStaticRoomConfig = (index: number) => {
        setStaticRoomConfigs(
            staticRoomConfigs.filter((_: RoomConfig, i: number) => i !== index)
        );
    };

    return (
        <div className="p-4 text-black" style={{ overflowX: "hidden" }}>
            <div className="zoom-controls">
                <button onClick={zoomIn}>Zoom In</button>
                <button onClick={zoomOut}>Zoom Out</button>
            </div>

            <div
                ref={containerRef}
                className="border border-gray-300 overflow-auto relative mb-8"
                style={{
                    width: containerWidth,
                    height: containerHeight,
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
                            title={`Template: ${room.templateId}, Category: ${room.category}, Depth: ${room.depth}, Position: (${room.x},${room.y})`}
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
                                <span>
                                    {["START", "GNELLEN", "BOSS"].includes(room.category)
                                        ? room.templateId[0]
                                        : room.category === "STATIC"
                                            ? room.templateId.replace("StaticRoomTemplate", "")
                                            : room.templateId.slice(-1)}
                                    {` (${room.depth})`}
                                </span>
                                <span className="text-[6px]">
                                    {room.id.split("-")[0].slice(0, 5)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {fastestPathSteps !== null && (
                <div className="mb-4">
                    <h4 className="font-bold">Fastest Path Steps:</h4>
                    <p>{fastestPathSteps === -1 ? "No path found." : fastestPathSteps}</p>
                </div>
            )}

            {renderLegend()}

            <div className="mb-6 space-y-4">
                <div className="space-y-2">
                    <h3 className="font-bold">Basic Configuration</h3>
                    <div className="flex items-center gap-2">
                        <label>Expedition Number:</label>
                        <input
                            type="number"
                            value={expnum}
                            onChange={(e) =>
                                setExpnum(Math.max(1, parseInt(e.target.value) || 100))
                            }
                            className="border p-1 rounded w-20"
                            min="1"
                        />
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
                    {offshoots.map(
                        (offshoot: { count: number; depth: number }, i: number) => (
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
                        )
                    )}
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
                    {staticRooms.map(
                        (room: { index: number; type: string }, i: number) => (
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
                                    {staticRoomConfigs.map((config: RoomConfig) => (
                                        <option key={config.id} value={config.id}>
                                            {config.id}
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
                        )
                    )}
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold">Static Room Types</h3>
                        <button
                            onClick={addStaticRoomConfig}
                            className="px-2 py-1 bg-blue-500 text-white rounded text-sm"
                        >
                            Add Static Room Type
                        </button>
                    </div>
                    {staticRoomConfigs.map((config: RoomConfig, i: number) => (
                        <div key={i} className="flex flex-col gap-2 bg-gray-50 p-2 rounded">
                            <div className="flex items-center gap-2">
                                <label>ID:</label>
                                <input
                                    type="text"
                                    value={config.id}
                                    onChange={(e) =>
                                        updateStaticRoomConfig(i, "id", e.target.value)
                                    }
                                    className="border p-1 rounded w-64"
                                />
                                <button
                                    onClick={() => removeStaticRoomConfig(i)}
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
                                            onChange={() => updateStaticRoomConfig(i, "doors", door)}
                                        />
                                        {door}
                                    </label>
                                ))}
                            </div>
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
                    {roomConfigs.map((config: RoomConfig, i: number) => (
                        <div key={i} className="flex flex-col gap-2 bg-gray-50 p-2 rounded">
                            <div className="flex items-center gap-2">
                                <label>ID:</label>
                                <input
                                    type="text"
                                    value={config.id}
                                    onChange={(e) => updateRoomConfig(i, "id", e.target.value)}
                                    className="border p-1 rounded w-64"
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

            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                <button
                    onClick={centerView}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                    Center View
                </button>
                <button
                    onClick={generateDungeon}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Regenerate
                </button>
                <button
                    onClick={copyJsonToClipboard}
                    className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                    Copy JSON
                </button>
                <button
                    onClick={toggleJsonPopup}
                    className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                >
                    Show JSON
                </button>
                <button
                    onClick={clearMemory}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                    Clear Memory
                </button>
            </div>

            {showToast && (
                <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in-out">
                    Simplified JSON Copied
                </div>
            )}

            {/* JSON Popup */}
            {showJsonPopup && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div
                        className="bg-white p-4 rounded shadow-lg"
                        style={{ maxHeight: "80vh", overflowY: "auto" }}
                    >
                        <div className="flex justify-between mb-2">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setJsonViewMode("full")}
                                    className={`px-2 py-1 rounded ${jsonViewMode === "full"
                                            ? "bg-blue-500 text-white"
                                            : "bg-gray-200"
                                        }`}
                                >
                                    Full
                                </button>
                                <button
                                    onClick={() => setJsonViewMode("simplified")}
                                    className={`px-2 py-1 rounded ${jsonViewMode === "simplified"
                                            ? "bg-blue-500 text-white"
                                            : "bg-gray-200"
                                        }`}
                                >
                                    Simplified
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleExportJson}
                                    className="px-2 py-1 bg-green-500 text-white rounded"
                                >
                                    Export
                                </button>
                                <button
                                    onClick={copyJsonToClipboard}
                                    className="px-2 py-1 bg-yellow-500 text-white rounded"
                                >
                                    Copy
                                </button>
                                <button
                                    onClick={toggleJsonPopup}
                                    className="px-2 py-1 bg-red-500 text-white rounded"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                        <h3 className="font-bold mb-2">Dungeon JSON</h3>
                        <pre className="whitespace-pre-wrap">
                            {JSON.stringify(
                                jsonViewMode === "full" ? dungeon : getSimplifiedDungeon(),
                                null,
                                2
                            )}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}

// Only export the dynamic version
export default dynamic(() => Promise.resolve(DungeonDisplay), {
    ssr: false,
});
