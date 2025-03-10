"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    DungeonGenerator,
    Room,
    RoomCategory,
    RoomConfig,
    Door,
    DoorConnection,
} from "../lib/dungeonGenerator";
import { useExpeditionApi } from "../hooks/useExpeditionApi";
import Legend, { categoryColors } from "./Legend";
import ActiveExpedition from "./ActiveExpedition";
import FastestPathSteps from "./FastestPathSteps";
import ActionMenu from "./ActionMenu";
import BasicConfiguration from "./BasicConfiguration";
import JsonPopup from "./JsonPopup";

const CELL_SIZE = 40;
const GRID_SIZE = 100;
const COORD_SIZE = 20;

// Default room configurations that can be customized
const defaultRoomConfigs: RoomConfig[] = [
    {
        id: "RoomTemplateA",
        doors: ["W", "E"],
        weight: 0.2,
    },
    {
        id: "RoomTemplateB",
        doors: ["N", "S"],
        weight: 0.2,
    },
    {
        id: "RoomTemplateC",
        doors: ["N", "S", "W", "E"],
        weight: 0.2,
    },
    {
        id: "RoomTemplateD",
        doors: ["N", "S", "W", "E"],
        weight: 0.2,
    },
    {
        id: "RoomTemplateE",
        doors: ["N", "S", "W", "E"],
        weight: 0.2,
    },
];

