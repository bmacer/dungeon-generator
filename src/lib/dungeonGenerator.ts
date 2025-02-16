export type Door = "N" | "S" | "E" | "W";
export type RoomCategory =
  | "START"
  | "GNELLEN"
  | "BOSS"
  | "REGULAR_PATH"
  | "STATIC"
  | "OFFSHOOT"
  | "SHORTCUT";

export interface DoorConnection {
  direction: Door;
  destinationRoomId: string;
  destinationDoor: Door;
  isShortcut?: boolean;
}

export interface RoomConfig {
  id: string;
  doors: Door[];
  weight: number; // Weight for random selection (0-1)
  category?: RoomCategory; // Optional default category
  isSpecial?: boolean; // If true, won't be used in random selection
}

export interface Room {
  id: string; // UUID for this specific room instance
  templateId: string; // Changed from type to templateId
  x: number;
  y: number;
  depth: number;
  doors: DoorConnection[]; // Changed from Door[] to DoorConnection[]
  isStatic?: boolean;
  category: RoomCategory;
}

export interface DungeonConfig {
  totalRooms: number;
  offshoots: { count: number; depth: number }[];
  staticRooms: { index: number; type: string }[];
  roomConfigs: RoomConfig[]; // Regular room configurations
  staticRoomConfigs: RoomConfig[]; // Static room configurations
  shortcuts: number;
}

const GRID_SIZE = 100;
const CENTER = Math.floor(GRID_SIZE / 2);

