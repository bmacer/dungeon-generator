type DoorDirection = "north" | "south" | "east" | "west";
type CardinalDirection = DoorDirection;

interface Door {
  x: number;
  y: number;
  direction: DoorDirection;
}

interface Room {
  id: string;
  width: number;
  height: number;
  x: number;
  y: number;
  cells: Point[];
  doors: Door[];
  difficulty: number;
  templateId: string;
}

interface Point {
  x: number;
  y: number;
}

interface BasePoint extends Point {
  baseX: number;
  baseY: number;
}

interface StaticRoomPosition {
  width: number;
  height: number;
  stepsFromPrevious: number;
  index: number;
  doorCells: Point[];
  templateId: string;
}

interface RandomRoom {
  width: number;
  height: number;
  doorCells: { x: number; y: number }[];
  templateId: string;
}

interface RoomTemplate {
  width: number;
  height: number;
  doorCells: Point[];
  templateId: string;
}

interface RoomSizes {
  startRoom: RoomTemplate;
  gnellenStartRoom: RoomTemplate;
  staticRoomPositions: StaticRoomPosition[];
  bossRoom: RoomTemplate;
  randomRoomTemplates: RoomTemplate[];
}

interface FirstRoomConfig {
  doorOffset: Point;
  direction: CardinalDirection;
}

const OPPOSITE_DIRECTIONS: Record<CardinalDirection, CardinalDirection> = {
  north: "south",
  south: "north",
  east: "west",
  west: "east",
};

const DIRECTIONS = [
  { dx: 1, dy: 0, dir: "east" as const },
  { dx: -1, dy: 0, dir: "west" as const },
  { dx: 0, dy: -1, dir: "north" as const },
  { dx: 0, dy: 1, dir: "south" as const },
] as const;

export class DungeonGenerator {
  private rooms: Room[] = [];
  private grid: boolean[][] = [];

  constructor(private gridSize: number = 100) {
    this.resetGrid();
  }

  private resetGrid(): void {
    this.grid = Array.from({ length: this.gridSize }, () =>
      new Array(this.gridSize).fill(false)
    );
  }

