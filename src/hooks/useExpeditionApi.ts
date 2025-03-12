import { useState, useCallback, useMemo } from "react";
import {
  createExpeditionApi,
  ExpeditionApiResponse,
} from "../lib/expeditionApi";
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

export const useExpeditionApi = (
  apiKey: string = "evrloot",
  environment: "dev" | "prod" = "dev"
) => {
  const [state, setState] = useState<ApiState>({
    loading: false,
    error: null,
    data: null,
  });

  // Memoize the API instance
  const api = useMemo(() => createExpeditionApi(environment), [environment]);

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

  // Memoize all API functions
  const getCurrentExpeditionNumber = useCallback(
    () =>
      handleApiCall<[string], ExpeditionNumberResponse>(
        api.getCurrentExpeditionNumber,
        apiKey
      ),
    [handleApiCall, apiKey, api]
  );

  const setCurrentExpeditionNumber = useCallback(
    (expnum: number) =>
      handleApiCall<[number, string], boolean>(
        api.setCurrentExpeditionNumber,
        expnum,
        apiKey
      ),
    [handleApiCall, apiKey, api]
  );

  const getAllExpeditionNumbers = useCallback(
    () =>
      handleApiCall<[string], number[]>(api.getAllExpeditionNumbers, apiKey),
    [handleApiCall, apiKey, api]
  );

  const getExpeditionRooms = useCallback(
    (expeditionNumber: number) =>
      handleApiCall<[number, string], Room[]>(
        api.getExpeditionRooms,
        expeditionNumber,
        apiKey
      ),
    [handleApiCall, apiKey, api]
  );

  const getCachedExpeditionRooms = useCallback(
    (expeditionNumber: number) =>
      handleApiCall<[number, string], Room[]>(
        api.getCachedExpeditionRooms,
        expeditionNumber,
        apiKey
      ),
    [handleApiCall, apiKey, api]
  );

  const createGeneratedRooms = useCallback(
    (rooms: Room[]) =>
      handleApiCall<[Room[], string], boolean>(
        api.createGeneratedRooms,
        rooms,
        apiKey
      ),
    [handleApiCall, apiKey, api]
  );

  const deleteExpedition = useCallback(
    (expeditionNumber: number) =>
      handleApiCall<[number, string], boolean>(
        api.deleteExpedition,
        expeditionNumber,
        apiKey
      ),
    [handleApiCall, apiKey, api]
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
    apiUrl: api.baseUrl,
  };
};
