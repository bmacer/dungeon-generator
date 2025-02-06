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
  x: number; // top-left x coordinate
  y: number; // top-left y coordinate
  cells: { x: number; y: number }[]; // all coordinates this room occupies
  doors: Door[];
}

interface RoomSizes {
  startRoom: { width: number; height: number };
  northRoom: { width: number; height: number };
  middleRoom: { width: number; height: number };
  bossRoom: { width: number; height: number };
  randomRooms: Array<{ width: number; height: number }>;
  hasMiddleRoom?: boolean;
}

interface RoomTemplate {
  width: number;
  height: number;
}

export class DungeonGenerator {
  private rooms: Room[] = [];
  private grid: boolean[][] = [];

  constructor(private gridSize: number = 100) {
    this.grid = Array.from({ length: gridSize }, () =>
      new Array(gridSize).fill(false)
    );
  }

  private canPlaceRoom(
    width: number,
    height: number,
    x: number,
    y: number,
    lastRoom: Room,
    lastRoomCell: { x: number; y: number },
    direction: { dx: number; dy: number; dir: string }
  ): Room | null {
    const possibleRooms: Room[] = [];
    const roomTypes = ["1x3", "2x2", "1x1"] as const;

    // Try different positions along the direction
    for (let offsetY = -height + 1; offsetY < height; offsetY++) {
      for (let offsetX = -width + 1; offsetX < width; offsetX++) {
        const tryX = x + offsetX;
        const tryY = y + offsetY;
        let canPlace = true;

        // Check if this position works
        for (let dx = 0; dx < width; dx++) {
          for (let dy = 0; dy < height; dy++) {
            const checkX = tryX + dx;
            const checkY = tryY + dy;

            if (
              checkX < 0 ||
              checkX >= this.gridSize ||
              checkY < 0 ||
              checkY >= this.gridSize ||
              this.grid[checkY][checkX]
            ) {
              canPlace = false;
              break;
            }
          }
          if (!canPlace) break;
        }

        // Check if both door positions would be valid
        const doorX = lastRoomCell.x + direction.dx;
        const doorY = lastRoomCell.y + direction.dy;
        const wouldHaveDoorCell =
          tryX <= doorX &&
          doorX < tryX + width &&
          tryY <= doorY &&
          doorY < tryY + height;

        // Check if both doors can be placed
        const canPlaceFirstDoor = this.isValidDoorPosition(
          lastRoom,
          lastRoomCell.x,
          lastRoomCell.y
        );
        const tempRoom: Room = {
          id: "temp",
          type: "2x2",
          width,
          height,
          x: tryX,
          y: tryY,
          cells: [],
          doors: [],
        };
        // Mark cells for the temporary room
        for (let dx = 0; dx < width; dx++) {
          for (let dy = 0; dy < height; dy++) {
            tempRoom.cells.push({ x: tryX + dx, y: tryY + dy });
          }
        }
        const canPlaceSecondDoor = this.isValidDoorPosition(
          tempRoom,
          doorX,
          doorY
        );

        if (
          canPlace &&
          wouldHaveDoorCell &&
          canPlaceFirstDoor &&
          canPlaceSecondDoor
        ) {
          // If we can place a room and both doors
          possibleRooms.push({
            id: `room-${Math.random().toString(36).substr(2, 9)}`,
            type: roomTypes[Math.floor(Math.random() * roomTypes.length)],
            width,
            height,
            x: tryX,
            y: tryY,
            cells: [],
            doors: [],
          });
        }
      }
    }

    // Return a random valid position if any exist
    return possibleRooms.length > 0
      ? possibleRooms[Math.floor(Math.random() * possibleRooms.length)]
      : null;
  }

  private markRoomOnGrid(room: Room) {
    room.cells = [];
    for (let dx = 0; dx < room.width; dx++) {
      for (let dy = 0; dy < room.height; dy++) {
        const cellX = room.x + dx;
        const cellY = room.y + dy;
        this.grid[cellY][cellX] = true;
        room.cells.push({ x: cellX, y: cellY });
      }
    }
  }

  private isValidDirection(
    x: number,
    y: number,
    dx: number,
    dy: number
  ): boolean {
    const checkX = x + dx;
    const checkY = y + dy;

    if (
      checkX < 0 ||
      checkX >= this.gridSize ||
      checkY < 0 ||
      checkY >= this.gridSize
    ) {
      return false;
    }

    return !this.grid[checkY][checkX];
  }

  private isValidDoorPosition(room: Room, x: number, y: number): boolean {
    // First check if the cell exists in the room
    const hasCell = room.cells.some((cell) => cell.x === x && cell.y === y);
    if (!hasCell) return false;

    // Then check if there's already a door at this position
    const hasDoor = room.doors.some((door) => door.x === x && door.y === y);
    return !hasDoor;
  }

