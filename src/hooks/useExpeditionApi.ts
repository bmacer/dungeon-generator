import { useState, useCallback } from "react";
import { expeditionApi, ExpeditionApiResponse } from "../lib/expeditionApi";
import { Room } from "../lib/dungeonGenerator";

// Define specific return types for API calls
interface ExpeditionNumberResponse {
  number: number;
}

interface ApiState {
  loading: boolean;
  error: string | null;
  data: unknown | null;
}

export const useExpeditionApi = (apiKey: string = "evrloot") => {
  const [state, setState] = useState<ApiState>({
    loading: false,
    error: null,
    data: null,
  });

  const handleApiCall = useCallback(
    async <T extends unknown[], R = unknown>(
      apiFunction: (...args: T) => Promise<ExpeditionApiResponse<R>>,
      ...args: T
    ): Promise<R | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await apiFunction(...args);
        console.log("response", response);
        if (!response.success) {
          setState({
            loading: false,
            error: response.error || "Unknown error occurred",
            data: null,
          });
          return null;
        }

        setState({
          loading: false,
          error: null,
          data: response.data,
        });

        return response.data as R;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        setState({
          loading: false,
          error: errorMessage,
          data: null,
        });
        return null;
      }
    },
    [setState]
  );

  // Wrapper functions for each API call with proper return types
  const getCurrentExpeditionNumber = useCallback(
    () =>
      handleApiCall<[string], ExpeditionNumberResponse>(
        expeditionApi.getCurrentExpeditionNumber,
        apiKey
      ),
    [handleApiCall, apiKey]
  );

  const setCurrentExpeditionNumber = useCallback(
    (expnum: number) =>
      handleApiCall<[number, string], boolean>(
        expeditionApi.setCurrentExpeditionNumber,
        expnum,
        apiKey
      ),
    [handleApiCall, apiKey]
  );

  const getAllExpeditionNumbers = useCallback(
    () =>
      handleApiCall<[string], number[]>(
        expeditionApi.getAllExpeditionNumbers,
        apiKey
      ),
    [handleApiCall, apiKey]
  );

  const getExpeditionRooms = useCallback(
    (expeditionNumber: number) =>
      handleApiCall<[number, string], Room[]>(
        expeditionApi.getExpeditionRooms,
        expeditionNumber,
        apiKey
      ),
    [handleApiCall, apiKey]
  );

  const getCachedExpeditionRooms = useCallback(
    (expeditionNumber: number) =>
      handleApiCall<[number, string], Room[]>(
        expeditionApi.getCachedExpeditionRooms,
        expeditionNumber,
        apiKey
      ),
    [handleApiCall, apiKey]
  );

  const createGeneratedRooms = useCallback(
    (rooms: Room[]) =>
      handleApiCall<[Room[], string], boolean>(
        expeditionApi.createGeneratedRooms,
        rooms,
        apiKey
      ),
    [handleApiCall, apiKey]
  );

  const deleteExpedition = useCallback(
    (expeditionNumber: number) =>
      handleApiCall<[number, string], boolean>(
        expeditionApi.deleteExpedition,
        expeditionNumber,
        apiKey
      ),
    [handleApiCall, apiKey]
  );

  return {
    ...state,
    getCurrentExpeditionNumber,
    setCurrentExpeditionNumber,
    getAllExpeditionNumbers,
    getExpeditionRooms,
    getCachedExpeditionRooms,
    createGeneratedRooms,
    deleteExpedition,
  };
};
