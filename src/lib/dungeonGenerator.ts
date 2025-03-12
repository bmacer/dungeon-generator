export type Door = "N" | "S" | "E" | "W" | "I" | "O";
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
  variations?: number; // Number of possible variations for this room type
}

export interface Room {
  id: string; // UUID for this specific room instance
  baseTemplateId: string; // Changed from type to templateId
  templateId: string; // New field
  x: number;
  y: number;
  depth: number;
  doors: DoorConnection[]; // Changed from Door[] to DoorConnection[]
  isStatic?: boolean;
  category: RoomCategory;
  expnum: number; // New field
  variation: number; // Which variation of the room to use
}

export interface DungeonConfig {
  expnum: number;
  totalRooms: number;
  offshoots: { count: number; depth: number }[];
  staticRooms: { index: number; type: string }[];
  roomConfigs: RoomConfig[]; // Regular room configurations
  staticRoomConfigs: RoomConfig[]; // Static room configurations
  shortcuts: number;
  defaultVariations?: number; // Default number of variations for rooms
}

const GRID_SIZE = 100;
const CENTER = Math.floor(GRID_SIZE / 2);

// Default room configurations
const DEFAULT_ROOM_CONFIGS: RoomConfig[] = [
  {
    id: "StartingRoom",
    doors: ["E", "N", "O"],
    weight: 0,
    category: "START",
    isSpecial: true,
    variations: 2,
  },
  {
    id: "EnRouteToDestination",
    doors: ["I"],
    weight: 0,
    category: "START",
    isSpecial: true,
    variations: 2,
  },
  {
    id: "BossRoom",
    doors: ["W"],
    weight: 0,
    category: "BOSS",
    isSpecial: true,
    variations: 2,
  },
  {
    id: "GnellenRoom",
    doors: ["S"],
    weight: 0,
    category: "GNELLEN",
    isSpecial: true,
    variations: 2,
  },
  {
    id: "RoomTemplateA",
    doors: ["N", "S", "E", "W"],
    weight: 0.33,
    variations: 2,
  },
  {
    id: "RoomTemplateB",
    doors: ["N", "S", "E", "W"],
    weight: 0.34,
    variations: 2,
  },
  {
    id: "RoomTemplateC",
    doors: ["E", "W"],
    weight: 0.33,
    variations: 2,
  },
];

