"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { DungeonGenerator } from "@/lib/dungeonGenerator";

type DoorDirection = "north" | "south" | "east" | "west";

interface Door {
    x: number;
    y: number;
    direction: DoorDirection;
}

interface Room {
    id: string;
    type: "1x3" | "2x2" | "1x1";
    width: number;
    height: number;
    x: number;
    y: number;
    cells: { x: number; y: number }[];
    doors: Door[];
}

interface RoomWithColor extends Room {
    color: string;
}

const CENTER_POINT = 50;

interface StaticRoom {
    width: number;
    height: number;
    stepsFromPrevious: number; // steps from start or previous static room
}

interface RoomSizes {
    startRoom: { width: number; height: number };
    gnellenStartRoom: { width: number; height: number };
    staticRooms: StaticRoom[];
    bossRoom: { width: number; height: number };
    randomRooms: Array<{ width: number; height: number }>;
}

export default function DungeonDisplay() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [playerPos, setPlayerPos] = useState({
        x: CENTER_POINT,
        y: CENTER_POINT,
    });
    const [rooms, setRooms] = useState<RoomWithColor[]>([]);
    const [scale, setScale] = useState(13);
    const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
    const [roomCount, setRoomCount] = useState(20);
    const [offshoots, setOffshoots] = useState({ count: 2, depth: 3 });
    const [hasMiddleRoom, setHasMiddleRoom] = useState(false);
    const [roomSizes, setRoomSizes] = useState<RoomSizes>({
        startRoom: { width: 2, height: 2 },
        gnellenStartRoom: { width: 2, height: 2 },
        staticRooms: [
            { width: 3, height: 3, stepsFromPrevious: 5 }, // First static room, 5 steps from start
            { width: 3, height: 3, stepsFromPrevious: 7 }, // Second static room, 7 steps from first static room
        ],
        bossRoom: { width: 3, height: 3 },
        randomRooms: [
            { width: 2, height: 2 },
            { width: 1, height: 3 },
            { width: 3, height: 1 },
            { width: 3, height: 3 },
        ],
    });

    const roomTypeColors = useMemo(
        () => ({
            start: "#32CD32", // Lime green
            gnellen: "#4169E1", // Royal blue
            static: "#4B0082", // Deep purple
            boss: "#FF0000", // Red
            path: "#228B22", // Forest Green (base for random shades)
            offshoot: "#FFD700", // Gold (base for random shades)
        }),
        []
    );

    const generateRandomGreenShade = () => {
        const r = Math.floor(Math.random() * 100); // 0-100 for darker greens
        const g = Math.floor(Math.random() * 100 + 155); // 155-255 for strong greens
        const b = Math.floor(Math.random() * 100); // 0-100 for darker greens
        return `rgb(${r},${g},${b})`;
    };

    const generateRandomYellowShade = () => {
        const r = Math.floor(Math.random() * 55 + 200); // 200-255 for yellows
        const g = Math.floor(Math.random() * 55 + 200); // 200-255 for yellows
        const b = Math.floor(Math.random() * 100); // 0-100 for darker yellows
        return `rgb(${r},${g},${b})`;
    };

    const generateDungeon = useCallback(() => {
        const generator = new DungeonGenerator();
        generator.createShortestPath(roomCount, {
            ...roomSizes,
            staticRoomPositions: roomSizes.staticRooms.map((room, index) => ({
                width: room.width,
                height: room.height,
                stepsFromPrevious: room.stepsFromPrevious,
                index,
            })),
            randomRooms: roomSizes.randomRooms,
        });
        const roomsWithOffshoots = generator.createOffshoots(
            offshoots.count,
            offshoots.depth,
            roomSizes.randomRooms
        );
        setRooms(
            roomsWithOffshoots.map((room) => ({
                ...room,
                color:
                    room.id === "start"
                        ? roomTypeColors.start
                        : room.id === "gnellen-start"
                            ? roomTypeColors.gnellen
                            : room.id.startsWith("static-room")
                                ? roomTypeColors.static
                                : room.id === "boss-room"
                                    ? roomTypeColors.boss
                                    : room.id.startsWith("offshoot")
                                        ? generateRandomYellowShade()
                                        : generateRandomGreenShade(),
            }))
        );
        setPlayerPos({ x: CENTER_POINT, y: CENTER_POINT });
        setViewOffset({ x: 0, y: 0 });
    }, [roomCount, roomSizes, roomTypeColors, offshoots]);

    useEffect(() => {
        generateDungeon();
    }, []);

    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePos, setLastMousePos] = useState<{
        x: number;
        y: number;
    } | null>(null);

    // Handle rendering and movement
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || rooms.length === 0) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const drawGame = () => {
            const baseOffsetX = canvas.width / 2 - CENTER_POINT * scale;
            const baseOffsetY = canvas.height / 2 - CENTER_POINT * scale;
            const offsetX = baseOffsetX + viewOffset.x;
            const offsetY = baseOffsetY + viewOffset.y;

            // Clear canvas
            ctx.fillStyle = "#1a1a1a";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw rooms
            rooms.forEach((room) => {
                ctx.fillStyle = room.color;
                ctx.fillRect(
                    room.x * scale + offsetX,
                    room.y * scale + offsetY,
                    room.width * scale,
                    room.height * scale
                );

                // Draw room labels
                ctx.font = "10px Arial";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                const centerX = (room.x + room.width / 2) * scale + offsetX;
                const centerY = (room.y + room.height / 2) * scale + offsetY;

                if (room.id === "middle-room") {
                    ctx.fillStyle = "#FFD700"; // Gold color for text
                    ctx.font = "12px Arial";
                    ctx.fillText("⌂", centerX, centerY - 6); // House symbol
                    ctx.fillText("REST", centerX, centerY + 6);
                } else if (room.id === "boss-room") {
                    ctx.fillStyle = "#FFD700"; // Gold color for text
                    ctx.font = "12px Arial";
                    ctx.fillText("☠", centerX, centerY - 6); // Skull symbol
                    ctx.fillText("BOSS", centerX, centerY + 6);
                } else if (room.id.startsWith("offshoot")) {
                    ctx.fillStyle = "#000000";
                    ctx.fillText("O", centerX, centerY);
                }

                // Draw doors
                ctx.fillStyle = "#8B4513"; // Saddle brown color
                room.doors.forEach((door: { x: number; y: number }) => {
                    ctx.fillRect(
                        door.x * scale + offsetX,
                        door.y * scale + offsetY,
                        scale / 2,
                        scale / 2
                    );
                });
            });

            // Draw player
            ctx.fillStyle = "#ff0000";
            ctx.beginPath();
            ctx.arc(
                playerPos.x * scale + offsetX + scale / 2,
                playerPos.y * scale + offsetY + scale / 2,
                scale / 3,
                0,
                Math.PI * 2
            );
            ctx.fill();
        };

        const handleMouseDown = (e: MouseEvent) => {
            setIsDragging(true);
            setLastMousePos({ x: e.clientX, y: e.clientY });
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !lastMousePos) return;

            const deltaX = e.clientX - lastMousePos.x;
            const deltaY = e.clientY - lastMousePos.y;

            setViewOffset((prev) => ({
                x: prev.x + deltaX,
                y: prev.y + deltaY,
            }));

            setLastMousePos({ x: e.clientX, y: e.clientY });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setLastMousePos(null);
        };

        const handleMouseLeave = () => {
            setIsDragging(false);
            setLastMousePos(null);
        };

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault(); // Prevent default scrolling

            // Adjust zoom sensitivity
            const zoomSensitivity = 0.1;
            const zoomDelta = e.deltaY > 0 ? -zoomSensitivity : zoomSensitivity;

            // Calculate new scale, with min and max limits
            const newScale = Math.max(1, Math.min(40, scale + zoomDelta * scale));

            setScale(newScale);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
                e.preventDefault();
                const currentRoom = rooms.find((room) =>
                    room.cells.some(
                        (cell: { x: number; y: number }) =>
                            cell.x === playerPos.x && cell.y === playerPos.y
                    )
                );

                if (!currentRoom) return;

                const canMove = (newX: number, newY: number) => {
                    const targetRoom = rooms.find((room) =>
                        room.cells.some((cell) => cell.x === newX && cell.y === newY)
                    );

                    if (!targetRoom) {
                        console.log("No target room found at", { newX, newY });
                        return false;
                    }

                    // If moving within the same room, always allow it
                    if (currentRoom === targetRoom) {
                        return true;
                    }

                    // Find matching doors between rooms
                    const oppositeDirections: Record<DoorDirection, DoorDirection> = {
                        north: "south",
                        south: "north",
                        east: "west",
                        west: "east",
                    };

                    // Check if there's a matching pair of doors
                    return currentRoom.doors.some((currentDoor) => {
                        return targetRoom.doors.some((targetDoor) => {
                            // For vertical movement (north/south), doors should be at same x but adjacent y
                            // For horizontal movement (east/west), doors should be at same y but adjacent x
                            const isVerticalMovement =
                                currentDoor.direction === "north" ||
                                currentDoor.direction === "south";

                            const samePosition = isVerticalMovement
                                ? currentDoor.x === targetDoor.x &&
                                Math.abs(currentDoor.y - targetDoor.y) === 1
                                : currentDoor.y === targetDoor.y &&
                                Math.abs(currentDoor.x - targetDoor.x) === 1;

                            // Doors must have opposite directions
                            const oppositeDirection =
                                oppositeDirections[currentDoor.direction] ===
                                targetDoor.direction;

                            // The door we're moving from must be at our current position
                            const isAtCurrentPosition =
                                (currentDoor.x === playerPos.x &&
                                    currentDoor.y === playerPos.y) ||
                                (targetDoor.x === playerPos.x && targetDoor.y === playerPos.y);

                            // The door we're moving to must be at our target position
                            const isAtTargetPosition =
                                (currentDoor.x === newX && currentDoor.y === newY) ||
                                (targetDoor.x === newX && targetDoor.y === newY);

                            return (
                                samePosition &&
                                oppositeDirection &&
                                (isAtCurrentPosition || isAtTargetPosition)
                            );
                        });
                    });
                };

                const newPos = { ...playerPos };

                switch (e.key) {
                    case "ArrowUp":
                        if (canMove(playerPos.x, playerPos.y - 1)) {
                            newPos.y--;
                        }
                        break;
                    case "ArrowDown":
                        if (canMove(playerPos.x, playerPos.y + 1)) {
                            newPos.y++;
                        }
                        break;
                    case "ArrowLeft":
                        if (canMove(playerPos.x - 1, playerPos.y)) {
                            newPos.x--;
                        }
                        break;
                    case "ArrowRight":
                        if (canMove(playerPos.x + 1, playerPos.y)) {
                            newPos.x++;
                        }
                        break;
                }

                setPlayerPos(newPos);
            }

            // Scroll view with WASD
            const SCROLL_AMOUNT = 50;
            switch (e.key.toLowerCase()) {
                case "w":
                    setViewOffset((prev) => ({ ...prev, y: prev.y + SCROLL_AMOUNT }));
                    break;
                case "s":
                    setViewOffset((prev) => ({ ...prev, y: prev.y - SCROLL_AMOUNT }));
                    break;
                case "a":
                    setViewOffset((prev) => ({ ...prev, x: prev.x + SCROLL_AMOUNT }));
                    break;
                case "d":
                    setViewOffset((prev) => ({ ...prev, x: prev.x - SCROLL_AMOUNT }));
                    break;
            }
        };

        canvas.addEventListener("mousedown", handleMouseDown);
        canvas.addEventListener("mousemove", handleMouseMove);
        canvas.addEventListener("mouseup", handleMouseUp);
        canvas.addEventListener("mouseleave", handleMouseLeave);
        canvas.addEventListener("wheel", handleWheel, { passive: false });
        window.addEventListener("keydown", handleKeyDown);
        drawGame();

        return () => {
            canvas.removeEventListener("mousedown", handleMouseDown);
            canvas.removeEventListener("mousemove", handleMouseMove);
            canvas.removeEventListener("mouseup", handleMouseUp);
            canvas.removeEventListener("mouseleave", handleMouseLeave);
            canvas.removeEventListener("wheel", handleWheel);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [playerPos, rooms, scale, viewOffset, isDragging, lastMousePos]);

    const addRandomRoom = () => {
        setRoomSizes((prev) => ({
            ...prev,
            randomRooms: [...prev.randomRooms, { width: 2, height: 2 }],
        }));
    };

    const removeRandomRoom = (index: number) => {
        setRoomSizes((prev) => ({
            ...prev,
            randomRooms: prev.randomRooms.filter((_, i) => i !== index),
        }));
    };

    const [currentRoomType, setCurrentRoomType] = useState<string>("start");
    const [showConfig, setShowConfig] = useState(false);
    const [currentPath, setCurrentPath] = useState<string[]>([]);

    useEffect(() => {
        const room = rooms.find((room) =>
            room.cells.some(
                (cell) => cell.x === playerPos.x && cell.y === playerPos.y
            )
        );
        if (room) {
            let type = "path";
            if (room.id === "start") type = "start";
            else if (room.id === "gnellen-start") type = "gnellen";
            else if (room.id.startsWith("static-room")) type = "static";
            else if (room.id === "boss-room") type = "boss";
            else if (room.id.startsWith("offshoot")) type = "offshoot";
            setCurrentRoomType(type);

            const currentId = room.id;
            setCurrentPath([currentId]);
        }
    }, [playerPos, rooms]);

    return (
        <div className="flex flex-col items-center gap-4 p-6 bg-gray-900 min-h-screen relative">
            {/* Config Panel */}
            <div className="w-full max-w-4xl">
                <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="mb-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                    {showConfig ? "Hide" : "Show"} Configuration
                    <span className="text-sm">{showConfig ? "▼" : "▶"}</span>
                </button>

                {showConfig && (
                    <div className="bg-gray-800 rounded-lg p-6 mb-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white">
                                Dungeon Configuration
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Basic Settings */}
                            <div className="bg-gray-700 rounded-lg p-4">
                                <h3 className="text-lg font-semibold text-white mb-4">
                                    Basic Settings
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm text-gray-300">
                                            Room Count: {roomCount}
                                        </label>
                                        <input
                                            type="range"
                                            min="5"
                                            max="30"
                                            value={roomCount}
                                            onChange={(e) => setRoomCount(parseInt(e.target.value))}
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm text-gray-300">
                                            Offshoots: {offshoots.count}
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="10"
                                            value={offshoots.count}
                                            onChange={(e) =>
                                                setOffshoots((prev) => ({
                                                    ...prev,
                                                    count: Number(e.target.value),
                                                }))
                                            }
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm text-gray-300">
                                            Depth: {offshoots.depth}
                                        </label>
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            value={offshoots.depth}
                                            onChange={(e) =>
                                                setOffshoots((prev) => ({
                                                    ...prev,
                                                    depth: Number(e.target.value),
                                                }))
                                            }
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={hasMiddleRoom}
                                            onChange={(e) => setHasMiddleRoom(e.target.checked)}
                                            className="mr-2"
                                        />
                                        <label className="text-sm text-gray-300">
                                            Has Middle Room
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Special Rooms */}
                            <div className="bg-gray-700 rounded-lg p-4">
                                <h3 className="text-lg font-semibold text-white mb-4">
                                    Special Rooms
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Start and Gnellen rooms */}
                                    <div className="space-y-2">
                                        <label className="text-sm text-gray-300 block">
                                            Start Room
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                max="6"
                                                value={roomSizes.startRoom.width}
                                                onChange={(e) =>
                                                    setRoomSizes((prev) => ({
                                                        ...prev,
                                                        startRoom: {
                                                            ...prev.startRoom,
                                                            width: Number(e.target.value),
                                                        },
                                                    }))
                                                }
                                                className="w-16 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white"
                                            />
                                            <span className="text-gray-300">×</span>
                                            <input
                                                type="number"
                                                min="1"
                                                max="6"
                                                value={roomSizes.startRoom.height}
                                                onChange={(e) =>
                                                    setRoomSizes((prev) => ({
                                                        ...prev,
                                                        startRoom: {
                                                            ...prev.startRoom,
                                                            height: Number(e.target.value),
                                                        },
                                                    }))
                                                }
                                                className="w-16 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm text-gray-300 block">
                                            Gnellen Room
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                max="6"
                                                value={roomSizes.gnellenStartRoom.width}
                                                onChange={(e) =>
                                                    setRoomSizes((prev) => ({
                                                        ...prev,
                                                        gnellenStartRoom: {
                                                            ...prev.gnellenStartRoom,
                                                            width: Number(e.target.value),
                                                        },
                                                    }))
                                                }
                                                className="w-16 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white"
                                            />
                                            <span className="text-gray-300">×</span>
                                            <input
                                                type="number"
                                                min="1"
                                                max="6"
                                                value={roomSizes.gnellenStartRoom.height}
                                                onChange={(e) =>
                                                    setRoomSizes((prev) => ({
                                                        ...prev,
                                                        gnellenStartRoom: {
                                                            ...prev.gnellenStartRoom,
                                                            height: Number(e.target.value),
                                                        },
                                                    }))
                                                }
                                                className="w-16 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white"
                                            />
                                        </div>
                                    </div>

                                    {/* Static Rooms */}
                                    <div className="col-span-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-sm text-gray-300">
                                                Static Rooms
                                            </label>
                                            <button
                                                onClick={() =>
                                                    setRoomSizes((prev) => ({
                                                        ...prev,
                                                        staticRooms: [
                                                            ...prev.staticRooms,
                                                            { width: 3, height: 3, stepsFromPrevious: 5 },
                                                        ],
                                                    }))
                                                }
                                                className="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                                            >
                                                Add Static Room
                                            </button>
                                        </div>
                                        <div className="space-y-4">
                                            {roomSizes.staticRooms.map((room, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center gap-4 bg-gray-600 p-2 rounded"
                                                >
                                                    <div className="flex gap-2 items-center">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="6"
                                                            value={room.width}
                                                            onChange={(e) =>
                                                                setRoomSizes((prev) => ({
                                                                    ...prev,
                                                                    staticRooms: prev.staticRooms.map((r, i) =>
                                                                        i === index
                                                                            ? {
                                                                                ...r,
                                                                                width: Number(e.target.value),
                                                                            }
                                                                            : r
                                                                    ),
                                                                }))
                                                            }
                                                            className="w-16 px-2 py-1 bg-gray-500 border border-gray-400 rounded text-white"
                                                        />
                                                        <span className="text-gray-300">×</span>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="6"
                                                            value={room.height}
                                                            onChange={(e) =>
                                                                setRoomSizes((prev) => ({
                                                                    ...prev,
                                                                    staticRooms: prev.staticRooms.map((r, i) =>
                                                                        i === index
                                                                            ? {
                                                                                ...r,
                                                                                height: Number(e.target.value),
                                                                            }
                                                                            : r
                                                                    ),
                                                                }))
                                                            }
                                                            className="w-16 px-2 py-1 bg-gray-500 border border-gray-400 rounded text-white"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-sm text-gray-300">
                                                            Steps:{" "}
                                                            {index === 0 ? "(from start)" : "(from previous)"}
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max={20}
                                                            value={room.stepsFromPrevious}
                                                            onChange={(e) =>
                                                                setRoomSizes((prev) => ({
                                                                    ...prev,
                                                                    staticRooms: prev.staticRooms.map((r, i) =>
                                                                        i === index
                                                                            ? {
                                                                                ...r,
                                                                                stepsFromPrevious: Number(
                                                                                    e.target.value
                                                                                ),
                                                                            }
                                                                            : r
                                                                    ),
                                                                }))
                                                            }
                                                            className="w-full px-2 py-1 bg-gray-500 border border-gray-400 rounded text-white"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() =>
                                                            setRoomSizes((prev) => ({
                                                                ...prev,
                                                                staticRooms: prev.staticRooms.filter(
                                                                    (_, i) => i !== index
                                                                ),
                                                            }))
                                                        }
                                                        className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Boss Room */}
                                    <div className="space-y-2">
                                        <label className="text-sm text-gray-300 block">
                                            Boss Room
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                max="6"
                                                value={roomSizes.bossRoom.width}
                                                onChange={(e) =>
                                                    setRoomSizes((prev) => ({
                                                        ...prev,
                                                        bossRoom: {
                                                            ...prev.bossRoom,
                                                            width: Number(e.target.value),
                                                        },
                                                    }))
                                                }
                                                className="w-16 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white"
                                            />
                                            <span className="text-gray-300">×</span>
                                            <input
                                                type="number"
                                                min="1"
                                                max="6"
                                                value={roomSizes.bossRoom.height}
                                                onChange={(e) =>
                                                    setRoomSizes((prev) => ({
                                                        ...prev,
                                                        bossRoom: {
                                                            ...prev.bossRoom,
                                                            height: Number(e.target.value),
                                                        },
                                                    }))
                                                }
                                                className="w-16 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Random Room Templates */}
                            <div className="bg-gray-700 rounded-lg p-4 col-span-2">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-white">
                                        Random Room Templates
                                    </h3>
                                    <button
                                        onClick={addRandomRoom}
                                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                                    >
                                        Add Template
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {roomSizes.randomRooms.map((room, index) => (
                                        <div
                                            key={index}
                                            className="relative bg-gray-600 p-4 rounded-lg"
                                        >
                                            <button
                                                onClick={() => removeRandomRoom(index)}
                                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center justify-center"
                                            >
                                                ×
                                            </button>
                                            <label className="text-sm text-gray-300 block mb-2">
                                                Template {index + 1}
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="4"
                                                    value={room.width}
                                                    onChange={(e) =>
                                                        setRoomSizes((prev) => ({
                                                            ...prev,
                                                            randomRooms: prev.randomRooms.map((r, i) =>
                                                                i === index
                                                                    ? { ...r, width: Number(e.target.value) }
                                                                    : r
                                                            ),
                                                        }))
                                                    }
                                                    className="w-16 px-2 py-1 bg-gray-500 border border-gray-400 rounded text-white"
                                                />
                                                <span className="text-gray-300">×</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="4"
                                                    value={room.height}
                                                    onChange={(e) =>
                                                        setRoomSizes((prev) => ({
                                                            ...prev,
                                                            randomRooms: prev.randomRooms.map((r, i) =>
                                                                i === index
                                                                    ? { ...r, height: Number(e.target.value) }
                                                                    : r
                                                            ),
                                                        }))
                                                    }
                                                    className="w-16 px-2 py-1 bg-gray-500 border border-gray-400 rounded text-white"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Room Type Legend */}
                <div className="bg-gray-800 rounded-lg p-4 mb-6 shadow-lg">
                    <div className="flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-white">Current Room:</div>
                            <div className="px-3 py-1 bg-gray-700 rounded text-white">
                                {currentRoomType.charAt(0).toUpperCase() +
                                    currentRoomType.slice(1)}
                                {" - "}
                                {currentPath[0] || "None"}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-4 h-4 rounded"
                                    style={{ backgroundColor: roomTypeColors.start }}
                                />
                                <span className="text-sm text-gray-300">Start</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-4 h-4 rounded"
                                    style={{ backgroundColor: roomTypeColors.gnellen }}
                                />
                                <span className="text-sm text-gray-300">Gnellen</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-4 h-4 rounded"
                                    style={{ backgroundColor: roomTypeColors.static }}
                                />
                                <span className="text-sm text-gray-300">Static</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-4 h-4 rounded"
                                    style={{ backgroundColor: roomTypeColors.boss }}
                                />
                                <span className="text-sm text-gray-300">Boss</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-gradient-to-r from-green-700 to-green-500" />
                                <span className="text-sm text-gray-300">Path</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-gradient-to-r from-yellow-500 to-yellow-300" />
                                <span className="text-sm text-gray-300">Offshoot</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Game View */}
                <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-sm text-gray-300">
                            Use WASD keys to scroll the view
                        </div>
                    </div>
                    <canvas
                        ref={canvasRef}
                        width={1000}
                        height={700}
                        className="border border-gray-600 rounded-lg w-full"
                    />
                    <div className="mt-4 flex items-center gap-4">
                        <label htmlFor="scale" className="text-sm text-gray-300">
                            Zoom Level:
                        </label>
                        <input
                            id="scale"
                            type="range"
                            min="1"
                            max="40"
                            value={scale}
                            onChange={(e) => setScale(Number(e.target.value))}
                            className="flex-1"
                        />
                    </div>
                </div>
            </div>

            {/* Fixed Regenerate Button */}
            <button
                onClick={generateDungeon}
                className="fixed bottom-6 right-6 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-lg z-50"
            >
                Regenerate Dungeon
            </button>
        </div>
    );
}