// Default room configurations
const DEFAULT_ROOM_CONFIGS: RoomConfig[] = [
  {
    id: "StartingRoom",
    doors: ["W", "N"],
    weight: 0,
    category: "START",
    isSpecial: true,
  },
  {
    id: "BossRoom",
    doors: ["N", "S", "E", "W"],
    weight: 0,
    category: "BOSS",
    isSpecial: true,
  },
  {
    id: "GnellenRoom",
    doors: ["E"],
    weight: 0,
    category: "GNELLEN",
    isSpecial: true,
  },
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

// Add new static room configs
const STATIC_ROOM_CONFIGS: RoomConfig[] = [
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

export class DungeonGenerator {
  private grid: (Room | null)[][] = Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(null));
  private rooms: Room[] = [];
  private currentDepth = 0;
  private roomConfigs: Map<string, RoomConfig>;
  private normalizedWeights: { id: string; weight: number }[];

  constructor(private config: DungeonConfig) {
    // Merge default configs with custom configs
    const mergedConfigs = [...DEFAULT_ROOM_CONFIGS];
    config.roomConfigs?.forEach((customConfig) => {
      const index = mergedConfigs.findIndex((c) => c.id === customConfig.id);
      if (index >= 0) {
        mergedConfigs[index] = { ...mergedConfigs[index], ...customConfig };
      } else {
        mergedConfigs.push(customConfig);
      }
    });

    // Merge static room configs
    const mergedStaticConfigs = [...STATIC_ROOM_CONFIGS];
    config.staticRoomConfigs?.forEach((customConfig) => {
      const index = mergedStaticConfigs.findIndex(
        (c) => c.id === customConfig.id
      );
      if (index >= 0) {
        mergedStaticConfigs[index] = {
          ...mergedStaticConfigs[index],
          ...customConfig,
        };
      } else {
        mergedStaticConfigs.push(customConfig);
      }
    });

    // Create combined map for all room configs
    this.roomConfigs = new Map([
      ...mergedStaticConfigs.map((config) => [config.id, config]),
      ...mergedConfigs.map((config) => [config.id, config]),
    ]);

    // Calculate normalized weights for random selection (excluding special rooms)
    const regularRooms = mergedConfigs.filter((c) => !c.isSpecial);
    const totalWeight = regularRooms.reduce((sum, c) => sum + c.weight, 0);
    let accumulatedWeight = 0;
    this.normalizedWeights = regularRooms.map((c) => {
      accumulatedWeight += c.weight / totalWeight;
      return { id: c.id, weight: accumulatedWeight };
    });
  }

  private getRandomRoomType(): string {
    const rand = Math.random();
    const selected = this.normalizedWeights.find((w) => rand <= w.weight);
    return selected?.id || this.normalizedWeights[0].id;
  }

  private determineRoomDoors(type: string): Door[] {
    const config = this.roomConfigs.get(type);
    if (!config)
      throw new Error(`No configuration found for room type: ${type}`);
    return [...config.doors]; // Return copy to prevent modification
  }

  private isValidPosition(
    x: number,
    y: number,
    fromRoom: Room | null = null
  ): boolean {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE || this.grid[y][x]) {
      return false;
    }

    // If we have a source room, check door compatibility
    if (fromRoom) {
      const dx = x - fromRoom.x;
      const dy = y - fromRoom.y;

      // Check if source room has a door in the direction we're moving
      if (dx === 1 && !fromRoom.doors.some((d) => d.direction === "E"))
        return false;
      if (dx === -1 && !fromRoom.doors.some((d) => d.direction === "W"))
        return false;
      if (dy === 1 && !fromRoom.doors.some((d) => d.direction === "S"))
        return false;
      if (dy === -1 && !fromRoom.doors.some((d) => d.direction === "N"))
        return false;
    }

    return true;
  }

  private getAvailableDirections(
    x: number,
    y: number,
    fromRoom: Room | null = null
  ): Door[] {
    const directions: Door[] = [];
    if (this.isValidPosition(x, y - 1, fromRoom)) directions.push("N");
    if (this.isValidPosition(x, y + 1, fromRoom)) directions.push("S");
    if (this.isValidPosition(x + 1, y, fromRoom)) directions.push("E");
    if (this.isValidPosition(x - 1, y, fromRoom)) directions.push("W");
    return directions;
  }

  private getMatchingDoors(direction: Door, roomType: string): Door[] {
    const baseDoors = this.determineRoomDoors(roomType);

    // Ensure the new room has a matching door
    const oppositeMap: Record<Door, Door> = {
      N: "S",
      S: "N",
      E: "W",
      W: "E",
    };

    if (!baseDoors.includes(oppositeMap[direction])) {
      // If the room type doesn't support the required door, change to RoomTemplateB
      return this.determineRoomDoors("RoomTemplateB");
    }

    return baseDoors;
  }

  private placeRoom(room: Room): void {
    this.grid[room.y][room.x] = room;
    this.rooms.push(room);
  }

  private generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  private createRoom(
    type: string,
    x: number,
    y: number,
    depth: number,
    category: RoomCategory,
    doorDirections: Door[]
  ): Room {
    return {
      id: this.generateUUID(),
      templateId: type,
      x,
      y,
      depth,
      category,
      doors: doorDirections.map((dir) => ({
        direction: dir,
        destinationRoomId: "", // Will be set when connecting rooms
        destinationDoor: "N", // Will be set when connecting rooms
      })),
    };
  }

  private connectRooms(room1: Room, room2: Room, direction: Door): void {
    const oppositeMap: Record<Door, Door> = {
      N: "S",
      S: "N",
      E: "W",
      W: "E",
    };
    const oppositeDirection = oppositeMap[direction];

    // Find or create the door connection in room1
    let door1 = room1.doors.find((d) => d.direction === direction);
    if (!door1) {
      door1 = {
        direction,
        destinationRoomId: room2.id,
        destinationDoor: oppositeDirection,
      };
      room1.doors.push(door1);
    } else {
      door1.destinationRoomId = room2.id;
      door1.destinationDoor = oppositeDirection;
    }

    // Find or create the door connection in room2
    let door2 = room2.doors.find((d) => d.direction === oppositeDirection);
    if (!door2) {
      door2 = {
        direction: oppositeDirection,
        destinationRoomId: room1.id,
        destinationDoor: direction,
      };
      room2.doors.push(door2);
    } else {
      door2.destinationRoomId = room1.id;
      door2.destinationDoor = direction;
    }
  }

  private generateMainPath(): void {
    // Create start room
    const startRoom = this.createRoom(
      "StartingRoom",
      CENTER,
      CENTER,
      0,
      "START",
      this.determineRoomDoors("StartingRoom")
    );

    // Create Gnellen room
    const gnellenRoom = this.createRoom(
      "GnellenRoom",
      CENTER - 1,
      CENTER,
      0,
      "GNELLEN",
      this.determineRoomDoors("GnellenRoom")
    );

    this.placeRoom(startRoom);
    this.placeRoom(gnellenRoom);
    this.connectRooms(startRoom, gnellenRoom, "W");

    let currentRoom = startRoom;
    let remainingRooms = this.config.totalRooms - 1;

    // Keep track of attempts to place rooms
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loops

    while (remainingRooms > 0 && attempts < maxAttempts) {
      const directions = this.getAvailableDirections(
        currentRoom.x,
        currentRoom.y,
        currentRoom
      );

      if (directions.length === 0) {
        // If we can't place from current room, try to find another room to branch from
        const validRooms = this.rooms.filter(
          (r) =>
            this.getAvailableDirections(r.x, r.y, r).length > 0 &&
            r.category !== "BOSS"
        );

        if (validRooms.length === 0) {
          // If we still can't find a valid room, break to avoid infinite loop
          console.warn("No valid positions found for remaining rooms");
          break;
        }

        currentRoom = validRooms[Math.floor(Math.random() * validRooms.length)];
        attempts++;
        continue;
      }

      const direction =
        directions[Math.floor(Math.random() * directions.length)];
      let newX = currentRoom.x;
      let newY = currentRoom.y;

      switch (direction) {
        case "N":
          newY--;
          break;
        case "S":
          newY++;
          break;
        case "E":
          newX++;
          break;
        case "W":
          newX--;
          break;
      }

      const roomType =
        remainingRooms === 1 ? "BossRoom" : this.getRandomRoomType();
      const doorDirections = this.getMatchingDoors(direction, roomType);
      const config = this.roomConfigs.get(roomType);
      const category =
        remainingRooms === 1 ? "BOSS" : config?.category || "REGULAR_PATH";

      const newRoom = this.createRoom(
        roomType,
        newX,
        newY,
        this.currentDepth,
        category,
        doorDirections
      );

      this.placeRoom(newRoom);
      this.connectRooms(currentRoom, newRoom, direction);
      currentRoom = newRoom;
      remainingRooms--;
      attempts = 0; // Reset attempts after successful placement
    }

    // If we didn't place a boss room, force place it
    if (!this.rooms.some((r) => r.category === "BOSS")) {
      console.warn("Boss room not placed normally, forcing placement");

      // Find a valid room to branch from
      const validRooms = this.rooms.filter((r) => {
        const directions = this.getAvailableDirections(r.x, r.y, r);
        return directions.length > 0 && r.category !== "BOSS";
      });

      if (validRooms.length > 0) {
        const parentRoom =
          validRooms[Math.floor(Math.random() * validRooms.length)];
        const directions = this.getAvailableDirections(
          parentRoom.x,
          parentRoom.y,
          parentRoom
        );
        const direction =
          directions[Math.floor(Math.random() * directions.length)];

        let newX = parentRoom.x;
        let newY = parentRoom.y;

        switch (direction) {
          case "N":
            newY--;
            break;
          case "S":
            newY++;
            break;
          case "E":
            newX++;
            break;
          case "W":
            newX--;
            break;
        }

        const doorDirections = this.getMatchingDoors(direction, "BossRoom");
        const bossRoom = this.createRoom(
          "BossRoom",
          newX,
          newY,
          this.currentDepth,
          "BOSS",
          doorDirections
        );

        this.placeRoom(bossRoom);
        this.connectRooms(parentRoom, bossRoom, direction);
      }
    }
  }

  private generateOffshoots(): boolean {
    for (const offshoot of this.config.offshoots) {
      let successfulOffshoots = 0;
      for (let i = 0; i < offshoot.count; i++) {
        const validParentRooms = this.rooms.filter((r) => {
          if (
            r.isStatic ||
            r.category === "START" ||
            r.category === "BOSS" ||
            r.category === "GNELLEN" ||
            r.category === "STATIC" ||
            r.category === "OFFSHOOT"
          ) {
            return false;
          }
          const availableDirections = this.getAvailableDirections(r.x, r.y, r);
          return (
            availableDirections.length > 0 &&
            availableDirections.some((dir) => {
              return r.doors.some(
                (d) => d.direction === dir && !d.destinationRoomId
              );
            })
          );
        });

        if (validParentRooms.length === 0) {
          console.warn(
            `Failed to generate all requested offshoots: ${successfulOffshoots}/${offshoot.count} created`
          );
          return false;
        }

        const parentRoom =
          validParentRooms[Math.floor(Math.random() * validParentRooms.length)];
        let currentRoom = parentRoom;
        let currentDepth = offshoot.depth;
        let reachedTargetDepth = true;

        while (currentDepth > 0) {
          const availableDirections = this.getAvailableDirections(
            currentRoom.x,
            currentRoom.y,
            currentRoom
          );

          if (availableDirections.length === 0) {
            reachedTargetDepth = false;
            break;
          }

          const direction =
            availableDirections[
              Math.floor(Math.random() * availableDirections.length)
            ];
          let newX = currentRoom.x;
          let newY = currentRoom.y;

          switch (direction) {
            case "N":
              newY--;
              break;
            case "S":
              newY++;
              break;
            case "E":
              newX++;
              break;
            case "W":
              newX--;
              break;
          }

          const roomType = this.getRandomRoomType();
          const doorDirections = this.getMatchingDoors(direction, roomType);

          const newRoom = this.createRoom(
            roomType,
            newX,
            newY,
            parentRoom.depth,
            "OFFSHOOT",
            doorDirections
          );

          this.placeRoom(newRoom);
          this.connectRooms(currentRoom, newRoom, direction);
          currentRoom = newRoom;
          currentDepth--;
        }

        if (!reachedTargetDepth) {
          console.warn(`Failed to reach target depth for offshoot ${i + 1}`);
          return false;
        }

        successfulOffshoots++;
      }
    }
    return true;
  }

  private placeStaticRooms(): boolean {
    for (const staticRoom of this.config.staticRooms) {
      if (staticRoom.index < this.rooms.length) {
        const oldRoom = this.rooms[staticRoom.index];
        const doorDirections = this.determineRoomDoors(staticRoom.type);

        // Check if static room can support all required connections
        const requiredConnections = oldRoom.doors.filter(
          (door) => door.destinationRoomId
        );
        const canSupportConnections = requiredConnections.every((door) =>
          doorDirections.includes(door.direction)
        );

        if (!canSupportConnections) {
          console.warn(
            `Cannot place static room ${staticRoom.type} at index ${staticRoom.index} - incompatible doors`
          );
          return false;
        }

        this.grid[oldRoom.y][oldRoom.x] = null;
        const newRoom = this.createRoom(
          staticRoom.type,
          oldRoom.x,
          oldRoom.y,
          ++this.currentDepth,
          "STATIC",
          doorDirections
        );

        // Copy over only the valid connections
        oldRoom.doors.forEach((oldDoor) => {
          if (oldDoor.destinationRoomId) {
            const destinationRoom = this.rooms.find(
              (r) => r.id === oldDoor.destinationRoomId
            );
            if (destinationRoom) {
              this.connectRooms(newRoom, destinationRoom, oldDoor.direction);
            }
          }
        });

        this.grid[newRoom.y][newRoom.x] = newRoom;
        this.rooms[staticRoom.index] = newRoom;
      }
    }
    return true;
  }

  private findPotentialShortcuts(): {
    room1: Room;
    room2: Room;
    direction: Door;
  }[] {
    const potentialShortcuts: { room1: Room; room2: Room; direction: Door }[] =
      [];

    // Check each room for potential neighbors
    this.rooms.forEach((room1) => {
      // Check each adjacent position
      const adjacentPositions: { x: number; y: number; direction: Door }[] = [
        { x: room1.x, y: room1.y - 1, direction: "N" },
        { x: room1.x, y: room1.y + 1, direction: "S" },
        { x: room1.x + 1, y: room1.y, direction: "E" },
        { x: room1.x - 1, y: room1.y, direction: "W" },
      ];

      adjacentPositions.forEach(({ x, y, direction }) => {
        const room2 = this.grid[y]?.[x];
        if (room2) {
          // Check if rooms aren't already connected and both have available door slots
          const oppositeMap: Record<Door, Door> = {
            N: "S",
            S: "N",
            E: "W",
            W: "E",
          };
          const oppositeDirection = oppositeMap[direction];

          const hasConnection = room1.doors.some(
            (d) => d.direction === direction && d.destinationRoomId === room2.id
          );

          const room1CanConnect = room1.doors.some(
            (d) => d.direction === direction && !d.destinationRoomId
          );
          const room2CanConnect = room2.doors.some(
            (d) => d.direction === oppositeDirection && !d.destinationRoomId
          );

          if (!hasConnection && room1CanConnect && room2CanConnect) {
            potentialShortcuts.push({ room1, room2, direction });
          }
        }
      });
    });

    return potentialShortcuts;
  }

  private generateShortcuts(): void {
    const shortcuts = this.findPotentialShortcuts();
    const numShortcuts = Math.min(this.config.shortcuts || 2, shortcuts.length);

    const oppositeMap: Record<Door, Door> = {
      N: "S",
      S: "N",
      E: "W",
      W: "E",
    };

    // Randomly select and create shortcuts
    for (let i = 0; i < numShortcuts; i++) {
      const index = Math.floor(Math.random() * shortcuts.length);
      const { room1, room2, direction } = shortcuts[index];

      // Connect the rooms
      this.connectRooms(room1, room2, direction);

      // Mark the doors as shortcuts
      const door1 = room1.doors.find((d) => d.direction === direction);
      const door2 = room2.doors.find(
        (d) => d.direction === oppositeMap[direction]
      );
      if (door1) door1.isShortcut = true;
      if (door2) door2.isShortcut = true;
      console.log("Added shortcut:", room1.id, room2.id, direction);

      shortcuts.splice(index, 1);
    }
  }

  generate(): { rooms: Room[]; fastestPathSteps: number } {
    const maxAttempts = 100; // Prevent infinite loops
    let attempts = 0;

    while (attempts < maxAttempts) {
      // Reset state for new attempt
      this.grid = Array(GRID_SIZE)
        .fill(null)
        .map(() => Array(GRID_SIZE).fill(null));
      this.rooms = [];
      this.currentDepth = 0;

      // Generate main dungeon structure
      this.generateMainPath();

      // Try to place static rooms
      if (!this.placeStaticRooms()) {
        attempts++;
        console.warn(
          `Dungeon generation attempt ${attempts} failed due to static room placement`
        );
        continue;
      }

      // Try to generate offshoots
      if (!this.generateOffshoots()) {
        attempts++;
        console.warn(
          `Dungeon generation attempt ${attempts} failed due to offshoot generation`
        );
        continue;
      }

      // If we got here, both static rooms and offshoots were successful
      this.generateShortcuts();
      return { rooms: this.rooms, fastestPathSteps: this.testFastestPath() };
    }

    throw new Error(
      `Failed to generate dungeon with valid room placement after ${maxAttempts} attempts`
    );
  }

  private testFastestPath(): number {
    const startRoom = this.rooms.find((room) => room.category === "START");
    const endRoom = this.rooms.find((room) => room.category === "BOSS");
    if (!startRoom || !endRoom) return -1;

    // Use breadth-first search for guaranteed shortest path
    const queue: { room: Room; steps: number }[] = [
      { room: startRoom, steps: 0 },
    ];
    const visited = new Set<string>([startRoom.id]);

    while (queue.length > 0) {
      const { room, steps } = queue.shift()!;

      if (room.id === endRoom.id) {
        return steps;
      }

      for (const door of room.doors) {
        if (!door.destinationRoomId || visited.has(door.destinationRoomId))
          continue;

        const nextRoom = this.rooms.find(
          (r) => r.id === door.destinationRoomId
        );
        if (!nextRoom) continue;

        visited.add(nextRoom.id);
        queue.push({ room: nextRoom, steps: steps + 1 });
      }
    }

    return -1; // No path found
  }
}