// Add new static room configs
const STATIC_ROOM_CONFIGS: RoomConfig[] = [
  {
    id: "StaticRoomTemplateX",
    doors: ["N", "S", "E", "W"],
    weight: 0,
    category: "STATIC",
    isSpecial: true,
    variations: 2,
  },
  {
    id: "StaticRoomTemplateY",
    doors: ["N", "S", "E", "W"],
    weight: 0,
    category: "STATIC",
    isSpecial: true,
    variations: 2,
  },
  {
    id: "StaticRoomTemplateZ",
    doors: ["E", "W"],
    weight: 0,
    category: "STATIC",
    isSpecial: true,
    variations: 2,
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
      ...mergedConfigs.map((config): [string, RoomConfig] => [
        config.id,
        config,
      ]),
      ...mergedStaticConfigs.map((config): [string, RoomConfig] => [
        config.id,
        config,
      ]),
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

  private getRandomRoomType(
    requiredDoor?: Door,
    parentRoomType?: string
  ): string {
    // Filter room configs to only those with compatible doors
    const compatibleRooms = this.normalizedWeights.filter(({ id }) => {
      const config = this.roomConfigs.get(id);
      if (!config || !requiredDoor) return true;

      // Skip if this room type is the same as the parent's type
      if (parentRoomType && id === parentRoomType) return false;

      const oppositeMap: Record<Door, Door> = {
        N: "S",
        S: "N",
        E: "W",
        W: "E",
        I: "O",
        O: "I",
      };

      return config.doors.includes(oppositeMap[requiredDoor]);
    });

    if (compatibleRooms.length === 0) {
      // If no compatible rooms found, try again without filtering by parent type
      if (parentRoomType) {
        const fallbackRooms = this.normalizedWeights.filter(({ id }) => {
          const config = this.roomConfigs.get(id);
          if (!config || !requiredDoor) return true;

          const oppositeMap: Record<Door, Door> = {
            N: "S",
            S: "N",
            E: "W",
            W: "E",
            I: "O",
            O: "I",
          };

          return config.doors.includes(oppositeMap[requiredDoor]);
        });

        if (fallbackRooms.length > 0) {
          const rand = Math.random();
          const selected = fallbackRooms.find(({ weight }) => rand <= weight);
          return selected?.id || fallbackRooms[0].id;
        }
      }
      return "RoomTemplateB";
    }

    // Use a single random number against cumulative weights
    const rand = Math.random();
    const selected = compatibleRooms.find(({ weight }) => rand <= weight);
    return selected?.id || compatibleRooms[0].id;
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

  private getMatchingDoors(direction: Door, roomType: string): Door[] | null {
    const baseDoors = this.determineRoomDoors(roomType);

    const oppositeMap: Record<Door, Door> = {
      N: "S",
      S: "N",
      E: "W",
      W: "E",
      I: "O",
      O: "I",
    };

    // Special handling for boss room - only allow connection from east
    if (roomType === "BossRoom" && direction !== "E") {
      return null; // Signal that this direction isn't valid
    }

    if (!baseDoors.includes(oppositeMap[direction])) {
      // Don't fall back to RoomTemplateB for special rooms
      if (
        roomType === "BossRoom" ||
        roomType === "StartingRoom" ||
        roomType === "GnellenRoom" ||
        roomType === "EnRouteToDestination"
      ) {
        return null; // Signal that this direction isn't valid
      }
      // Only fall back for regular rooms
      return this.determineRoomDoors("RoomTemplateB");
    }

    return baseDoors;
  }

  private placeRoom(room: Room): void {
    // Only place in grid if coordinates are valid
    if (
      room.x >= 0 &&
      room.y >= 0 &&
      room.x < GRID_SIZE &&
      room.y < GRID_SIZE
    ) {
      this.grid[room.y][room.x] = room;
    }
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

  private calculateDepthFromIndex(
    index: number,
    category: RoomCategory,
    parentRoom?: Room
  ): number {
    if (category === "OFFSHOOT" && parentRoom) {
      return parentRoom.depth;
    }
    if (category === "STATIC") {
      // Find position of this static room in the static rooms array
      const staticRoomIndex = this.config.staticRooms.findIndex(
        (room) => room.index === index
      );
      return staticRoomIndex + 1; // Depth starts at 1
    }
    // For regular path rooms, count static rooms before this index
    return this.config.staticRooms.filter((room) => room.index < index).length;
  }

  private createRoom(
    type: string,
    x: number,
    y: number,
    index: number,
    category: RoomCategory,
    doorDirections: Door[],
    parentRoom?: Room
  ): Room {
    // Get the room config to check for room-specific variations
    const roomConfig = this.roomConfigs.get(type);

    // Skip variations for special rooms
    const skipVariations = ["START", "GNELLEN", "BOSS", "STATIC"].includes(
      category
    );
    const variations = skipVariations
      ? 1
      : roomConfig?.variations || this.config.defaultVariations || 2;

    const variation = Math.floor(Math.random() * variations);
    const depth = this.calculateDepthFromIndex(index, category, parentRoom);

    // Determine templateId based on category and room type
    const templateId = skipVariations
      ? type
      : `${type}-Variation${variation + 1}-Depth${depth}`;

    return {
      id: this.generateUUID(),
      baseTemplateId: type,
      templateId, // New field
      x,
      y,
      depth,
      category,
      expnum: this.config.expnum,
      doors: doorDirections.map((dir) => ({
        direction: dir,
        destinationRoomId: "",
        destinationDoor: "N",
      })),
      variation,
    };
  }

  private connectRooms(room1: Room, room2: Room, direction: Door): void {
    const oppositeMap: Record<Door, Door> = {
      N: "S",
      S: "N",
      E: "W",
      W: "E",
      I: "O",
      O: "I",
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

  private determineOrder(): boolean[] {
    const order = new Array(this.config.totalRooms).fill(false);
    this.config.staticRooms.forEach(({ index }) => {
      if (index < order.length) {
        order[index] = true;
      }
    });
    return order;
  }

  private generateMainPath(): void {
    this.currentDepth = 0;

    // Create start room
    const startRoom = this.createRoom(
      "StartingRoom",
      CENTER,
      CENTER,
      0, // Index 0 for start room
      "START",
      this.determineRoomDoors("StartingRoom")
    );

    // Create EnRouteToDestination room
    const enRouteRoom = this.createRoom(
      "EnRouteToDestination",
      -1,
      -1,
      1, // Index 1 for enroute room
      "START",
      this.determineRoomDoors("EnRouteToDestination"),
      startRoom
    );

    // Create Gnellen room
    const gnellenRoom = this.createRoom(
      "GnellenRoom",
      CENTER,
      CENTER - 1,
      2, // Index 2 for Gnellen room
      "GNELLEN",
      this.determineRoomDoors("GnellenRoom"),
      startRoom
    );

    this.placeRoom(startRoom);
    this.placeRoom(enRouteRoom);
    this.placeRoom(gnellenRoom);
    this.connectRooms(startRoom, enRouteRoom, "O");
    this.connectRooms(startRoom, gnellenRoom, "N");

    let currentRoom = startRoom;
    let remainingRooms = this.config.totalRooms - 1;
    let currentIndex = 3; // Start at 3 since we've placed three rooms
    let lastRegularRoom = currentRoom; // Keep track of the last regular room placed

    // Keep track of attempts to place rooms
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loops

    while (remainingRooms > 1 && attempts < maxAttempts) {
      // Changed to > 1 to reserve last room for boss
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

      // Try each direction until we find one that works
      let placedRoom = false;
      const shuffledDirections = [...directions].sort(
        () => Math.random() - 0.5
      );

      for (const direction of shuffledDirections) {
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

        // Always get a regular room type here since we're not at the last room
        const roomType = this.getRandomRoomType(
          direction,
          currentRoom.baseTemplateId
        );
        const doorDirections = this.getMatchingDoors(direction, roomType);

        // Skip this direction if doors don't match
        if (doorDirections === null) {
          continue;
        }

        const config = this.roomConfigs.get(roomType);
        const category = config?.category || "REGULAR_PATH";

        const newRoom = this.createRoom(
          roomType,
          newX,
          newY,
          currentIndex,
          category,
          doorDirections,
          currentRoom
        );

        this.placeRoom(newRoom);
        this.connectRooms(currentRoom, newRoom, direction);
        currentRoom = newRoom;
        lastRegularRoom = newRoom; // Update the last regular room
        remainingRooms--;
        currentIndex++;
        attempts = 0;
        placedRoom = true;
        break;
      }

      if (!placedRoom) {
        attempts++;
        continue;
      }
    }

    // Place the boss room at the end of the regular path
    if (remainingRooms === 1 && lastRegularRoom) {
      const directions = this.getAvailableDirections(
        lastRegularRoom.x,
        lastRegularRoom.y,
        lastRegularRoom
      );

      // Filter for valid directions where we can place the boss room
      const validDirections = directions.filter((direction) => {
        let newX = lastRegularRoom.x;
        let newY = lastRegularRoom.y;

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

        // Check if this position is valid for the boss room
        return this.isValidPosition(newX, newY);
      });

      if (validDirections.length > 0) {
        // Prefer east direction if available, otherwise use any valid direction
        const bossDirection = validDirections.includes("E")
          ? "E"
          : validDirections[0];
        let bossX = lastRegularRoom.x;
        let bossY = lastRegularRoom.y;

        switch (bossDirection) {
          case "N":
            bossY--;
            break;
          case "S":
            bossY++;
            break;
          case "E":
            bossX++;
            break;
          case "W":
            bossX--;
            break;
        }

        const doorDirections = this.determineRoomDoors("BossRoom");
        const bossRoom = this.createRoom(
          "BossRoom",
          bossX,
          bossY,
          currentIndex,
          "BOSS",
          doorDirections,
          lastRegularRoom
        );

        this.placeRoom(bossRoom);
        this.connectRooms(lastRegularRoom, bossRoom, bossDirection);
      } else {
        console.warn(
          "Could not place boss room - no valid directions available"
        );
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

          const roomType = this.getRandomRoomType(
            direction,
            currentRoom.baseTemplateId
          );
          const doorDirections = this.getMatchingDoors(direction, roomType);

          const newRoom = this.createRoom(
            roomType,
            newX,
            newY,
            this.rooms.length, // Use rooms.length as the index for offshoot rooms
            "OFFSHOOT",
            doorDirections || [],
            parentRoom
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

        // Check for adjacent rooms with the same type
        const adjacentRooms: Room[] = [];
        const adjacentPositions = [
          { x: oldRoom.x, y: oldRoom.y - 1 }, // North
          { x: oldRoom.x, y: oldRoom.y + 1 }, // South
          { x: oldRoom.x + 1, y: oldRoom.y }, // East
          { x: oldRoom.x - 1, y: oldRoom.y }, // West
        ];

        adjacentPositions.forEach(({ x, y }) => {
          if (
            x >= 0 &&
            x < GRID_SIZE &&
            y >= 0 &&
            y < GRID_SIZE &&
            this.grid[y][x]
          ) {
            adjacentRooms.push(this.grid[y][x]!);
          }
        });

        const sameTypeAdjacent = adjacentRooms.find(
          (r) => r.baseTemplateId === staticRoom.type
        );
        if (sameTypeAdjacent) {
          console.warn(
            `Warning: Static room ${staticRoom.type} at index ${staticRoom.index} has the same type as an adjacent room`
          );
        }

        this.grid[oldRoom.y][oldRoom.x] = null;
        const newRoom = this.createRoom(
          staticRoom.type,
          oldRoom.x,
          oldRoom.y,
          staticRoom.index,
          "STATIC",
          doorDirections,
          oldRoom
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
          // Check if rooms are at the same depth level
          if (room1.depth !== room2.depth) {
            return;
          }

          // Check if rooms aren't already connected and both have available door slots
          const oppositeMap: Record<Door, Door> = {
            N: "S",
            S: "N",
            E: "W",
            W: "E",
            I: "O",
            O: "I",
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
      I: "O",
      O: "I",
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

      shortcuts.splice(index, 1);
    }
  }

  generate(): { rooms: Room[]; fastestPathSteps: number; expnum: number } {
    const maxAttempts = 500; // Prevent infinite loops
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
      return {
        rooms: this.rooms,
        fastestPathSteps: this.testFastestPath(),
        expnum: this.config.expnum,
      };
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
