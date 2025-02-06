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

  private canPlaceRoom(room: Room): boolean {
    for (let dx = 0; dx < room.width; dx++) {
      for (let dy = 0; dy < room.height; dy++) {
        const checkX = room.x + dx;
        const checkY = room.y + dy;

        if (
          checkX < 0 ||
          checkX >= this.gridSize ||
          checkY < 0 ||
          checkY >= this.gridSize
        ) {
          return false;
        }

        if (this.grid[checkY][checkX]) {
          return false;
        }
      }
    }
    return true;
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
        { x: 50, y: 49, direction: "north" }, // Door to the north room
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
    this.markRoomOnGrid(northRoom);
    this.rooms.push(startRoom, northRoom);

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

          // Force middle room size at the middle point
          if (i === middleRoomIndex) {
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
                    { dx: 1, dy: 0, dir: "west" }, // right
                    { dx: 0, dy: 1, dir: "north" }, // down
                    { dx: -1, dy: 0, dir: "east" }, // left
                  ]
                : [
                    { dx: 1, dy: 0, dir: "west" }, // right
                    { dx: -1, dy: 0, dir: "east" }, // left
                    { dx: 0, dy: -1, dir: "south" }, // up
                    { dx: 0, dy: 1, dir: "north" }, // down
                  ];

            const direction =
              directions[Math.floor(Math.random() * directions.length)];

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
              type: "2x2", // Default type, actual dimensions come from template
              width: template.width,
              height: template.height,
              x: lastRoomCell.x + direction.dx,
              y: lastRoomCell.y + direction.dy,
              cells: [],
              doors: [],
            };

            if (this.canPlaceRoom(newRoom)) {
              this.markRoomOnGrid(newRoom);

              const doorDirection = direction.dir as DoorDirection;
              const oppositeDirections: Record<DoorDirection, DoorDirection> = {
                north: "south",
                south: "north",
                east: "west",
                west: "east",
              };

              // Add door to the last room at the connection point
              lastRoom.doors.push({
                x: lastRoomCell.x,
                y: lastRoomCell.y,
                direction: doorDirection,
              });

              // Add matching door to the new room
              newRoom.doors.push({
                x: lastRoomCell.x + direction.dx,
                y: lastRoomCell.y + direction.dy,
                direction: oppositeDirections[doorDirection],
              });

              this.rooms.push(newRoom);
              lastRoom = newRoom;
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
        console.log("No available rooms for offshoots");
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
            { dx: 1, dy: 0, dir: "west" }, // right
            { dx: -1, dy: 0, dir: "east" }, // left
            { dx: 0, dy: -1, dir: "south" }, // up
            { dx: 0, dy: 1, dir: "north" }, // down
          ];
          const direction =
            directions[Math.floor(Math.random() * directions.length)];

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

          if (this.canPlaceRoom(newRoom)) {
            this.markRoomOnGrid(newRoom);

            const doorDirection = direction.dir as DoorDirection;
            const oppositeDirections: Record<DoorDirection, DoorDirection> = {
              north: "south",
              south: "north",
              east: "west",
              west: "east",
            };

            // Add doors between rooms
            currentRoom.doors.push({
              x: currentRoomCell.x,
              y: currentRoomCell.y,
              direction: doorDirection,
            });

            newRoom.doors.push({
              x: currentRoomCell.x + direction.dx,
              y: currentRoomCell.y + direction.dy,
              direction: oppositeDirections[doorDirection],
            });

            this.rooms.push(newRoom);
            currentRoom = newRoom;
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