const defaultStaticRoomConfigs: RoomConfig[] = [
    {
        id: "StaticRoomTemplateX",
        doors: ["N", "E"],
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
    { index: 12, type: "StaticRoomTemplateX" },
    // { index: 9, type: "StaticRoomTemplateY" },
];

const defaultOffshoots = [{ count: 2, depth: 3 }];

// Add type for room config update value
type RoomConfigUpdateValue = string | number | Door;

function DungeonDisplay() {
    const [dungeon, setDungeon] = useState<Room[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dungeonError, setDungeonError] = useState<string | null>(null);

    // Configuration state with localStorage persistence
    const [totalRooms, setTotalRooms] = useState(() => {
        const saved = localStorage.getItem("totalRooms");
        return saved ? parseInt(saved) : 25;
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

    const [defaultVariations, setDefaultVariations] = useState(() => {
        const saved = localStorage.getItem("defaultVariations");
        return saved ? parseInt(saved) : 2;
    });

    const [zoomLevel, setZoomLevel] = useState(1);

    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const [fastestPathSteps, setFastestPathSteps] = useState<number | null>(null);

    // Replace the static width calculation with state
    const [containerWidth, setContainerWidth] = useState(800);
    const [containerHeight, setContainerHeight] = useState(800);

    const [showJsonPopup, setShowJsonPopup] = useState(false); // State for popup visibility
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null); // State for selected room
    const [editedRoomJson, setEditedRoomJson] = useState<string>(""); // State for edited room JSON
    const [showRoomEditor, setShowRoomEditor] = useState(false); // State for room editor visibility

    // Add new state for JSON view mode
    const [jsonViewMode, setJsonViewMode] = useState<"full" | "simplified">(
        "simplified"
    );

    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<"success" | "error">("success");

    // Add state for new room creation
    const [showNewRoomModal, setShowNewRoomModal] = useState(false);
    const [newRoomPosition, setNewRoomPosition] = useState<{
        x: number;
        y: number;
    } | null>(null);

    const [currentExpeditionNumber, setCurrentExpeditionNumber] = useState<
        number | null
    >(null);
    const [expeditionNumberInput, setExpeditionNumberInput] =
        useState<string>("");
    const [expeditionNumbers, setExpeditionNumbers] = useState<number[]>([]);
    const [apiMessage, setApiMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);
    const [apiKey, setApiKey] = useState<string>(
        localStorage.getItem("apiKey") || "*****"
    );

    const {
        loading,
        error,
        getCurrentExpeditionNumber,
        setCurrentExpeditionNumber: apiSetCurrentExpeditionNumber,
        getAllExpeditionNumbers,
        // Remove unused API functions with underscore prefix
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        getExpeditionRooms: _getExpeditionRooms,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        getCachedExpeditionRooms: _getCachedExpeditionRooms,
        createGeneratedRooms,
        deleteExpedition,
    } = useExpeditionApi(apiKey);

    // Save API key to localStorage when it changes
    useEffect(() => {
        localStorage.setItem("apiKey", apiKey);
    }, [apiKey]);

    const centerView = useCallback(() => {
        if (containerRef.current) {
            // Calculate the center position at coordinates (50, 50)
            // Since the grid is 0-indexed, (50, 50) is actually the 51st cell in each direction
            const targetX = 50 * CELL_SIZE;
            const targetY = 50 * CELL_SIZE;

            // Account for current zoom level
            const scaledTargetX = targetX * zoomLevel;
            const scaledTargetY = targetY * zoomLevel;

            const containerWidth = containerRef.current.clientWidth;
            const containerHeight = containerRef.current.clientHeight;

            containerRef.current.scrollTo({
                left: scaledTargetX - containerWidth / 2,
                top: scaledTargetY - containerHeight / 2,
                behavior: "smooth",
            });
        }
    }, [zoomLevel]);

    const generateDungeon = useCallback(() => {
        try {
            const generator = new DungeonGenerator({
                expnum,
                totalRooms,
                offshoots,
                staticRooms,
                roomConfigs,
                staticRoomConfigs,
                shortcuts,
                defaultVariations,
            });
            const { rooms: generatedRooms, fastestPathSteps: newFastestPathSteps } =
                generator.generate();
            setDungeon(generatedRooms);
            setFastestPathSteps(newFastestPathSteps);
            setDungeonError(null); // Clear any previous errors
        } catch (error) {
            console.error("Dungeon generation error:", error);
            setDungeonError(error instanceof Error ? error.message : String(error));
            setDungeon([]); // Clear the dungeon on error
            setFastestPathSteps(null);
        }
    }, [
        expnum,
        totalRooms,
        offshoots,
        staticRooms,
        roomConfigs,
        staticRoomConfigs,
        shortcuts,
        defaultVariations,
    ]);

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

    useEffect(() => {
        localStorage.setItem("defaultVariations", defaultVariations.toString());
    }, [defaultVariations]);

    const clearMemory = useCallback(() => {
        localStorage.removeItem("totalRooms");
        localStorage.removeItem("offshoots");
        localStorage.removeItem("staticRooms");
        localStorage.removeItem("roomConfigs");
        localStorage.removeItem("shortcuts");
        localStorage.removeItem("staticRoomConfigs");
        localStorage.removeItem("expnum");
        localStorage.removeItem("defaultVariations");

        setTotalRooms(25);
        setOffshoots(defaultOffshoots);
        setStaticRooms(defaultStaticRooms);
        setRoomConfigs(defaultRoomConfigs);
        setShortcuts(2);
        setStaticRoomConfigs(defaultStaticRoomConfigs);
        setExpnum(100);
        setDefaultVariations(2);
    }, []);

    // Add useEffect to handle window-dependent calculations and initial dungeon generation
    useEffect(() => {
        setContainerWidth(Math.min(800, window.innerWidth - 32));
        setContainerHeight(Math.min(800, window.innerHeight - 200));

        // Get initial values directly from localStorage
        const initialExpnum = parseInt(localStorage.getItem("expnum") || "100");
        const initialTotalRooms = parseInt(
            localStorage.getItem("totalRooms") || "25"
        );
        const initialOffshoots = JSON.parse(
            localStorage.getItem("offshoots") || JSON.stringify(defaultOffshoots)
        );
        const initialStaticRooms = JSON.parse(
            localStorage.getItem("staticRooms") || JSON.stringify(defaultStaticRooms)
        );
        const initialRoomConfigs = JSON.parse(
            localStorage.getItem("roomConfigs") || JSON.stringify(defaultRoomConfigs)
        );
        const initialStaticRoomConfigs = JSON.parse(
            localStorage.getItem("staticRoomConfigs") ||
            JSON.stringify(defaultStaticRoomConfigs)
        );
        const initialShortcuts = parseInt(localStorage.getItem("shortcuts") || "2");
        const initialDefaultVariations = parseInt(
            localStorage.getItem("defaultVariations") || "2"
        );

        // Generate dungeon only once on initial load using initial values
        try {
            const generator = new DungeonGenerator({
                expnum: initialExpnum,
                totalRooms: initialTotalRooms,
                offshoots: initialOffshoots,
                staticRooms: initialStaticRooms,
                roomConfigs: initialRoomConfigs,
                staticRoomConfigs: initialStaticRoomConfigs,
                shortcuts: initialShortcuts,
                defaultVariations: initialDefaultVariations,
            });
            const { rooms: generatedRooms, fastestPathSteps: newFastestPathSteps } =
                generator.generate();
            setDungeon(generatedRooms);
            setFastestPathSteps(newFastestPathSteps);
            setDungeonError(null); // Clear any previous errors
        } catch (error) {
            console.error("Initial dungeon generation error:", error);
            setDungeonError(error instanceof Error ? error.message : String(error));
            setDungeon([]); // Clear the dungeon on error
            setFastestPathSteps(null);
        }
    }, []); // Empty dependency array means this only runs once on mount

    // Separate useEffect for centering view when zoom changes
    useEffect(() => {
        centerView();
    }, [centerView, zoomLevel]);

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

    const zoomIn = () => {
        if (!containerRef.current) return;

        // Get current scroll position and container dimensions
        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Calculate the center point of the current view
        const centerX = container.scrollLeft + containerWidth / 2;
        const centerY = container.scrollTop + containerHeight / 2;

        // Calculate the ratio between the current center and the total scaled size
        const ratioX = centerX / (GRID_SIZE * CELL_SIZE * zoomLevel);
        const ratioY = centerY / (GRID_SIZE * CELL_SIZE * zoomLevel);

        // Update zoom level
        setZoomLevel((prev) => {
            const newZoom = Math.min(prev + 0.5, 2); // Max zoom level of 2

            // Calculate new scroll position to maintain the same center point
            setTimeout(() => {
                const newTotalWidth = GRID_SIZE * CELL_SIZE * newZoom;
                const newTotalHeight = GRID_SIZE * CELL_SIZE * newZoom;

                const newScrollLeft = ratioX * newTotalWidth - containerWidth / 2;
                const newScrollTop = ratioY * newTotalHeight - containerHeight / 2;

                container.scrollTo({
                    left: newScrollLeft,
                    top: newScrollTop,
                    behavior: "auto", // Use 'auto' for immediate scrolling
                });
            }, 0);

            return newZoom;
        });
    };

    const zoomOut = () => {
        if (!containerRef.current) return;

        // Get current scroll position and container dimensions
        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Calculate the center point of the current view
        const centerX = container.scrollLeft + containerWidth / 2;
        const centerY = container.scrollTop + containerHeight / 2;

        // Calculate the ratio between the current center and the total scaled size
        const ratioX = centerX / (GRID_SIZE * CELL_SIZE * zoomLevel);
        const ratioY = centerY / (GRID_SIZE * CELL_SIZE * zoomLevel);

        // Update zoom level
        setZoomLevel((prev) => {
            const newZoom = Math.max(prev - 0.5, 0.5); // Min zoom level of 0.5

            // Calculate new scroll position to maintain the same center point
            setTimeout(() => {
                const newTotalWidth = GRID_SIZE * CELL_SIZE * newZoom;
                const newTotalHeight = GRID_SIZE * CELL_SIZE * newZoom;

                const newScrollLeft = ratioX * newTotalWidth - containerWidth / 2;
                const newScrollTop = ratioY * newTotalHeight - containerHeight / 2;

                container.scrollTo({
                    left: newScrollLeft,
                    top: newScrollTop,
                    behavior: "auto", // Use 'auto' for immediate scrolling
                });
            }, 0);

            return newZoom;
        });
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

    // Function to handle grid double-click for adding new rooms
    const handleGridDoubleClick = (e: React.MouseEvent) => {
        if (isDragging) return; // Don't add rooms while dragging

        // Get click position relative to the grid
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / (CELL_SIZE * zoomLevel));
        const y = Math.floor((e.clientY - rect.top) / (CELL_SIZE * zoomLevel));

        // Check if the position is valid and empty
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
            const existingRoom = dungeon.find((room) => room.x === x && room.y === y);
            if (!existingRoom) {
                // Open the new room modal
                setNewRoomPosition({ x, y });
                setShowNewRoomModal(true);
            }
        }
    };

    // Function to recalculate the fastest path
    const recalculateFastestPath = useCallback(() => {
        // Only recalculate if we have rooms
        if (dungeon.length === 0) return;

        try {
            // Create a new instance of DungeonGenerator
            new DungeonGenerator({
                expnum,
                totalRooms,
                offshoots,
                staticRooms,
                roomConfigs,
                staticRoomConfigs,
                shortcuts,
                defaultVariations,
            });

            // Since testFastestPath is a private method in DungeonGenerator,
            // we need to implement our own BFS algorithm to find the shortest path

            // Find start and end rooms
            const startRoom = dungeon.find((room) => room.category === "START");
            const endRoom = dungeon.find((room) => room.category === "BOSS");

            if (!startRoom || !endRoom) {
                setFastestPathSteps(-1); // No path possible without start or end
                return;
            }

            // Use breadth-first search for guaranteed shortest path
            const queue: { room: Room; steps: number }[] = [
                { room: startRoom, steps: 0 },
            ];
            const visited = new Set<string>([startRoom.id]);

            while (queue.length > 0) {
                const { room, steps } = queue.shift()!;

                if (room.id === endRoom.id) {
                    setFastestPathSteps(steps);
                    return;
                }

                for (const door of room.doors) {
                    if (!door.destinationRoomId || visited.has(door.destinationRoomId))
                        continue;

                    const nextRoom = dungeon.find((r) => r.id === door.destinationRoomId);
                    if (!nextRoom) continue;

                    visited.add(nextRoom.id);
                    queue.push({ room: nextRoom, steps: steps + 1 });
                }
            }

            // If we get here, no path was found
            setFastestPathSteps(-1);
        } catch (error) {
            console.error("Error calculating fastest path:", error);
            // Don't update the path if there's an error
        }
    }, [
        dungeon,
        expnum,
        totalRooms,
        offshoots,
        staticRooms,
        roomConfigs,
        staticRoomConfigs,
        shortcuts,
        defaultVariations,
    ]);

    // Function to create a new room
    const createNewRoom = (roomType: string) => {
        if (!newRoomPosition) return;

        try {
            // Get the room configuration
            const roomConfig = [...roomConfigs, ...staticRoomConfigs].find(
                (config) => config.id === roomType
            );
            if (!roomConfig) {
                throw new Error("Room type not found");
            }

            // Check for adjacent rooms to avoid same type
            const adjacentRooms = dungeon.filter(
                (r) =>
                    (Math.abs(r.x - newRoomPosition.x) === 1 &&
                        r.y === newRoomPosition.y) ||
                    (Math.abs(r.y - newRoomPosition.y) === 1 && r.x === newRoomPosition.x)
            );

            // If any adjacent room has the same type, warn the user
            const sameTypeAdjacent = adjacentRooms.find(
                (r) => r.baseTemplateId === roomType
            );
            if (sameTypeAdjacent) {
                if (
                    !confirm(
                        "This room has the same type as an adjacent room. Continue anyway?"
                    )
                ) {
                    return;
                }
            }

            // Create a copy of the dungeon
            const updatedDungeon = [...dungeon];

            // Determine the room category
            const category = roomConfig.category || "REGULAR_PATH";

            // Create a new room
            const newRoom: Room = {
                id: generateUUID(),
                baseTemplateId: roomType,
                templateId: roomType,
                x: newRoomPosition.x,
                y: newRoomPosition.y,
                depth: Math.max(...dungeon.map((r) => r.depth), 0) + 1, // Set depth to max + 1
                category: category as RoomCategory,
                doors: roomConfig.doors.map((direction: Door) => ({
                    direction,
                    destinationRoomId: "",
                    destinationDoor: "N", // Default, will be updated when connected
                })),
                expnum: expnum,
                variation: 0,
            };

            // Add the new room to the dungeon
            updatedDungeon.push(newRoom);

            // Update the dungeon state
            setDungeon(updatedDungeon);

            // Close the modal
            setShowNewRoomModal(false);
            setNewRoomPosition(null);

            // Select the new room for editing
            setSelectedRoom(newRoom);
            setEditedRoomJson(JSON.stringify(newRoom, null, 2));
            setShowRoomEditor(true);

            // Recalculate fastest path
            setTimeout(recalculateFastestPath, 0);
        } catch (error) {
            alert(
                "Error creating room: " +
                (error instanceof Error ? error.message : String(error))
            );
        }
    };

    // Helper function to generate UUID
    const generateUUID = (): string => {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
            /[xy]/g,
            function (c) {
                const r = (Math.random() * 16) | 0;
                const v = c === "x" ? r : (r & 0x3) | 0x8;
                return v.toString(16);
            }
        );
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

    // Function to handle room click
    const handleRoomClick = (room: Room) => {
        setSelectedRoom(room);
        setEditedRoomJson(JSON.stringify(room, null, 2));
        setShowRoomEditor(true);
    };

    // Function to format JSON in the editor
    const formatJson = () => {
        try {
            const parsed = JSON.parse(editedRoomJson);
            setEditedRoomJson(JSON.stringify(parsed, null, 2));
        } catch (error) {
            alert(
                "Invalid JSON: " +
                (error instanceof Error ? error.message : String(error))
            );
        }
    };

    // Function to save edited room
    const saveEditedRoom = () => {
        try {
            const updatedRoom = JSON.parse(editedRoomJson);

            // Validate the updated room has the required properties
            if (
                !updatedRoom.id ||
                !updatedRoom.doors ||
                !Array.isArray(updatedRoom.doors)
            ) {
                throw new Error("Room must have id and doors array");
            }

            // Ensure the room ID hasn't changed
            if (updatedRoom.id !== selectedRoom?.id) {
                throw new Error("Room ID cannot be changed");
            }

            // Create a copy of the dungeon for updates
            const updatedDungeon = [...dungeon];

            // Find the room index
            const roomIndex = updatedDungeon.findIndex(
                (room) => room.id === selectedRoom?.id
            );
            if (roomIndex === -1) {
                throw new Error("Room not found in dungeon");
            }

            // Store the original doors for comparison
            const originalDoors = [...updatedDungeon[roomIndex].doors];

            // Update the room in the dungeon
            updatedDungeon[roomIndex] = updatedRoom;

            // Update connections to other rooms
            updatedRoom.doors.forEach((door: DoorConnection) => {
                if (door.destinationRoomId) {
                    // Find the destination room
                    const destRoomIndex = updatedDungeon.findIndex(
                        (r) => r.id === door.destinationRoomId
                    );
                    if (destRoomIndex !== -1) {
                        // Find the corresponding door in the destination room
                        const oppositeMap: Record<Door, Door> = {
                            N: "S",
                            S: "N",
                            E: "W",
                            W: "E",
                            I: "O",
                            O: "I",
                        };

                        const oppositeDoor = oppositeMap[door.direction as Door];

                        // Check if the destination room already has a connection back to this room
                        const existingDoorIndex = updatedDungeon[
                            destRoomIndex
                        ].doors.findIndex(
                            (d) =>
                                d.direction === oppositeDoor &&
                                d.destinationRoomId === updatedRoom.id
                        );

                        if (existingDoorIndex !== -1) {
                            // Update the existing connection
                            updatedDungeon[destRoomIndex].doors[existingDoorIndex] = {
                                ...updatedDungeon[destRoomIndex].doors[existingDoorIndex],
                                destinationDoor: door.direction,
                                isShortcut: door.isShortcut,
                            };
                        } else {
                            // Create a new connection
                            updatedDungeon[destRoomIndex].doors.push({
                                direction: oppositeDoor,
                                destinationRoomId: updatedRoom.id,
                                destinationDoor: door.direction,
                                isShortcut: door.isShortcut,
                            });
                        }
                    }
                }
            });

            // Remove connections that were deleted
            originalDoors.forEach((originalDoor: DoorConnection) => {
                if (originalDoor.destinationRoomId) {
                    // Check if this connection still exists in the updated room
                    const stillExists = updatedRoom.doors.some(
                        (door: DoorConnection) =>
                            door.direction === originalDoor.direction &&
                            door.destinationRoomId === originalDoor.destinationRoomId
                    );

                    if (!stillExists) {
                        // Find the destination room
                        const destRoomIndex = updatedDungeon.findIndex(
                            (r) => r.id === originalDoor.destinationRoomId
                        );
                        if (destRoomIndex !== -1) {
                            // Find the opposite door in the destination room
                            const oppositeMap: Record<Door, Door> = {
                                N: "S",
                                S: "N",
                                E: "W",
                                W: "E",
                                I: "O",
                                O: "I",
                            };

                            const oppositeDoor = oppositeMap[originalDoor.direction as Door];

                            // Remove the connection from the destination room
                            updatedDungeon[destRoomIndex].doors = updatedDungeon[
                                destRoomIndex
                            ].doors.filter(
                                (d) =>
                                    !(
                                        d.direction === oppositeDoor &&
                                        d.destinationRoomId === updatedRoom.id
                                    )
                            );
                        }
                    }
                }
            });

            // Update the dungeon state
            setDungeon(updatedDungeon);
            setShowRoomEditor(false);

            // Recalculate fastest path
            setTimeout(recalculateFastestPath, 0);
        } catch (error) {
            alert(
                "Error: " + (error instanceof Error ? error.message : String(error))
            );
        }
    };

    // Function to get available adjacent rooms for connections
    const getAvailableAdjacentRooms = (room: Room) => {
        const adjacentPositions = [
            { direction: "N" as Door, x: room.x, y: room.y - 1 },
            { direction: "S" as Door, x: room.x, y: room.y + 1 },
            { direction: "E" as Door, x: room.x + 1, y: room.y },
            { direction: "W" as Door, x: room.x - 1, y: room.y },
        ];

        // Check if the room already has a door in this direction
        const existingDoorDirections = room.doors
            .filter((door) => door.destinationRoomId) // Only consider doors with connections
            .map((door) => door.direction);

        return adjacentPositions
            .filter(({ direction, x, y }) => {
                // Skip if the room already has a connected door in this direction
                if (existingDoorDirections.includes(direction)) return false;

                // Find if there's a room at this position
                const adjacentRoom = dungeon.find((r) => r.x === x && r.y === y);
                if (!adjacentRoom) return false;

                // Check if the room has a door in this direction (connected or not)
                const hasDoorInDirection = room.doors.some(
                    (door) => door.direction === direction
                );
                if (!hasDoorInDirection) return false;

                // Check if the adjacent room has a door in the opposite direction
                const oppositeMap: Record<Door, Door> = {
                    N: "S",
                    S: "N",
                    E: "W",
                    W: "E",
                    I: "O",
                    O: "I",
                };
                const oppositeDirection = oppositeMap[direction];

                // Check if the adjacent room has a door in the opposite direction
                const adjacentRoomHasDoor = adjacentRoom.doors.some(
                    (door) => door.direction === oppositeDirection
                );

                // We want rooms that have a door in the opposite direction
                return adjacentRoomHasDoor;
            })
            .map(({ direction, x, y }) => ({
                direction,
                room: dungeon.find((r) => r.x === x && r.y === y)!,
            }));
    };

    // Function to add a connection to an adjacent room
    const addRoomConnection = (
        sourceRoom: Room,
        direction: Door,
        targetRoom: Room
    ) => {
        try {
            // Create a copy of the dungeon
            const updatedDungeon = [...dungeon];

            // Find the source and target room indices
            const sourceIndex = updatedDungeon.findIndex(
                (r) => r.id === sourceRoom.id
            );
            const targetIndex = updatedDungeon.findIndex(
                (r) => r.id === targetRoom.id
            );

            if (sourceIndex === -1 || targetIndex === -1) {
                throw new Error("Room not found");
            }

            // Get the opposite direction
            const oppositeMap: Record<Door, Door> = {
                N: "S",
                S: "N",
                E: "W",
                W: "E",
                I: "O",
                O: "I",
            };
            const oppositeDirection = oppositeMap[direction];

            // Find the door in the source room
            const sourceDoorIndex = updatedDungeon[sourceIndex].doors.findIndex(
                (door) => door.direction === direction && !door.destinationRoomId
            );

            if (sourceDoorIndex === -1) {
                // If no unconnected door exists in this direction, add one
                updatedDungeon[sourceIndex].doors.push({
                    direction,
                    destinationRoomId: targetRoom.id,
                    destinationDoor: oppositeDirection,
                });
            } else {
                // Update the existing door
                updatedDungeon[sourceIndex].doors[sourceDoorIndex] = {
                    ...updatedDungeon[sourceIndex].doors[sourceDoorIndex],
                    destinationRoomId: targetRoom.id,
                    destinationDoor: oppositeDirection,
                };
            }

            // Find the door in the target room
            const targetDoorIndex = updatedDungeon[targetIndex].doors.findIndex(
                (door) =>
                    door.direction === oppositeDirection && !door.destinationRoomId
            );

            if (targetDoorIndex === -1) {
                // If no unconnected door exists in this direction, add one
                updatedDungeon[targetIndex].doors.push({
                    direction: oppositeDirection,
                    destinationRoomId: sourceRoom.id,
                    destinationDoor: direction,
                });
            } else {
                // Update the existing door
                updatedDungeon[targetIndex].doors[targetDoorIndex] = {
                    ...updatedDungeon[targetIndex].doors[targetDoorIndex],
                    destinationRoomId: sourceRoom.id,
                    destinationDoor: direction,
                };
            }

            // Update the dungeon
            setDungeon(updatedDungeon);

            // Update the selected room and JSON
            setSelectedRoom(updatedDungeon[sourceIndex]);
            setEditedRoomJson(JSON.stringify(updatedDungeon[sourceIndex], null, 2));

            // Recalculate fastest path
            setTimeout(recalculateFastestPath, 0);
        } catch (error) {
            alert(
                "Error adding connection: " +
                (error instanceof Error ? error.message : String(error))
            );
        }
    };

    // Function to remove a connection
    const removeRoomConnection = (sourceRoom: Room, doorIndex: number) => {
        try {
            // Create a copy of the dungeon
            const updatedDungeon = [...dungeon];

            // Find the source room index
            const sourceIndex = updatedDungeon.findIndex(
                (r) => r.id === sourceRoom.id
            );

            if (sourceIndex === -1 || doorIndex >= sourceRoom.doors.length) {
                throw new Error("Room or door not found");
            }

            const doorToRemove = sourceRoom.doors[doorIndex];

            // Skip if the door doesn't have a destination
            if (!doorToRemove.destinationRoomId) {
                return;
            }

            // Find the target room
            const targetIndex = updatedDungeon.findIndex(
                (r) => r.id === doorToRemove.destinationRoomId
            );

            if (targetIndex !== -1) {
                // Get the opposite direction
                const oppositeMap: Record<Door, Door> = {
                    N: "S",
                    S: "N",
                    E: "W",
                    W: "E",
                    I: "O",
                    O: "I",
                };
                const oppositeDirection = oppositeMap[doorToRemove.direction as Door];

                // Remove the corresponding door from the target room
                updatedDungeon[targetIndex].doors = updatedDungeon[
                    targetIndex
                ].doors.filter(
                    (d) =>
                        !(
                            d.direction === oppositeDirection &&
                            d.destinationRoomId === sourceRoom.id
                        )
                );
            }

            // Remove the door from the source room
            updatedDungeon[sourceIndex].doors.splice(doorIndex, 1);

            // Update the dungeon state
            setDungeon(updatedDungeon);

            // Update the selected room and JSON
            setSelectedRoom(updatedDungeon[sourceIndex]);
            setEditedRoomJson(JSON.stringify(updatedDungeon[sourceIndex], null, 2));

            // Recalculate fastest path
            setTimeout(recalculateFastestPath, 0);
        } catch (error) {
            alert(
                "Error removing connection: " +
                (error instanceof Error ? error.message : String(error))
            );
        }
    };

    // Function to toggle shortcut status
    const toggleShortcut = (sourceRoom: Room, doorIndex: number) => {
        try {
            // Create a copy of the dungeon
            const updatedDungeon = [...dungeon];

            // Find the source room index
            const sourceIndex = updatedDungeon.findIndex(
                (r) => r.id === sourceRoom.id
            );

            if (sourceIndex === -1 || doorIndex >= sourceRoom.doors.length) {
                throw new Error("Room or door not found");
            }

            const door = updatedDungeon[sourceIndex].doors[doorIndex];

            // Skip if the door doesn't have a destination
            if (!door.destinationRoomId) {
                return;
            }

            // Toggle the shortcut status
            const newShortcutStatus = !door.isShortcut;
            updatedDungeon[sourceIndex].doors[doorIndex] = {
                ...door,
                isShortcut: newShortcutStatus,
            };

            // Find the target room
            const targetIndex = updatedDungeon.findIndex(
                (r) => r.id === door.destinationRoomId
            );

            if (targetIndex !== -1) {
                // Get the opposite direction
                const oppositeMap: Record<Door, Door> = {
                    N: "S",
                    S: "N",
                    E: "W",
                    W: "E",
                    I: "O",
                    O: "I",
                };
                const oppositeDirection = oppositeMap[door.direction as Door];

                // Find the corresponding door in the target room
                const targetDoorIndex = updatedDungeon[targetIndex].doors.findIndex(
                    (d) =>
                        d.direction === oppositeDirection &&
                        d.destinationRoomId === sourceRoom.id
                );

                if (targetDoorIndex !== -1) {
                    // Update the shortcut status in the target room
                    updatedDungeon[targetIndex].doors[targetDoorIndex] = {
                        ...updatedDungeon[targetIndex].doors[targetDoorIndex],
                        isShortcut: newShortcutStatus,
                    };
                }
            }

            // Update the dungeon state
            setDungeon(updatedDungeon);

            // Update the selected room and JSON
            setSelectedRoom(updatedDungeon[sourceIndex]);
            setEditedRoomJson(JSON.stringify(updatedDungeon[sourceIndex], null, 2));

            // Recalculate fastest path
            setTimeout(recalculateFastestPath, 0);
        } catch (error) {
            alert(
                "Error toggling shortcut: " +
                (error instanceof Error ? error.message : String(error))
            );
        }
    };

    // Function to delete a room
    const deleteRoom = (roomToDelete: Room) => {
        try {
            // Create a copy of the dungeon
            const updatedDungeon = [...dungeon];

            // Find the room index
            const roomIndex = updatedDungeon.findIndex(
                (room) => room.id === roomToDelete.id
            );
            if (roomIndex === -1) {
                throw new Error("Room not found in dungeon");
            }

            // Get all connections to this room
            const connectionsToRemove = roomToDelete.doors.filter(
                (door) => door.destinationRoomId
            );

            // Remove connections from other rooms to this room
            connectionsToRemove.forEach((door) => {
                if (door.destinationRoomId) {
                    const connectedRoomIndex = updatedDungeon.findIndex(
                        (r) => r.id === door.destinationRoomId
                    );
                    if (connectedRoomIndex !== -1) {
                        // Find the opposite direction
                        const oppositeMap: Record<Door, Door> = {
                            N: "S",
                            S: "N",
                            E: "W",
                            W: "E",
                            I: "O",
                            O: "I",
                        };
                        const oppositeDirection = oppositeMap[door.direction as Door];

                        // Instead of removing the door, just remove the connection (will appear red)
                        updatedDungeon[connectedRoomIndex].doors = updatedDungeon[
                            connectedRoomIndex
                        ].doors.map((d) => {
                            if (
                                d.direction === oppositeDirection &&
                                d.destinationRoomId === roomToDelete.id
                            ) {
                                // Keep the door but remove the connection (will appear red)
                                return {
                                    direction: d.direction,
                                    destinationRoomId: "",
                                    destinationDoor: "N", // Default value
                                };
                            }
                            return d;
                        });
                    }
                }
            });

            // Remove the room from the dungeon
            updatedDungeon.splice(roomIndex, 1);

            // Update the dungeon state
            setDungeon(updatedDungeon);

            // Close the room editor
            setShowRoomEditor(false);
            setSelectedRoom(null);

            // Recalculate fastest path
            setTimeout(recalculateFastestPath, 0);
        } catch (error) {
            alert(
                "Error deleting room: " +
                (error instanceof Error ? error.message : String(error))
            );
        }
    };

    // Fetch current expedition number and all expedition numbers on component mount
    useEffect(() => {
        const fetchExpeditionData = async () => {
            try {
                const currentExpNum = await getCurrentExpeditionNumber();
                console.log("Current expedition number response:", currentExpNum);

                if (currentExpNum && currentExpNum.number !== undefined) {
                    setCurrentExpeditionNumber(currentExpNum.number);
                    setExpeditionNumberInput(currentExpNum.number.toString());
                }

                const expeditionNums = await getAllExpeditionNumbers();
                if (expeditionNums) {
                    setExpeditionNumbers(
                        Array.isArray(expeditionNums) ? expeditionNums : []
                    );
                }
            } catch (error) {
                console.error("Error fetching expedition data:", error);
                setApiMessage({
                    type: "error",
                    text: "Failed to fetch expedition data. Please try again.",
                });
            }
        };

        fetchExpeditionData();
    }, [getCurrentExpeditionNumber, getAllExpeditionNumbers]); // Now these functions are stable

    // Helper function to show toast notifications
    const showToastNotification = (
        message: string,
        type: "success" | "error"
    ) => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);

        // Auto-hide toast after 3 seconds
        setTimeout(() => {
            setShowToast(false);
        }, 3000);
    };

    // Function to save current dungeon to the API
    const saveToExpedition = async () => {
        if (!currentExpeditionNumber) {
            const errorMessage = "No expedition number set";
            setApiMessage({ type: "error", text: errorMessage });
            showToastNotification(errorMessage, "error");
            return;
        }

        // Prepare rooms for saving based on jsonViewMode
        const roomsToSave = dungeon.map((room) => {
            // Filter out doors without destinationRoomIds
            const validDoors = room.doors.filter((door) => door.destinationRoomId);

            // Return simplified room structure
            return {
                ...room,
                // expnum: currentExpeditionNumber,
                doors: validDoors,
            };
        });

        // Count removed doors for notification
        const totalOriginalDoors = dungeon.reduce(
            (count, room) => count + room.doors.length,
            0
        );
        const totalValidDoors = roomsToSave.reduce(
            (count, room) => count + room.doors.length,
            0
        );

        // Calculate removed doors but don't use it for now
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _removedDoors = totalOriginalDoors - totalValidDoors;

        try {
            const result = await createGeneratedRooms(roomsToSave);
            if (result) {
                const successMessage = `Saved expedition ${expnum}!`;
                setApiMessage({
                    type: "success",
                    text: successMessage,
                });
                showToastNotification(successMessage, "success");

                // Refresh expedition numbers after successful save
                try {
                    const expeditionNums = await getAllExpeditionNumbers();
                    if (expeditionNums) {
                        setExpeditionNumbers(
                            Array.isArray(expeditionNums) ? expeditionNums : []
                        );
                    }
                } catch (refreshError) {
                    console.error("Error refreshing expedition numbers:", refreshError);
                }
            } else {
                throw new Error("Failed to save rooms: API returned no result");
            }
        } catch (error) {
            console.error("Error saving rooms:", error);
            const errorMessage = `Failed to save rooms: ${error instanceof Error ? error.message : String(error)
                }`;

            setApiMessage({
                type: "error",
                text: errorMessage,
            });
            showToastNotification(errorMessage, "error");
        }
    };

    // Function to delete an expedition
    const handleDeleteExpedition = async (expeditionNumber: number) => {
        if (
            confirm(`Are you sure you want to delete expedition ${expeditionNumber}?`)
        ) {
            const result = await deleteExpedition(expeditionNumber);
            if (result) {
                setApiMessage({
                    type: "success",
                    text: `Deleted expedition ${expeditionNumber}`,
                });

                // Refresh expedition numbers
                const expeditionNums = await getAllExpeditionNumbers();
                if (expeditionNums) {
                    setExpeditionNumbers(expeditionNums);
                }
            }
        }
    };

    // Function to update current expedition number
    const handleSetCurrentExpeditionNumber = async () => {
        const expnum = parseInt(expeditionNumberInput);
        if (isNaN(expnum)) {
            setApiMessage({
                type: "error",
                text: "Please enter a valid expedition number",
            });
            return;
        }

        try {
            const result = await apiSetCurrentExpeditionNumber(expnum);
            if (result) {
                setCurrentExpeditionNumber(expnum);
                setApiMessage({
                    type: "success",
                    text: `Set current expedition number to ${expnum}`,
                });

                // Refresh expedition numbers list
                const expeditionNums = await getAllExpeditionNumbers();
                if (expeditionNums) {
                    setExpeditionNumbers(
                        Array.isArray(expeditionNums) ? expeditionNums : []
                    );
                }
            }
        } catch (error) {
            console.error("Error setting expedition number:", error);
            setApiMessage({
                type: "error",
                text: "Failed to set expedition number. Please try again.",
            });
        }
    };

    // Function to handle wheel events for zooming with Ctrl/Cmd key
    const handleWheel = (e: React.WheelEvent) => {
        // Only handle wheel events with Ctrl or Cmd key pressed
        if (!(e.ctrlKey || e.metaKey)) return;

        // Prevent the default browser zoom behavior
        e.preventDefault();

        if (!containerRef.current) return;

        // Get current scroll position and container dimensions
        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Calculate the center point of the current view
        const centerX = container.scrollLeft + containerWidth / 2;
        const centerY = container.scrollTop + containerHeight / 2;

        // Calculate the ratio between the current center and the total scaled size
        const ratioX = centerX / (GRID_SIZE * CELL_SIZE * zoomLevel);
        const ratioY = centerY / (GRID_SIZE * CELL_SIZE * zoomLevel);

        // Use smaller increment for smoother zooming with mousewheel
        const zoomIncrement = 0.1;

        // Update zoom level
        setZoomLevel((prev) => {
            // Determine new zoom level based on wheel direction
            const newZoom =
                e.deltaY < 0
                    ? Math.min(prev + zoomIncrement, 2) // Zoom in (max 2)
                    : Math.max(prev - zoomIncrement, 0.5); // Zoom out (min 0.5)

            // Calculate new scroll position to maintain the same center point
            setTimeout(() => {
                const newTotalWidth = GRID_SIZE * CELL_SIZE * newZoom;
                const newTotalHeight = GRID_SIZE * CELL_SIZE * newZoom;

                const newScrollLeft = ratioX * newTotalWidth - containerWidth / 2;
                const newScrollTop = ratioY * newTotalHeight - containerHeight / 2;

                container.scrollTo({
                    left: newScrollLeft,
                    top: newScrollTop,
                    behavior: "auto", // Use 'auto' for immediate scrolling
                });
            }, 0);

            return newZoom;
        });
    };

    const handleExpnumChange = (newExpnum: number) => {
        setExpnum(newExpnum);
        // Update all rooms with the new expedition number
        setDungeon((prevDungeon) =>
            prevDungeon.map((room) => ({
                ...room,
                expnum: newExpnum,
            }))
        );
    };

    return (
        <div className="dungeon-display">
            {/* Toast Notification */}
            {showToast && (
                <div
                    className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-4 rounded-lg shadow-xl 
                        ${toastType === "success"
                            ? "bg-green-600"
                            : "bg-red-600"
                        } text-white
                        transition-opacity duration-300 ease-in-out min-w-[300px] max-w-md`}
                    style={{ animation: "fadeInOut 3s ease-in-out" }}
                >
                    <style jsx>{`
            @keyframes fadeInOut {
              0% {
                opacity: 0;
                transform: translate(-50%, -20px);
              }
              10% {
                opacity: 1;
                transform: translate(-50%, 0);
              }
              90% {
                opacity: 1;
                transform: translate(-50%, 0);
              }
              100% {
                opacity: 0;
                transform: translate(-50%, -20px);
              }
            }
          `}</style>
                    <button
                        className="absolute top-1 right-1 text-white hover:text-gray-200 transition-colors"
                        onClick={() => setShowToast(false)}
                        aria-label="Close notification"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M6 18L18 6M6 6l12 12"
                            ></path>
                        </svg>
                    </button>
                    <div className="flex items-center">
                        {toastType === "success" ? (
                            <svg
                                className="w-6 h-6 mr-3 flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M5 13l4 4L19 7"
                                ></path>
                            </svg>
                        ) : (
                            <svg
                                className="w-6 h-6 mr-3 flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                ></path>
                            </svg>
                        )}
                        <span className="font-medium">{toastMessage}</span>
                    </div>
                </div>
            )}

            <ActiveExpedition
                currentExpeditionNumber={currentExpeditionNumber}
                expeditionNumberInput={expeditionNumberInput}
                loading={loading}
                error={error}
                expeditionNumbers={expeditionNumbers}
                apiMessage={apiMessage}
                apiKey={apiKey}
                onSetExpeditionNumber={handleSetCurrentExpeditionNumber}
                onDeleteExpedition={handleDeleteExpedition}
                onExpeditionInputChange={(value) => setExpeditionNumberInput(value)}
                onApiKeyChange={(value) => setApiKey(value)}
                onApiMessageClose={() => setApiMessage(null)}
            />
            <div
                className="p-4 text-black"
                style={{ overflowX: "hidden", fontFamily: "Gnellen" }}
            >
                {dungeonError ? (
                    <div className="flex flex-col items-center justify-center p-8 bg-red-50 border-2 border-red-200 rounded-lg mb-4">
                        <div className="text-red-600 text-xl font-bold mb-4">
                            Failed to Generate Dungeon
                        </div>
                        <div className="text-red-500 mb-4 text-center">{dungeonError}</div>
                        <div className="text-gray-600 text-sm mb-4 text-center max-w-lg">
                            This usually happens when the dungeon configuration is too
                            constrained. If this keeps happening, clear the memory and try
                            again.
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={generateDungeon}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => {
                                    clearMemory();
                                }}
                                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                            >
                                Clear Memory
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <FastestPathSteps steps={fastestPathSteps} />
                        <BasicConfiguration
                            expnum={expnum}
                            totalRooms={totalRooms}
                            shortcuts={shortcuts}
                            defaultVariations={defaultVariations}
                            onExpnumChange={handleExpnumChange}
                            onTotalRoomsChange={setTotalRooms}
                            onShortcutsChange={setShortcuts}
                            onDefaultVariationsChange={setDefaultVariations}
                        />
                        <ActionMenu
                            onRegenerate={generateDungeon}
                            onCopyJson={copyJsonToClipboard}
                            onShowJson={toggleJsonPopup}
                            onClearMemory={clearMemory}
                            onSaveToExpedition={saveToExpedition}
                            isSaveDisabled={
                                !currentExpeditionNumber || loading || dungeon.length === 0
                            }
                            loading={loading}
                            expnum={expnum}
                        />
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
                            onWheel={handleWheel}
                        >
                            <div
                                style={{
                                    width: GRID_SIZE * CELL_SIZE,
                                    height: GRID_SIZE * CELL_SIZE,
                                    position: "relative",
                                    backgroundColor: "#000000",
                                    backgroundImage:
                                        "linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)",
                                    backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
                                    transform: `scale(${zoomLevel})`,
                                    transformOrigin: "top left",
                                }}
                                onDoubleClick={handleGridDoubleClick}
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
                                            border:
                                                selectedRoom?.id === room.id
                                                    ? "2px solid white"
                                                    : "1px solid black",
                                            boxShadow:
                                                selectedRoom?.id === room.id
                                                    ? "0 0 8px rgba(255, 255, 255, 0.8)"
                                                    : "none",
                                            zIndex: selectedRoom?.id === room.id ? 10 : 1,
                                            cursor: "pointer", // Add pointer cursor to indicate clickability
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent grid click
                                            handleRoomClick(room);
                                        }} // Add click handler
                                        title={`Base Template: ${room.baseTemplateId}, Category: ${room.category}, Depth: ${room.depth}, Position: (${room.x},${room.y})`}
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
                                                    ? room.baseTemplateId[0]
                                                    : room.category === "STATIC"
                                                        ? room.baseTemplateId.replace(
                                                            "StaticRoomTemplate",
                                                            ""
                                                        )
                                                        : room.baseTemplateId.slice(-1)}
                                                {` (${room.depth})`}
                                            </span>
                                            <span className="text-[6px]">
                                                {room.id.split("-")[0].slice(0, 5)}
                                            </span>
                                            {!["START", "GNELLEN", "BOSS", "STATIC"].includes(
                                                room.category
                                            ) && (
                                                    <span className="text-[6px]">
                                                        v{room.variation + 1}
                                                    </span>
                                                )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Zoom controls overlay - fixed to viewport */}
                        <div className="fixed bottom-24 right-8 flex flex-col gap-2 z-30 opacity-90 hover:opacity-100 transition-opacity">
                            <button
                                onClick={zoomIn}
                                className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 border border-gray-300 focus:outline-none"
                                title="Zoom In"
                            >
                                <span className="text-2xl font-bold">+</span>
                            </button>
                            <div
                                className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-300 text-sm font-semibold"
                                title="Current Zoom Level (Use Ctrl/Cmd + Mousewheel to zoom)"
                            >
                                {Math.round(zoomLevel * 100)}%
                            </div>
                            <button
                                onClick={zoomOut}
                                className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 border border-gray-300 focus:outline-none"
                                title="Zoom Out"
                            >
                                <span className="text-2xl font-bold">−</span>
                            </button>
                            <button
                                onClick={centerView}
                                className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 border border-gray-300 focus:outline-none"
                                title="Center View"
                            >
                                <span className="text-2xl">⌖</span>
                            </button>
                        </div>

                        <Legend />

                        <div className="mb-6 space-y-4">
                            <div className="space-y-2">
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
                                                onChange={(e) =>
                                                    updateStaticRoom(i, "type", e.target.value)
                                                }
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
                                    <div
                                        key={i}
                                        className="flex flex-col gap-2 bg-gray-50 p-2 rounded"
                                    >
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
                                                        onChange={() =>
                                                            updateStaticRoomConfig(i, "doors", door)
                                                        }
                                                    />
                                                    {door}
                                                </label>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <label>Variations:</label>
                                            <input
                                                type="number"
                                                value={config.variations || defaultVariations}
                                                onChange={(e) =>
                                                    updateStaticRoomConfig(
                                                        i,
                                                        "variations",
                                                        Math.max(1, parseInt(e.target.value) || 1)
                                                    )
                                                }
                                                className="border p-1 rounded w-20"
                                                min="1"
                                            />
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
                                    <div
                                        key={i}
                                        className="flex flex-col gap-2 bg-gray-50 p-2 rounded"
                                    >
                                        <div className="flex items-center gap-2">
                                            <label>ID:</label>
                                            <input
                                                type="text"
                                                value={config.id}
                                                onChange={(e) =>
                                                    updateRoomConfig(i, "id", e.target.value)
                                                }
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
                                            <label>Variations:</label>
                                            <input
                                                type="number"
                                                value={config.variations || defaultVariations}
                                                onChange={(e) =>
                                                    updateRoomConfig(
                                                        i,
                                                        "variations",
                                                        Math.max(1, parseInt(e.target.value) || 1)
                                                    )
                                                }
                                                className="border p-1 rounded w-20"
                                                min="1"
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

                        {/* JSON Popup */}
                        <JsonPopup
                            isOpen={showJsonPopup}
                            onClose={() => setShowJsonPopup(false)}
                            jsonViewMode={jsonViewMode}
                            onViewModeChange={setJsonViewMode}
                            jsonContent={
                                jsonViewMode === "full"
                                    ? JSON.stringify(dungeon, null, 2)
                                    : JSON.stringify(getSimplifiedDungeon(), null, 2)
                            }
                        />

                        {/* Room Editor Popup */}
                        {showRoomEditor && selectedRoom && (
                            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                                <div
                                    className="bg-white p-4 rounded shadow-lg w-3/4 max-w-4xl"
                                    style={{ maxHeight: "80vh", overflowY: "auto" }}
                                >
                                    <div className="flex justify-between mb-4">
                                        <h3 className="font-bold text-lg">
                                            Edit Room: {selectedRoom.baseTemplateId} ({selectedRoom.x}
                                            , {selectedRoom.y})
                                        </h3>
                                        <button
                                            onClick={() => setShowRoomEditor(false)}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {/* Room summary */}
                                    <div className="mb-4 p-3 bg-gray-100 rounded border border-gray-300">
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="font-semibold">ID:</span>{" "}
                                                <span className="font-mono">
                                                    {selectedRoom.id.substring(0, 8)}...
                                                </span>
                                            </div>
                                            <div>
                                                <span className="font-semibold">Category:</span>{" "}
                                                {selectedRoom.category}
                                            </div>
                                            <div>
                                                <span className="font-semibold">Template:</span>{" "}
                                                {selectedRoom.baseTemplateId}
                                            </div>
                                            <div>
                                                <span className="font-semibold">Depth:</span>{" "}
                                                {selectedRoom.depth}
                                            </div>
                                            <div>
                                                <span className="font-semibold">Position:</span> (
                                                {selectedRoom.x}, {selectedRoom.y})
                                            </div>
                                            <div>
                                                <span className="font-semibold">Doors:</span>{" "}
                                                {selectedRoom.doors.length}
                                            </div>
                                            <div className="col-span-2">
                                                <span className="font-semibold">Connections:</span>{" "}
                                                {
                                                    selectedRoom.doors.filter((d) => d.destinationRoomId)
                                                        .length
                                                }
                                            </div>
                                        </div>
                                    </div>

                                    {/* Existing Connections */}
                                    <div className="mb-4">
                                        <h4 className="font-semibold mb-2">
                                            Existing Connections:
                                        </h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {selectedRoom.doors.filter(
                                                (door) => door.destinationRoomId
                                            ).length > 0 ? (
                                                selectedRoom.doors.map((door, index) => {
                                                    if (!door.destinationRoomId) return null;

                                                    // Find the connected room
                                                    const connectedRoom = dungeon.find(
                                                        (r) => r.id === door.destinationRoomId
                                                    );
                                                    if (!connectedRoom) return null;

                                                    return (
                                                        <div
                                                            key={index}
                                                            className="flex items-center justify-between p-2 bg-gray-50 border rounded"
                                                        >
                                                            <div>
                                                                <span className="font-semibold">
                                                                    {door.direction}:
                                                                </span>{" "}
                                                                {connectedRoom.baseTemplateId} (
                                                                {connectedRoom.x}, {connectedRoom.y})
                                                                <span className="ml-2 text-xs text-gray-500">
                                                                    Category: {connectedRoom.category}, Depth:{" "}
                                                                    {connectedRoom.depth}
                                                                </span>
                                                                {door.isShortcut && (
                                                                    <span className="ml-2 text-xs text-green-600 font-semibold">
                                                                        Shortcut
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() =>
                                                                        toggleShortcut(selectedRoom, index)
                                                                    }
                                                                    className={`px-2 py-1 ${door.isShortcut
                                                                        ? "bg-green-500"
                                                                        : "bg-gray-300"
                                                                        } text-white rounded text-sm hover:opacity-80`}
                                                                    title={
                                                                        door.isShortcut
                                                                            ? "Remove shortcut"
                                                                            : "Mark as shortcut"
                                                                    }
                                                                >
                                                                    {door.isShortcut ? "Shortcut ✓" : "Shortcut"}
                                                                </button>
                                                                <button
                                                                    onClick={() =>
                                                                        removeRoomConnection(selectedRoom, index)
                                                                    }
                                                                    className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="text-gray-500 italic">
                                                    No connections
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Available Adjacent Rooms */}
                                    <div className="mb-4">
                                        <h4 className="font-semibold mb-2">
                                            Available Adjacent Rooms:
                                        </h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {getAvailableAdjacentRooms(selectedRoom).length > 0 ? (
                                                getAvailableAdjacentRooms(selectedRoom).map(
                                                    ({ direction, room }) => (
                                                        <div
                                                            key={direction}
                                                            className="flex items-center justify-between p-2 bg-gray-50 border rounded"
                                                        >
                                                            <div>
                                                                <span className="font-semibold">
                                                                    {direction}:
                                                                </span>{" "}
                                                                {room.baseTemplateId} ({room.x}, {room.y})
                                                                <span className="ml-2 text-xs text-gray-500">
                                                                    Category: {room.category}, Depth: {room.depth}
                                                                </span>
                                                            </div>
                                                            <button
                                                                onClick={() =>
                                                                    addRoomConnection(
                                                                        selectedRoom,
                                                                        direction,
                                                                        room
                                                                    )
                                                                }
                                                                className="px-2 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                                            >
                                                                Add Connection
                                                            </button>
                                                        </div>
                                                    )
                                                )
                                            ) : (
                                                <div className="text-gray-500 italic">
                                                    No available adjacent rooms for new connections
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mb-2 flex justify-between items-center">
                                        <div>
                                            <span className="text-sm text-gray-600">
                                                Edit JSON directly:
                                            </span>
                                        </div>
                                        <button
                                            onClick={formatJson}
                                            className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-sm hover:bg-gray-300"
                                        >
                                            Format JSON
                                        </button>
                                    </div>
                                    <textarea
                                        value={editedRoomJson}
                                        onChange={(e) => setEditedRoomJson(e.target.value)}
                                        className="w-full h-96 font-mono text-sm p-2 border rounded bg-gray-50"
                                        spellCheck="false"
                                    />
                                    <div className="flex justify-between gap-2 mt-4">
                                        <button
                                            onClick={() => {
                                                if (
                                                    window.confirm(
                                                        `Are you sure you want to delete this room? This will remove all connections to it.`
                                                    )
                                                ) {
                                                    deleteRoom(selectedRoom);
                                                }
                                            }}
                                            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                                        >
                                            Delete Room
                                        </button>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setShowRoomEditor(false)}
                                                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={saveEditedRoom}
                                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                            >
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* New Room Modal */}
                        {showNewRoomModal && newRoomPosition && (
                            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                                <div className="bg-white p-4 rounded shadow-lg w-96">
                                    <div className="flex justify-between mb-4">
                                        <h3 className="font-bold text-lg">
                                            Add New Room at ({newRoomPosition.x}, {newRoomPosition.y})
                                        </h3>
                                        <button
                                            onClick={() => setShowNewRoomModal(false)}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    <div className="mb-4">
                                        <h4 className="font-semibold mb-2">Select Room Type:</h4>
                                        <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                                            {/* Regular Room Types */}
                                            <div className="mb-2">
                                                <h5 className="font-medium text-sm mb-1 text-gray-700">
                                                    Regular Rooms:
                                                </h5>
                                                {roomConfigs.map((config: RoomConfig) => (
                                                    <button
                                                        key={config.id}
                                                        onClick={() => createNewRoom(config.id)}
                                                        className="w-full text-left p-2 mb-1 bg-blue-50 hover:bg-blue-100 rounded flex justify-between items-center"
                                                    >
                                                        <span>{config.id}</span>
                                                        <span className="text-xs text-gray-500">
                                                            Doors: {config.doors.join(", ")}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Static Room Types */}
                                            <div>
                                                <h5 className="font-medium text-sm mb-1 text-gray-700">
                                                    Static Rooms:
                                                </h5>
                                                {staticRoomConfigs.map((config: RoomConfig) => (
                                                    <button
                                                        key={config.id}
                                                        onClick={() => createNewRoom(config.id)}
                                                        className="w-full text-left p-2 mb-1 bg-purple-50 hover:bg-purple-100 rounded flex justify-between items-center"
                                                    >
                                                        <span>{config.id}</span>
                                                        <span className="text-xs text-gray-500">
                                                            Doors: {config.doors.join(", ")}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => setShowNewRoomModal(false)}
                                            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default DungeonDisplay;
