import { Room } from "./dungeonGenerator";

// Get API base URL from environment variable or use default
const getApiBaseUrl = (environment: "dev" | "prod") => {
  if (environment === "dev") {
    return process.env.NEXT_PUBLIC_API_URL_DEV || "http://localhost:3100";
  }
  return process.env.NEXT_PUBLIC_API_URL_PROD || "https://api.evrloot.xyz";
};

const DEFAULT_API_KEY = "evrloot";

// Types
export interface ExpeditionApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// API functions
export const createExpeditionApi = (environment: "dev" | "prod") => {
  const API_BASE_URL = getApiBaseUrl(environment);

  return {
    baseUrl: API_BASE_URL, // Expose the base URL
    // Get current expedition number
    getCurrentExpeditionNumber: async (
      apiKey: string = DEFAULT_API_KEY
    ): Promise<ExpeditionApiResponse<{ number: number }>> => {
      const url = `${API_BASE_URL}/api/expeditions/current-expedition-number`;
      try {
        const response = await fetch(url, {
          headers: {
            "X-API-Key": apiKey,
          },
        });
        if (!response.ok) {
          throw new Error(
            `HTTP error! status: ${response.status} for URL: ${url}`
          );
        }
        const data = await response.json();
        console.log("Raw API response for current expedition number:", data);

        // Handle different response formats
        let number = null;
        if (typeof data === "number") {
          number = data;
        } else if (typeof data === "object") {
          // Try to find a number property in the response
          if (data.number !== undefined) {
            number = data.number;
          } else if (data.expnum !== undefined) {
            number = data.expnum;
          } else {
            // Look for any number value in the object
            const numberValue = Object.values(data).find(
              (val) => typeof val === "number"
            );
            if (numberValue !== undefined) {
              number = numberValue;
            }
          }
        }

        return {
          success: true,
          data: { number },
        };
      } catch (error) {
        console.error("Error fetching current expedition number:", error);
        return {
          success: false,
          error: `Failed to fetch from ${url}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
    },

    // Set current expedition number
    setCurrentExpeditionNumber: async (
      expnum: number,
      apiKey: string = DEFAULT_API_KEY
    ): Promise<ExpeditionApiResponse<boolean>> => {
      const url = `${API_BASE_URL}/api/expeditions/current-expedition-number`;
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
          },
          body: JSON.stringify({ expnum }),
        });
        if (!response.ok) {
          throw new Error(
            `HTTP error! status: ${response.status} for URL: ${url}`
          );
        }
        // We don't need to use the data, just check if the request was successful
        await response.json();
        return { success: true, data: true };
      } catch (error) {
        console.error("Error setting current expedition number:", error);
        return {
          success: false,
          error: `Failed to fetch from ${url}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
    },

    // Get all expedition numbers
    getAllExpeditionNumbers: async (
      apiKey: string = DEFAULT_API_KEY
    ): Promise<ExpeditionApiResponse<number[]>> => {
      const url = `${API_BASE_URL}/api/expeditions/generated-rooms/expeditions`;
      try {
        const response = await fetch(url, {
          headers: {
            "X-API-Key": apiKey,
          },
        });
        if (!response.ok) {
          throw new Error(
            `HTTP error! status: ${response.status} for URL: ${url}`
          );
        }
        const data = await response.json();
        return { success: true, data };
      } catch (error) {
        console.error("Error fetching all expedition numbers:", error);
        return {
          success: false,
          error: `Failed to fetch from ${url}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
    },

    // Get rooms for a specific expedition
    getExpeditionRooms: async (
      expeditionNumber: number,
      apiKey: string = DEFAULT_API_KEY
    ): Promise<ExpeditionApiResponse<Room[]>> => {
      const url = `${API_BASE_URL}/api/expeditions/generated-rooms/expedition/${expeditionNumber}`;
      try {
        const response = await fetch(url, {
          headers: {
            "X-API-Key": apiKey,
          },
        });
        if (!response.ok) {
          throw new Error(
            `HTTP error! status: ${response.status} for URL: ${url}`
          );
        }
        const data = await response.json();
        return { success: true, data };
      } catch (error) {
        console.error(
          `Error fetching rooms for expedition ${expeditionNumber}:`,
          error
        );
        return {
          success: false,
          error: `Failed to fetch from ${url}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
    },

    // Get cached rooms for a specific expedition
    getCachedExpeditionRooms: async (
      expeditionNumber: number,
      apiKey: string = DEFAULT_API_KEY
    ): Promise<ExpeditionApiResponse<Room[]>> => {
      const url = `${API_BASE_URL}/api/expeditions/generated-rooms/cached/${expeditionNumber}`;
      try {
        const response = await fetch(url, {
          headers: {
            "X-API-Key": apiKey,
          },
        });
        if (!response.ok) {
          throw new Error(
            `HTTP error! status: ${response.status} for URL: ${url}`
          );
        }
        const data = await response.json();
        return { success: true, data };
      } catch (error) {
        console.error(
          `Error fetching cached rooms for expedition ${expeditionNumber}:`,
          error
        );
        return {
          success: false,
          error: `Failed to fetch from ${url}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
    },

    // Create new generated rooms
    createGeneratedRooms: async (
      rooms: Room[],
      apiKey: string = DEFAULT_API_KEY
    ): Promise<ExpeditionApiResponse<boolean>> => {
      const url = `${API_BASE_URL}/api/expeditions/generated-rooms`;
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
          },
          body: JSON.stringify(rooms),
        });
        if (!response.ok) {
          throw new Error(
            `HTTP error! status: ${response.status} for URL: ${url}`
          );
        }
        // We don't need to use the data, just check if the request was successful
        await response.json();
        return { success: true, data: true };
      } catch (error) {
        console.error("Error creating generated rooms:", error);
        return {
          success: false,
          error: `Failed to fetch from ${url}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
    },

    // Delete expedition by number
    deleteExpedition: async (
      expeditionNumber: number,
      apiKey: string = DEFAULT_API_KEY
    ): Promise<ExpeditionApiResponse<boolean>> => {
      const url = `${API_BASE_URL}/api/expeditions/generated-rooms/expedition/${expeditionNumber}`;
      try {
        const response = await fetch(url, {
          method: "DELETE",
          headers: {
            "X-API-Key": apiKey,
          },
        });
        if (!response.ok) {
          throw new Error(
            `HTTP error! status: ${response.status} for URL: ${url}`
          );
        }
        // We don't need to use the data, just check if the request was successful
        await response.json();
        return { success: true, data: true };
      } catch (error) {
        console.error(`Error deleting expedition ${expeditionNumber}:`, error);
        return {
          success: false,
          error: `Failed to fetch from ${url}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
    },
  };
};