  createStartRooms(roomSizes: RoomSizes): Room[] {
    const startRoom: Room = {
      id: "start",
      type: "2x2",
      width: roomSizes.startRoom.width,
      height: roomSizes.startRoom.height,
      x: 50,
      y: 50,
      cells: [],
      doors: [
        // { x: 50, y: 49, direction: "north" }, // Door to the north room
      ],
    };

    const northRoom: Room = {
      id: "north-start",
      type: "2x2",
      width: roomSizes.northRoom.width,
      height: roomSizes.northRoom.height,
      x: 50,
      y: 48, // Moved up to accommodate size
      cells: [],
      doors: [
        { x: 50, y: 50, direction: "south" }, // Door to the start room
      ],
    };

    this.markRoomOnGrid(startRoom);
    // this.markRoomOnGrid(northRoom);
    this.rooms.push(
      startRoom
      // northRoom
    );

    return [startRoom, northRoom];
  }

  createShortestPath(pathLength: number, roomSizes: RoomSizes): Room[] {
    const maxPathAttempts = 50;
    let pathAttempt = 0;

    while (pathAttempt < maxPathAttempts) {
      try {
        // Reset state
        this.rooms = [];
        this.grid = Array.from({ length: this.gridSize }, () =>
          new Array(this.gridSize).fill(false)
        );

        const startRooms = this.createStartRooms(roomSizes);
        let lastRoom = startRooms[0];
        const middleRoomIndex = Math.floor(pathLength / 2);

        for (let i = 0; i < pathLength; i++) {
          let roomTypes = roomSizes.randomRooms;
          let isBossRoom = i === pathLength - 1;

          // Force middle room size at the middle point if enabled
          if (roomSizes.hasMiddleRoom && i === middleRoomIndex) {
            roomTypes = [
              {
                width: roomSizes.middleRoom.width,
                height: roomSizes.middleRoom.height,
              },
            ];
          } else if (isBossRoom) {
            roomTypes = [
              {
                width: roomSizes.bossRoom.width,
                height: roomSizes.bossRoom.height,
              },
            ];
          }

          let placed = false;
          let attempts = 0;
          const maxAttempts = 100;

          while (!placed && attempts < maxAttempts) {
            const template: RoomTemplate =
              i === middleRoomIndex
                ? roomTypes[0]
                : isBossRoom
                ? roomTypes[0]
                : roomTypes[Math.floor(Math.random() * roomTypes.length)];

            // Use different direction options for first room vs others
            const directions =
              i === 0
                ? [
                    { dx: 1, dy: 0, dir: "west" },
                    { dx: 0, dy: 1, dir: "north" },
                    { dx: -1, dy: 0, dir: "east" },
                  ]
                : [
                    { dx: 1, dy: 0, dir: "west" },
                    { dx: -1, dy: 0, dir: "east" },
                    { dx: 0, dy: -1, dir: "south" },
                    { dx: 0, dy: 1, dir: "north" },
                  ];

            const validDirections = directions.filter((dir) =>
              this.isValidDirection(lastRoom.x, lastRoom.y, dir.dx, dir.dy)
            );

            if (validDirections.length === 0) {
              attempts++;
              continue;
            }

            const direction =
              validDirections[
                Math.floor(Math.random() * validDirections.length)
              ];

            // For first room, always connect from the start room's center
            const lastRoomCell =
              i === 0
                ? { x: lastRoom.x, y: lastRoom.y }
                : lastRoom.cells[
                    Math.floor(Math.random() * lastRoom.cells.length)
                  ];

            const newRoom: Room = {
              id:
                i === middleRoomIndex
                  ? "middle-room"
                  : isBossRoom
                  ? "boss-room"
                  : `room-${i}`,
              type: "2x2",
              width: template.width,
              height: template.height,
              x: lastRoomCell.x + direction.dx,
              y: lastRoomCell.y + direction.dy,
              cells: [],
              doors: [],
            };
            const validRoom = this.canPlaceRoom(
              template.width,
              template.height,
              newRoom.x,
              newRoom.y,
              lastRoom,
              lastRoomCell,
              direction
            );
            if (validRoom) {
              validRoom.id = newRoom.id;
              this.markRoomOnGrid(validRoom);

              const doorDirection = direction.dir as DoorDirection;
              const oppositeDirections: Record<DoorDirection, DoorDirection> = {
                north: "south",
                south: "north",
                east: "west",
                west: "east",
              };

              // Add door to the last room at the connection point
              if (
                this.isValidDoorPosition(
                  lastRoom,
                  lastRoomCell.x,
                  lastRoomCell.y
                )
              ) {
                lastRoom.doors.push({
                  x: lastRoomCell.x,
                  y: lastRoomCell.y,
                  direction: doorDirection,
                });
              }

              // Add matching door to the new room
              const newDoorX = lastRoomCell.x + direction.dx;
              const newDoorY = lastRoomCell.y + direction.dy;
              if (this.isValidDoorPosition(validRoom, newDoorX, newDoorY)) {
                validRoom.doors.push({
                  x: newDoorX,
                  y: newDoorY,
                  direction: oppositeDirections[doorDirection],
                });
              }

              this.rooms.push(validRoom);
              lastRoom = validRoom;
              placed = true;
            }
            attempts++;
          }

          if (!placed) {
            throw new Error("Room placement failed");
          }
        }

        return this.rooms;
      } catch (error) {
        pathAttempt++;
        if (pathAttempt >= maxPathAttempts) {
          throw new Error("Failed to generate path after multiple attempts");
        }
      }
    }

    throw new Error("Unexpected path generation failure");
  }

