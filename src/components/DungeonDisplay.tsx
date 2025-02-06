"use client";

import { useEffect, useRef, useState } from "react";
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

type RoomType = "start" | "north" | "middle" | "boss";
type RoomSizeKey = `${RoomType}Room`;

interface RoomSizes {
    startRoom: { width: number; height: number };
    northRoom: { width: number; height: number };
    middleRoom: { width: number; height: number };
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
    const [scale, setScale] = useState(20);
    const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
    const [roomCount, setRoomCount] = useState(10);
    const [offshoots, setOffshoots] = useState({ count: 3, depth: 4 });
    const [roomSizes, setRoomSizes] = useState<RoomSizes>({
        startRoom: { width: 2, height: 2 },
        northRoom: { width: 2, height: 2 },
        middleRoom: { width: 4, height: 4 },
        bossRoom: { width: 3, height: 3 },
        randomRooms: [
            { width: 2, height: 2 },
            { width: 1, height: 3 },
            { width: 3, height: 1 },
            { width: 3, height: 3 },
        ],
    });

    const roomTypeColors = {
        start: "#32CD32", // Lime green
        north: "#4169E1", // Royal blue
        middle: "#4B0082", // Deep purple
        boss: "#FF0000", // Red
        path: "#228B22", // Forest Green (base for random shades)
        offshoot: "#FFD700", // Gold (base for random shades)
    };

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

    const generateDungeon = () => {
        const dungeon = new DungeonGenerator();
        let generatedRooms = dungeon.createShortestPath(roomCount, roomSizes);
        generatedRooms = dungeon.createOffshoots(offshoots.count, offshoots.depth);

        const roomsWithColors = generatedRooms.map((room) => ({
            ...room,
            color:
                room.id === "start-room"
                    ? roomTypeColors.start
                    : room.id === "north-room"
                        ? roomTypeColors.north
                        : room.id === "middle-room"
                            ? roomTypeColors.middle
                            : room.id === "boss-room"
                                ? roomTypeColors.boss
                                : room.id.startsWith("offshoot")
                                    ? generateRandomYellowShade()
                                    : generateRandomGreenShade(),
        }));
        setRooms(roomsWithColors);
        setPlayerPos({ x: CENTER_POINT, y: CENTER_POINT });
        setViewOffset({ x: 0, y: 0 });
    };

