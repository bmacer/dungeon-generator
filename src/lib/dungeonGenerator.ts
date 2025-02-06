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
  difficulty: number; // Difficulty level of the room
}

interface StaticRoomPosition {
  width: number;
  height: number;
  stepsFromPrevious: number;
  index: number;
}

interface RoomSizes {
  startRoom: { width: number; height: number };
  gnellenStartRoom: { width: number; height: number };
  staticRoomPositions: StaticRoomPosition[];
  bossRoom: { width: number; height: number };
  randomRooms: Array<{ width: number; height: number }>;
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
          difficulty: 0,
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
            difficulty: 0,
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
        { x: 51, y: 50, direction: "north" }, // Door to the north room
      ],
      difficulty: 0,
    };

    const gnellenStartRoom: Room = {
      id: "gnellen-start",
      type: "2x2",
      width: roomSizes.gnellenStartRoom.width,
      height: roomSizes.gnellenStartRoom.height,
      x: 50,
      y: 48, // Moved up to accommodate size
      cells: [],
      doors: [
        { x: 51, y: 49, direction: "south" }, // Door to the start room
      ],
      difficulty: 0,
    };

    this.markRoomOnGrid(startRoom);
    this.markRoomOnGrid(gnellenStartRoom);
    this.rooms.push(startRoom, gnellenStartRoom);

    return [startRoom, gnellenStartRoom];
  }

  createShortestPath(pathLength: number, roomSizes: RoomSizes): Room[] {
    const maxPathAttempts = 50;
    let pathAttempt = 0;
    let currentDifficulty = 0;

    while (pathAttempt < maxPathAttempts) {
      try {
        // Reset state
        this.rooms = [];
        this.grid = Array.from({ length: this.gridSize }, () =>
          new Array(this.gridSize).fill(false)
        );
        currentDifficulty = 0;

        const startRooms = this.createStartRooms(roomSizes);
        let lastRoom = startRooms[0];
        let currentStep = 0;
        let nextStaticRoomIndex = 0;

        for (let i = 0; i < pathLength; i++) {
          let roomTypes = roomSizes.randomRooms;
          const isBossRoom = i === pathLength - 1;
          const nextStaticRoom =
            roomSizes.staticRoomPositions[nextStaticRoomIndex];
          const isStaticRoom =
            nextStaticRoom && currentStep === nextStaticRoom.stepsFromPrevious;

          // Force static room or boss room size
          if (isStaticRoom) {
            roomTypes = [
              {
                width: nextStaticRoom.width,
                height: nextStaticRoom.height,
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
              isStaticRoom || isBossRoom
                ? roomTypes[0]
                : roomTypes[Math.floor(Math.random() * roomTypes.length)];

            // Use different direction options for first room vs others
            const directions =
              i === 0
                ? [{ dx: -1, dy: 0, dir: "east" }]
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
              id: isStaticRoom
                ? `static-room-${nextStaticRoomIndex}`
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
              difficulty: currentDifficulty,
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
              validRoom.difficulty = currentDifficulty;
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

              if (isStaticRoom) {
                currentDifficulty++;
                nextStaticRoomIndex++;
                currentStep = 0;
              } else {
                currentStep++;
              }
            }
            attempts++;
          }

          if (!placed) {
            throw new Error("Room placement failed");
          }
        }

        return this.rooms;
      } catch {
        pathAttempt++;
        if (pathAttempt >= maxPathAttempts) {
          throw new Error("Failed to generate path after multiple attempts");
        }
      }
    }

    throw new Error("Unexpected path generation failure");
  }

  createOffshoots(
    numOffshoots: number,
    depth: number,
    randomRooms: Array<{ width: number; height: number }>
  ): Room[] {
    const maxOverallAttempts = 500;
    let overallAttempts = 0;

    while (overallAttempts < maxOverallAttempts) {
      // Reset rooms for this attempt
      const originalRoomCount = this.rooms.length;
      const createdOffshoots: Room[][] = [];

      // Track rooms that have already been used as offshoot starting points
      const usedStartRooms = new Set<string>();

      while (createdOffshoots.length < numOffshoots) {
        // Filter out special rooms and already used rooms
        const availableRooms = this.rooms.slice(0, originalRoomCount).filter(
          (room) =>
            room.id !== "start" &&
            room.id !== "gnellen-start" &&
            room.id !== "middle-room" &&
            !room.id.startsWith("offshoot") && // Exclude existing offshoots
            !usedStartRooms.has(room.id) // Exclude rooms already used as offshoot start
        );

        if (availableRooms.length === 0) {
          break; // No more rooms available to start offshoots
        }

        const startingRoom =
          availableRooms[Math.floor(Math.random() * availableRooms.length)];
        usedStartRooms.add(startingRoom.id);
        const startingDifficulty = startingRoom.difficulty;

        let currentRoom = startingRoom;
        const offshootRooms: Room[] = [startingRoom];

        // Create a branch of rooms up to the specified depth
        for (let d = 0; d < depth; d++) {
          const randomRoom =
            randomRooms[Math.floor(Math.random() * randomRooms.length)];

          let placed = false;
          let attempts = 0;
          const maxAttempts = 300;

          while (!placed && attempts < maxAttempts) {
            const directions = [
              { dx: 1, dy: 0, dir: "west" },
              { dx: -1, dy: 0, dir: "east" },
              { dx: 0, dy: -1, dir: "south" },
              { dx: 0, dy: 1, dir: "north" },
            ];

            const validDirections = directions.filter((dir) =>
              this.isValidDirection(
                currentRoom.x,
                currentRoom.y,
                dir.dx,
                dir.dy
              )
            );

            if (validDirections.length === 0) {
              attempts++;
              continue;
            }

            const direction =
              validDirections[
                Math.floor(Math.random() * validDirections.length)
              ];

            // Pick a random cell from the current room to connect from
            const currentRoomCell =
              currentRoom.cells[
                Math.floor(Math.random() * currentRoom.cells.length)
              ];

            const newRoom: Room = {
              id: `offshoot-${createdOffshoots.length}-${d}`,
              type: "2x2", // Default type, actual dimensions come from template
              width: randomRoom.width,
              height: randomRoom.height,
              x: currentRoomCell.x + direction.dx,
              y: currentRoomCell.y + direction.dy,
              cells: [],
              doors: [],
              difficulty: startingDifficulty,
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
              validRoom.difficulty = startingDifficulty;
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
              offshootRooms.push(validRoom);
              currentRoom = validRoom;
              placed = true;
            }
            attempts++;
          }

          // If we couldn't place a room to full depth, break and retry
          if (!placed) {
            break;
          }
        }

        // Only add offshoot if it reached full depth
        if (offshootRooms.length === depth + 1) {
          createdOffshoots.push(offshootRooms);
        } else {
          // Remove partially created offshoot rooms
          this.rooms = this.rooms.filter(
            (room) => !room.id.startsWith(`offshoot-${createdOffshoots.length}`)
          );
        }
      }

      // Check if we successfully created all required offshoots
      if (createdOffshoots.length === numOffshoots) {
        return this.rooms;
      }

      // If not successful, reset and try again
      this.rooms = this.rooms.slice(0, originalRoomCount);
      overallAttempts++;
    }

    // If we couldn't create offshoots after multiple attempts, return original rooms
    return this.rooms;
  }

  getRooms() {
    return this.rooms;
  }
}