  createOffshoots(numOffshoots: number, depth: number): Room[] {
    for (let offshoot = 0; offshoot < numOffshoots; offshoot++) {
      // Filter out special rooms (start, north-start, and middle room)
      const availableRooms = this.rooms.filter(
        (room) =>
          room.id !== "start" &&
          room.id !== "north-start" &&
          room.id !== "middle-room" &&
          !room.id.startsWith("offshoot") // Also exclude existing offshoots
      );

      if (availableRooms.length === 0) {
        break;
      }

      const startingRoom =
        availableRooms[Math.floor(Math.random() * availableRooms.length)];
      let currentRoom = startingRoom;

      // Create a branch of rooms up to the specified depth
      for (let d = 0; d < depth; d++) {
        const roomTypes = [
          { type: "2x2", width: 2, height: 2 },
          { type: "1x3", width: 1, height: 3 },
          { type: "1x3", width: 3, height: 1 },
          { type: "3x3", width: 3, height: 3 },
        ];

        let placed = false;
        let attempts = 0;
        const maxAttempts = 30;

        while (!placed && attempts < maxAttempts) {
          const randomRoom =
            roomTypes[Math.floor(Math.random() * roomTypes.length)];
          const directions = [
            { dx: 1, dy: 0, dir: "west" },
            { dx: -1, dy: 0, dir: "east" },
            { dx: 0, dy: -1, dir: "south" },
            { dx: 0, dy: 1, dir: "north" },
          ];

          const validDirections = directions.filter((dir) =>
            this.isValidDirection(currentRoom.x, currentRoom.y, dir.dx, dir.dy)
          );

          if (validDirections.length === 0) {
            attempts++;
            continue;
          }

          const direction =
            validDirections[Math.floor(Math.random() * validDirections.length)];

          // Pick a random cell from the current room to connect from
          const currentRoomCell =
            currentRoom.cells[
              Math.floor(Math.random() * currentRoom.cells.length)
            ];

          const newRoom: Room = {
            id: `offshoot-${offshoot}-${d}`,
            type: randomRoom.type as "1x3" | "2x2" | "1x1",
            width: randomRoom.width,
            height: randomRoom.height,
            x: currentRoomCell.x + direction.dx,
            y: currentRoomCell.y + direction.dy,
            cells: [],
            doors: [],
          };

          const validRoom = this.canPlaceRoom(
            randomRoom.width,
            randomRoom.height,
            newRoom.x,
            newRoom.y,
            currentRoom,
            currentRoomCell,
            direction
          );
          if (validRoom) {
            validRoom.id = newRoom.id;
            this.markRoomOnGrid(validRoom);

            const doorDirection = direction.dir as DoorDirection;
            const oppositeDirections: Record<DoorDirection, DoorDirection> = {
              north: "south",
              south: "north",
              east: "west",
              west: "east",
            };

            // Add doors between rooms
            if (
              this.isValidDoorPosition(
                currentRoom,
                currentRoomCell.x,
                currentRoomCell.y
              )
            ) {
              currentRoom.doors.push({
                x: currentRoomCell.x,
                y: currentRoomCell.y,
                direction: doorDirection,
              });
            }

            const newDoorX = currentRoomCell.x + direction.dx;
            const newDoorY = currentRoomCell.y + direction.dy;
            if (this.isValidDoorPosition(validRoom, newDoorX, newDoorY)) {
              validRoom.doors.push({
                x: newDoorX,
                y: newDoorY,
                direction: oppositeDirections[doorDirection],
              });
            }

            this.rooms.push(validRoom);
            currentRoom = validRoom;
            placed = true;
          }
          attempts++;
        }

        // If we couldn't place a room, stop this branch
        if (!placed) break;
      }
    }
    return this.rooms;
  }

  getRooms() {
    return this.rooms;
  }
}