  private isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize;
  }

  private canPlaceRoom(
    width: number,
    height: number,
    x: number,
    y: number,
    lastRoom: Room,
    lastRoomCell: Point,
    direction: (typeof DIRECTIONS)[number]
  ): Room | null {
    const possibleRooms: Room[] = [];

    for (let offsetY = -height + 1; offsetY < height; offsetY++) {
      for (let offsetX = -width + 1; offsetX < width; offsetX++) {
        const tryX = x + offsetX;
        const tryY = y + offsetY;

        if (
          !this.isLocationAvailableForRoom({ x: tryX, y: tryY }, width, height)
        ) {
          continue;
        }

        const doorX = lastRoomCell.x + direction.dx;
        const doorY = lastRoomCell.y + direction.dy;
        const wouldHaveDoorCell =
          tryX <= doorX &&
          doorX < tryX + width &&
          tryY <= doorY &&
          doorY < tryY + height;

        const canPlaceFirstDoor = this.isValidDoorPosition(
          lastRoom,
          lastRoomCell.x,
          lastRoomCell.y
        );
        const tempRoom: Room = {
          id: "temp",
          width,
          height,
          x: tryX,
          y: tryY,
          cells: this.generateRoomCells(tryX, tryY, width, height),
          doors: [],
          difficulty: 0,
          templateId: "",
        };

        const canPlaceSecondDoor = this.isValidDoorPosition(
          tempRoom,
          doorX,
          doorY
        );

        if (wouldHaveDoorCell && canPlaceFirstDoor && canPlaceSecondDoor) {
          possibleRooms.push({
            ...tempRoom,
            id: this.generateRoomId(),
          });
        }
      }
    }

    return possibleRooms.length > 0
      ? possibleRooms[Math.floor(Math.random() * possibleRooms.length)]
      : null;
  }

  private generateRoomId(): string {
    return `room-${Math.random().toString(36).slice(2, 11)}`;
  }

  private generateRoomCells(
    x: number,
    y: number,
    width: number,
    height: number
  ): Point[] {
    const cells: Point[] = [];
    for (let dx = 0; dx < width; dx++) {
      for (let dy = 0; dy < height; dy++) {
        cells.push({ x: x + dx, y: y + dy });
      }
    }
    return cells;
  }

  private markRoomOnGrid(room: Room): void {
    room.cells = this.generateRoomCells(
      room.x,
      room.y,
      room.width,
      room.height
    );
    room.cells.forEach(({ x, y }) => {
      this.grid[y][x] = true;
    });
  }

  private isValidDirection(point: Point, dx: number, dy: number): boolean {
    const checkX = point.x + dx;
    const checkY = point.y + dy;
    return this.isInBounds(checkX, checkY) && !this.grid[checkY][checkX];
  }

  private isValidDoorPosition(room: Room, x: number, y: number): boolean {
    const hasCell = room.cells.some((cell) => cell.x === x && cell.y === y);
    if (!hasCell) return false;
    return !room.doors.some((door) => door.x === x && door.y === y);
  }

  private isLocationAvailableForRoom(
    location: { x: number; y: number },
    roomWidth: number,
    roomHeight: number
  ): boolean {
    let returnValue = true;
    for (let dx = 0; dx < roomWidth; dx++) {
      for (let dy = 0; dy < roomHeight; dy++) {
        const checkX = location.x + dx;
        const checkY = location.y + dy;

        if (
          checkX < 0 ||
          checkX >= this.gridSize ||
          checkY < 0 ||
          checkY >= this.gridSize ||
          this.grid[checkY][checkX]
        ) {
          returnValue = false;
        }
      }
    }
    return returnValue;
  }

  private isDoorLocationValid(
    location: {
      x: number;
      y: number;
      baseX: number;
      baseY: number;
    },
    randomRoom: RandomRoom
  ): boolean {
    const isWithinRoom = randomRoom.doorCells.some(
      (cell) => cell.x === location.baseX && cell.y === location.baseY
    );
    return isWithinRoom;
  }

  private createRoom(
    room: {
      width: number;
      height: number;
      doorCells: Point[];
      templateId?: string;
    },
    location: {
      x: number;
      y: number;
      baseX: number;
      baseY: number;
    },
    doorDirection: "north" | "south" | "east" | "west"
  ) {
    let cells = [];
    for (let dx = 0; dx < room.width; dx++) {
      for (let dy = 0; dy < room.height; dy++) {
        cells.push({ x: location.x + dx, y: location.y + dy });
      }
    }
    const newRoom: Room = {
      id: `room-${Math.random().toString(36).substr(2, 9)}`,
      width: room.width,
      height: room.height,
      x: location.x,
      y: location.y,
      cells,
      doors: [
        {
          x: location.x + location.baseX,
          y: location.y + location.baseY,
          direction: doorDirection,
        },
      ],
      difficulty: 0,
      templateId: room.templateId || "",
    };
    this.rooms.push(newRoom);
    this.markRoomOnGrid(newRoom);
    return newRoom;
  }

  private getNextDoorLocation(
    room: Room,
    randomRoomTemplates: RoomTemplate[],
    randomLocation: { x: number; y: number; baseX: number; baseY: number }
  ) {
    const doorCells = room.doors;
    console.log("room", room);
    const template = randomRoomTemplates.find(
      (t: any) => t.templateId === room.templateId
    );
    if (!template) {
      console.log("no template");
      throw new Error("Template not found");
    }
    const filteredDoorCells = template.doorCells.filter((cell) => {
      return cell.x !== randomLocation.baseX || cell.y !== randomLocation.baseY;
    });
    if (filteredDoorCells.length === 0) {
      throw new Error("No valid door cells found");
    }
    const randomDoorCell =
      filteredDoorCells[Math.floor(Math.random() * filteredDoorCells.length)];
    return {
      x: randomDoorCell.x + randomLocation.x,
      y: randomDoorCell.y + randomLocation.y,
      direction: "north",
    };
  }

  private addDoorToCurrentRoom(
    currentRoom: Room,
    currentRoomDoorLocation: { x: number; y: number; direction: string }
  ) {
    currentRoom.doors.push({
      x: currentRoomDoorLocation.x,
      y: currentRoomDoorLocation.y,
      direction: currentRoomDoorLocation.direction as CardinalDirection,
    });

    return currentRoom;
  }

  private getBaseCoordinates(
    direction: CardinalDirection,
    roomDimensions: { width: number; height: number },
    offset: number
  ): BasePoint {
    switch (direction) {
      case "east":
        return { x: 0, y: offset, baseX: 0, baseY: offset };
      case "west":
        return {
          x: roomDimensions.width - 1,
          y: offset,
          baseX: roomDimensions.width - 1,
          baseY: offset,
        };
      case "north":
        return {
          x: offset,
          y: roomDimensions.height - 1,
          baseX: offset,
          baseY: roomDimensions.height - 1,
        };
      case "south":
        return { x: offset, y: 0, baseX: offset, baseY: 0 };
    }
  }

  createStartRooms(roomSizes: RoomSizes): Room[] {
    const startRoom: Room = {
      id: "start",
      width: roomSizes.startRoom.width,
      height: roomSizes.startRoom.height,
      x: 50,
      y: 50,
      cells: [],
      doors: [{ x: 51, y: 50, direction: "north" }],
      difficulty: 0,
      templateId: "",
    };

    const gnellenStartRoom: Room = {
      id: "gnellen-start",
      width: roomSizes.gnellenStartRoom.width,
      height: roomSizes.gnellenStartRoom.height,
      x: 50,
      y: 48,
      cells: [],
      doors: [{ x: 51, y: 49, direction: "south" }],
      difficulty: 0,
      templateId: "",
    };

    this.markRoomOnGrid(startRoom);
    this.markRoomOnGrid(gnellenStartRoom);
    this.rooms.push(startRoom, gnellenStartRoom);

    return [startRoom, gnellenStartRoom];
  }

  private addDoorToFirstRoom(firstRoomConfig?: FirstRoomConfig): void {
    if (!firstRoomConfig) return;
    const room = this.rooms.find((r) => r.id === "start");
    room?.doors.push({
      x: room.x + firstRoomConfig.doorOffset.x,
      y: room.y + firstRoomConfig.doorOffset.y,
      direction: firstRoomConfig.direction,
    });
  }

  createShortestPath(
    pathLength: number,
    roomSizes: RoomSizes,
    firstRoomConfig?: FirstRoomConfig
  ): Room[] {
    const maxPathAttempts = 300;
    let pathAttempt = 0;
    let currentDifficulty = 0;

    outerLoop: while (pathAttempt < maxPathAttempts) {
      try {
        // Reset state
        this.rooms = [];
        this.resetGrid();
        currentDifficulty = 0;

        const startRooms = this.createStartRooms(roomSizes);
        let currentRoom = this.rooms.find((room) => room.id === "start");
        if (!currentRoom) {
          throw new Error("First room not found");
        }
        this.addDoorToFirstRoom(firstRoomConfig);
        const { randomRoomTemplates, staticRoomPositions } = roomSizes;

        const directions = [
          { dx: 1, dy: 0, dir: "east" },
          { dx: -1, dy: 0, dir: "west" },
          { dx: 0, dy: -1, dir: "north" },
          { dx: 0, dy: 1, dir: "south" },
        ];

        let currentRoomDoorLocation: {
          x: number;
          y: number;
          direction: string;
        } = currentRoom.doors[1];

        let potentialNextDirections;

        let createdRooms = 0;

        let staticRoomIndex = 0;
        let staticRoomSteps = -1;
        let staticRoomIndexes = [];
        for (let staticRoom of staticRoomPositions) {
          staticRoomSteps += staticRoom.stepsFromPrevious;
          staticRoomIndexes.push(staticRoomSteps);
        }

        while (true) {
          if (pathAttempt >= maxPathAttempts) {
            console.log(`Attempts: ${pathAttempt}`);
            throw new Error(
              `xxx Failed to generate path after ${pathAttempt} attempts`
            );
          }
          potentialNextDirections = directions.filter((dir) =>
            this.isValidDirection(currentRoomDoorLocation, dir.dx, dir.dy)
          );
          if (potentialNextDirections.length === 0) {
            pathAttempt++;
            continue outerLoop;
          }

          let randomDirection:
            | {
                dx: number;
                dy: number;
                dir: string;
              }
            | undefined =
            potentialNextDirections[
              Math.floor(Math.random() * potentialNextDirections.length)
            ];

          currentRoomDoorLocation.direction = randomDirection.dir;
          if (createdRooms !== 0) {
            this.addDoorToCurrentRoom(currentRoom, currentRoomDoorLocation);
          }
          let newDoorLocation = {
            x: currentRoomDoorLocation.x + randomDirection.dx,
            y: currentRoomDoorLocation.y + randomDirection.dy,
          };
          const randomIndex = Math.floor(
            Math.random() * randomRoomTemplates.length
          );
          let randomRoom = {
            ...randomRoomTemplates[randomIndex],
            doorCells: randomRoomTemplates[randomIndex].doorCells || [],
          };
          // console.log("REAL randomRoom", randomRoom);
          if (staticRoomIndexes.includes(createdRooms)) {
            newDoorLocation = {
              x: currentRoomDoorLocation.x + randomDirection.dx,
              y: currentRoomDoorLocation.y + randomDirection.dy,
            };
            let staticRoom = staticRoomPositions[staticRoomIndex];

            let staticPossibleLocationsForNewRoom = [];
            if (randomDirection.dir === "west") {
              for (let i = 0; i < staticRoom.height; i++) {
                const { baseX, baseY } = this.getBaseCoordinates(
                  randomDirection.dir,
                  staticRoom,
                  i
                );
                staticPossibleLocationsForNewRoom.push({
                  x: newDoorLocation.x - staticRoom.width + 1,
                  y: newDoorLocation.y - i,
                  baseX,
                  baseY,
                });
              }
            }
            if (randomDirection.dir === "east") {
              for (let i = 0; i < staticRoom.height; i++) {
                const { baseX, baseY } = this.getBaseCoordinates(
                  randomDirection.dir,
                  staticRoom,
                  i
                );
                staticPossibleLocationsForNewRoom.push({
                  x: newDoorLocation.x,
                  y: newDoorLocation.y - i,
                  baseX,
                  baseY,
                });
              }
            }
            if (randomDirection.dir === "north") {
              for (let i = 0; i < staticRoom.width; i++) {
                console.log("newDoorLocation", newDoorLocation);
                const { baseX, baseY } = this.getBaseCoordinates(
                  randomDirection.dir,
                  staticRoom,
                  i
                );
                staticPossibleLocationsForNewRoom.push({
                  x: newDoorLocation.x - i,
                  y: newDoorLocation.y - staticRoom.height + 1,
                  baseX,
                  baseY,
                });
              }
            }
            if (randomDirection.dir === "south") {
              for (let i = 0; i < staticRoom.width; i++) {
                const { baseX, baseY } = this.getBaseCoordinates(
                  randomDirection.dir,
                  staticRoom,
                  i
                );
                staticPossibleLocationsForNewRoom.push({
                  x: newDoorLocation.x - i,
                  y: newDoorLocation.y,
                  baseX,
                  baseY,
                });
              }
            }
            console.log(
              "staticPossibleLocationsForNewRoom",
              staticPossibleLocationsForNewRoom
            );
            staticPossibleLocationsForNewRoom =
              staticPossibleLocationsForNewRoom.filter((location: any) => {
                const locationIsAvailable = this.isLocationAvailableForRoom(
                  location,
                  staticRoom.width,
                  staticRoom.height
                );
                console.log("locationIsAvailable", locationIsAvailable);
                const locationIsValid = this.isDoorLocationValid(
                  location,
                  staticRoom
                );
                console.log(
                  "locationIsValid",
                  locationIsValid,
                  location,
                  staticRoom
                );
                return locationIsAvailable && locationIsValid;
              });
            console.log(
              "2staticPossibleLocationsForNewRoom",
              staticPossibleLocationsForNewRoom
            );
            // return [];

            if (staticPossibleLocationsForNewRoom.length === 0) {
              pathAttempt++;
              continue outerLoop;
            }

            const staticRandomLocation =
              staticPossibleLocationsForNewRoom[
                Math.floor(
                  Math.random() * staticPossibleLocationsForNewRoom.length
                )
              ];

            currentRoom = this.createRoom(
              staticRoom,
              staticRandomLocation,
              OPPOSITE_DIRECTIONS[randomDirection.dir as CardinalDirection]
            );
            // return this.rooms;

            createdRooms += 1;
            // Set a new location randomly based on the room and template and doors available
            currentRoomDoorLocation = this.getNextDoorLocation(
              currentRoom,
              staticRoomPositions,
              staticRandomLocation
            );
            // return [];

            console.log("xxx currentRoomDoorLocation", currentRoomDoorLocation);

            if (createdRooms >= pathLength) {
              break;
            }

            console.log("xxx brandon");

            pathAttempt++;

            staticRoomIndex++;
          } else {
            let possibleLocationsForNewRoom = [];
            if (
              randomDirection.dir === "east" ||
              randomDirection.dir === "west"
            ) {
              for (let i = 0; i < randomRoom.height; i++) {
                const { baseX, baseY } = this.getBaseCoordinates(
                  randomDirection.dir,
                  randomRoom,
                  i
                );
                possibleLocationsForNewRoom.push({
                  x: newDoorLocation.x,
                  y: newDoorLocation.y - i,
                  baseX,
                  baseY,
                });
              }
            }
            if (randomDirection.dir === "north") {
              for (let i = 0; i < randomRoom.width; i++) {
                const { baseX, baseY } = this.getBaseCoordinates(
                  randomDirection.dir,
                  randomRoom,
                  i
                );
                possibleLocationsForNewRoom.push({
                  x: newDoorLocation.x - i,
                  y: newDoorLocation.y,
                  baseX,
                  baseY,
                });
              }
            }
            if (randomDirection.dir === "south") {
              console.log("south");
              for (let i = 0; i < randomRoom.width; i++) {
                const { baseX, baseY } = this.getBaseCoordinates(
                  randomDirection.dir,
                  randomRoom,
                  i
                );
                possibleLocationsForNewRoom.push({
                  x: newDoorLocation.x - i,
                  y: newDoorLocation.y,
                  baseX,
                  baseY,
                });
              }
            }
            console.log(
              "possibleLocationsForNewRoom",
              possibleLocationsForNewRoom
            );
            possibleLocationsForNewRoom = possibleLocationsForNewRoom.filter(
              (location: any) =>
                this.isLocationAvailableForRoom(
                  location,
                  randomRoom.width,
                  randomRoom.height
                ) && this.isDoorLocationValid(location, randomRoom)
            );
            console.log(
              "2possibleLocationsForNewRoom",
              possibleLocationsForNewRoom
            );
            if (possibleLocationsForNewRoom.length === 0) {
              pathAttempt++;
              continue outerLoop;
            }

            const randomLocation =
              possibleLocationsForNewRoom[
                Math.floor(Math.random() * possibleLocationsForNewRoom.length)
              ];
            console.log("randomLocation", randomLocation);
            currentRoom = this.createRoom(
              randomRoom,
              randomLocation,
              OPPOSITE_DIRECTIONS[randomDirection.dir as CardinalDirection]
            );
            console.log("currentRoom", currentRoom);

            createdRooms += 1;

            // Pick a new random door location
            let newDoors = this.rooms[createdRooms - 1];

            // Set a new location randomly based on the room and template and doors available
            currentRoomDoorLocation = this.getNextDoorLocation(
              currentRoom,
              randomRoomTemplates,
              randomLocation
            );

            if (createdRooms >= pathLength) {
              break;
            }

            pathAttempt++;
          }
        }

        console.log(`Attempts: ${pathAttempt}`);
        return startRooms;
      } catch {
        pathAttempt++;
        if (pathAttempt >= maxPathAttempts) {
          throw new Error(
            `xxx Failed to generate path after ${pathAttempt} attempts`
          );
        }
      }
    }
    console.log(`Attempts: ${pathAttempt}`);

    throw new Error("Unexpected path generation failure");
  }

  createOffshoots(
    numOffshoots: number,
    depth: number,
    randomRooms: Array<{
      width: number;
      height: number;
      doorCells: Point[];
      templateId: string;
    }>
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
            !room.id.includes("boss-room") &&
            !room.id.includes("static-room") &&
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
          const randomIndex = Math.floor(Math.random() * randomRooms.length);
          const randomRoom = {
            ...randomRooms[randomIndex],
            doorCells: randomRooms[randomIndex].doorCells || [],
          };

          let placed = false;
          let attempts = 0;
          const maxAttempts = 3000;

          while (!placed && attempts < maxAttempts) {
            if (attempts % 500 === 0) {
              console.log("attempts", attempts);
            }
            const directions = [
              { dx: 1, dy: 0, dir: "east" },
              { dx: -1, dy: 0, dir: "west" },
              { dx: 0, dy: -1, dir: "north" },
              { dx: 0, dy: 1, dir: "south" },
            ];

            const validDirections = directions.filter((dir) =>
              this.isValidDirection(currentRoom, dir.dx, dir.dy)
            );

            if (validDirections.length === 0) {
              attempts++;
              continue;
            }

            const direction = validDirections[
              Math.floor(Math.random() * validDirections.length)
            ] as (typeof DIRECTIONS)[number];

            // Pick a random cell from the current room to connect from
            const currentRoomCell =
              currentRoom.cells[
                Math.floor(Math.random() * currentRoom.cells.length)
              ];

            // Get base coordinates for door placement
            const { baseX, baseY } = this.getBaseCoordinates(
              direction.dir,
              randomRoom,
              Math.floor(
                Math.random() *
                  (direction.dir === "east" || direction.dir === "west"
                    ? randomRoom.width
                    : randomRoom.height)
              )
            );

            const newRoom: Room = {
              id: `offshoot-${createdOffshoots.length}-${d}`,
              width: randomRoom.width,
              height: randomRoom.height,
              x: currentRoomCell.x + direction.dx,
              y: currentRoomCell.y + direction.dy,
              cells: [],
              doors: [],
              difficulty: startingDifficulty,
              templateId: randomRoom.templateId,
            };

            // Check if door location is valid according to template
            const isDoorValid = this.isDoorLocationValid(
              {
                x: newRoom.x,
                y: newRoom.y,
                baseX,
                baseY,
              },
              randomRoom
            );

            const validRoom = isDoorValid
              ? this.canPlaceRoom(
                  randomRoom.width,
                  randomRoom.height,
                  newRoom.x,
                  newRoom.y,
                  currentRoom,
                  currentRoomCell,
                  direction
                )
              : null;
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
