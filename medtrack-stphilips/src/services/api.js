import axios from "axios";
import { Platform } from "react-native";
import Constants from "expo-constants";

function getBaseUrl() {
  // Browser / Expo web
  if (Platform.OS === "web") {
    return "http://localhost:5001/api";
  }

  // Android emulator
  if (Platform.OS === "android" && !Constants.isDevice) {
    return "http://10.0.2.2:5001/api";
  }

  // Real device using Expo Go / dev client
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.debuggerHost;

  const host = hostUri?.split(":")?.[0];

  if (host) {
    return `http://${host}:5001/api`;
  }

  // Fallback: change this to your current PC IP if needed
  return "http://192.168.100.87:5001/api";
}

export const API_BASE_URL = getBaseUrl();

console.log("API BASE URL:", API_BASE_URL);

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Attach token automatically
API.interceptors.request.use((config) => {
  const currentToken = global.token;

  if (currentToken) {
    config.headers.Authorization = `Bearer ${currentToken}`;
  }

  return config;
});

export default API;