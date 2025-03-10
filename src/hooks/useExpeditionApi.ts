import { useState } from "react";
import { expeditionApi, ExpeditionApiResponse } from "../lib/expeditionApi";
import { Room } from "../lib/dungeonGenerator";

interface ApiState {
  loading: boolean;
  error: string | null;
  data: any | null;
}

export const useExpeditionApi = (apiKey: string = "evrloot") => {
  const [state, setState] = useState<ApiState>({
    loading: false,
    error: null,
    data: null,
  });

  const handleApiCall = async <T extends any[]>(
    apiFunction: (...args: T) => Promise<ExpeditionApiResponse>,
    ...args: T
  ) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiFunction(...args);

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

      return response.data;
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
  };

  // Wrapper functions for each API call
  const getCurrentExpeditionNumber = () =>
    handleApiCall(expeditionApi.getCurrentExpeditionNumber, apiKey);

  const setCurrentExpeditionNumber = (expnum: number) =>
    handleApiCall(expeditionApi.setCurrentExpeditionNumber, expnum, apiKey);

  const getAllExpeditionNumbers = () =>
    handleApiCall(expeditionApi.getAllExpeditionNumbers, apiKey);

  const getExpeditionRooms = (expeditionNumber: number) =>
    handleApiCall(expeditionApi.getExpeditionRooms, expeditionNumber, apiKey);

  const getCachedExpeditionRooms = (expeditionNumber: number) =>
    handleApiCall(
      expeditionApi.getCachedExpeditionRooms,
      expeditionNumber,
      apiKey
    );

  const createGeneratedRooms = (rooms: Room[]) =>
    handleApiCall(expeditionApi.createGeneratedRooms, rooms, apiKey);

  const deleteExpedition = (expeditionNumber: number) =>
    handleApiCall(expeditionApi.deleteExpedition, expeditionNumber, apiKey);

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
