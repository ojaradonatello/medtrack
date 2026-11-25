import React, { createContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../services/api";

export const AuthContext = createContext();

const TOKEN_KEY = "medtrack_token";
const USER_KEY = "medtrack_user";
const FACILITY_KEY = "medtrack_facility";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [facility, setFacility] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyTokenToApi = (newToken) => {
    if (newToken) {
      API.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
      global.token = newToken;
    } else {
      delete API.defaults.headers.common["Authorization"];
      global.token = null;
    }
  };

  const loadFacility = useCallback(async () => {
    try {
      const res = await API.get("/facilities/my");
      const data = res.data?.facility || null;
      setFacility(data);

      if (data) {
        await AsyncStorage.setItem(FACILITY_KEY, JSON.stringify(data));
      } else {
        await AsyncStorage.removeItem(FACILITY_KEY);
      }
    } catch (err) {
      console.log("Load facility error:", err);
      setFacility(null);
      await AsyncStorage.removeItem(FACILITY_KEY);
    }
  }, []);

  // Restore saved login session when app starts
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [savedToken, savedUser, savedFacility] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
          AsyncStorage.getItem(FACILITY_KEY),
        ]);

        if (savedToken) {
          applyTokenToApi(savedToken);
          setToken(savedToken);
        }

        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }

        if (savedFacility) {
          setFacility(JSON.parse(savedFacility));
        }

        // Re-fetch facility from server to get latest modules
        if (savedToken) {
          await loadFacility();
        }
      } catch (err) {
        console.log("Restore session error:", err);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, [loadFacility]);

  const login = async (email, password) => {
    const res = await API.post("/auth/login", {
      email,
      password,
    });

    const newToken = res.data.token;
    const newUser = res.data.user;

    applyTokenToApi(newToken);
    setToken(newToken);
    setUser(newUser);

    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));

    // Load facility after login
    await loadFacility();

    return res.data;
  };

  const logout = async () => {
    applyTokenToApi(null);
    setToken(null);
    setUser(null);
    setFacility(null);

    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    await AsyncStorage.removeItem(FACILITY_KEY);
  };

  const hasModule = (key) => {
    // If no facility assigned (legacy admin), allow everything
    if (!facility) {
      return true;
    }

    const modules = facility.modules;

    if (!modules) {
      return false;
    }

    return modules[key] === true;
  };

  const facilityName = facility?.name || "MedTrack";
  const facilityType = facility?.type || "hospital";
  const receiptHeader =
    facility?.receiptHeader || "ST. PHILIPS HEALTH FACILITY";
  const medicalFormHeader =
    facility?.medicalFormHeader || "ST. PHILIPS HOSPITAL";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        facility,
        loading,
        login,
        logout,
        hasModule,
        facilityName,
        facilityType,
        receiptHeader,
        medicalFormHeader,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};