    // Generate dungeon once on mount
    useEffect(() => {
        generateDungeon();
    }, []);

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
                room.doors.forEach((door: any) => {
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

        drawGame();

        const handleKeyDown = (e: KeyboardEvent) => {
            // Movement keys for player
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
                e.preventDefault(); // Prevent browser scrolling
                const currentRoom = rooms.find((room) =>
                    room.cells.some(
                        (cell: any) => cell.x === playerPos.x && cell.y === playerPos.y
                    )
                );

                if (!currentRoom) return;

                const canMove = (newX: number, newY: number) => {
                    // Find the room we're trying to move into
                    const targetRoom = rooms.find((room) =>
                        room.cells.some((cell) => cell.x === newX && cell.y === newY)
                    );

                    if (!targetRoom) {
                        console.log("No target room found at", { newX, newY });
                        return false;
                    }

                    console.log(
                        "Current room:",
                        currentRoom.id,
                        "doors:",
                        currentRoom.doors
                    );
                    console.log(rooms);
                    console.log(
                        "Target room:",
                        targetRoom.id,
                        "doors:",
                        targetRoom.doors
                    );
                    console.log(
                        "Trying to move from",
                        { x: playerPos.x, y: playerPos.y },
                        "to",
                        { newX, newY }
                    );

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
                    const hasMatchingDoors = currentRoom.doors.some((currentDoor) => {
                        return targetRoom.doors.some((targetDoor) => {
                            // For vertical movement (north/south), doors should be at same x but adjacent y
                            // For horizontal movement (east/west), doors should be at same y but adjacent x
                            const isVerticalMovement =
                                currentDoor.direction === "north" ||
                                currentDoor.direction === "south";
                            const isHorizontalMovement =
                                currentDoor.direction === "east" ||
                                currentDoor.direction === "west";

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

                            console.log("Door check:", {
                                currentDoor,
                                targetDoor,
                                samePosition,
                                oppositeDirection,
                                isAtCurrentPosition,
                                isAtTargetPosition,
                            });

                            return (
                                samePosition &&
                                oppositeDirection &&
                                (isAtCurrentPosition || isAtTargetPosition)
                            );
                        });
                    });

                    console.log("Has matching doors:", hasMatchingDoors);
                    return hasMatchingDoors;
                };

                let newPos = { ...playerPos };

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

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [playerPos, rooms, scale, viewOffset]);

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

    useEffect(() => {
        // Update current room type when player moves
        const room = rooms.find((room) =>
            room.cells.some(
                (cell) => cell.x === playerPos.x && cell.y === playerPos.y
            )
        );
        if (room) {
            let type = "path";
            if (room.id === "start-room") type = "start";
            else if (room.id === "north-room") type = "north";
            else if (room.id === "middle-room") type = "middle";
            else if (room.id === "boss-room") type = "boss";
            else if (room.id.startsWith("offshoot")) type = "offshoot";
            setCurrentRoomType(type);
        }
    }, [playerPos, rooms]);

    return (
        <div className="flex flex-col items-center gap-4 p-6 bg-gray-900 min-h-screen">
            <div className="w-full max-w-4xl">
                <div className="bg-gray-800 rounded-lg p-6 mb-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-white">
                            Dungeon Configuration
                        </h2>
                        <button
                            onClick={generateDungeon}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                        >
                            Regenerate Dungeon
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Basic Settings */}
                        <div className="bg-gray-700 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-white mb-4">
                                Basic Settings
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <label
                                        htmlFor="roomCount"
                                        className="text-sm text-gray-300 w-24"
                                    >
                                        Room Count:
                                    </label>
                                    <input
                                        id="roomCount"
                                        type="number"
                                        min="5"
                                        max="30"
                                        value={roomCount}
                                        onChange={(e) => setRoomCount(Number(e.target.value))}
                                        className="w-20 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white"
                                    />
                                </div>
                                <div className="flex items-center gap-4">
                                    <label
                                        htmlFor="offshoots"
                                        className="text-sm text-gray-300 w-24"
                                    >
                                        Offshoots:
                                    </label>
                                    <input
                                        id="offshoots"
                                        type="number"
                                        min="0"
                                        max="10"
                                        value={offshoots.count}
                                        onChange={(e) =>
                                            setOffshoots((prev) => ({
                                                ...prev,
                                                count: Number(e.target.value),
                                            }))
                                        }
                                        className="w-20 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white"
                                    />
                                </div>
                                <div className="flex items-center gap-4">
                                    <label
                                        htmlFor="offshootDepth"
                                        className="text-sm text-gray-300 w-24"
                                    >
                                        Depth:
                                    </label>
                                    <input
                                        id="offshootDepth"
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={offshoots.depth}
                                        onChange={(e) =>
                                            setOffshoots((prev) => ({
                                                ...prev,
                                                depth: Number(e.target.value),
                                            }))
                                        }
                                        className="w-20 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Special Rooms */}
                        <div className="bg-gray-700 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-white mb-4">
                                Special Rooms
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {(["Start", "North", "Middle", "Boss"] as const).map(
                                    (roomType) => {
                                        const key = `${roomType.toLowerCase()}Room` as RoomSizeKey;
                                        return (
                                            <div key={roomType} className="space-y-2">
                                                <label className="text-sm text-gray-300 block">
                                                    {roomType} Room
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="6"
                                                        value={roomSizes[key].width}
                                                        onChange={(e) =>
                                                            setRoomSizes((prev) => ({
                                                                ...prev,
                                                                [key]: {
                                                                    ...prev[key],
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
                                                        value={roomSizes[key].height}
                                                        onChange={(e) =>
                                                            setRoomSizes((prev) => ({
                                                                ...prev,
                                                                [key]: {
                                                                    ...prev[key],
                                                                    height: Number(e.target.value),
                                                                },
                                                            }))
                                                        }
                                                        className="w-16 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    }
                                )}
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

                {/* Room Type Legend */}
                <div className="bg-gray-800 rounded-lg p-4 mb-6 shadow-lg">
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="text-sm text-gray-300">Room Types:</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
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
                                    style={{ backgroundColor: roomTypeColors.north }}
                                />
                                <span className="text-sm text-gray-300">North</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-4 h-4 rounded"
                                    style={{ backgroundColor: roomTypeColors.middle }}
                                />
                                <span className="text-sm text-gray-300">Middle</span>
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
                        <div className="px-3 py-1 bg-gray-700 rounded text-white text-sm">
                            Current Room:{" "}
                            {currentRoomType.charAt(0).toUpperCase() +
                                currentRoomType.slice(1)}
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
                            min="10"
                            max="40"
                            value={scale}
                            onChange={(e) => setScale(Number(e.target.value))}
                            className="flex-1"
                        />
                        <span className="text-sm text-gray-300 w-12">{scale}x</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
