import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../services/api";

export const AuthContext = createContext();

const TOKEN_KEY = "medtrack_token";
const USER_KEY = "medtrack_user";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
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

  // Restore saved login session when app starts
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);

        if (savedToken) {
          applyTokenToApi(savedToken);
          setToken(savedToken);
        }

        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (err) {
        console.log("Restore session error:", err);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

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

    return res.data;
  };

  const logout = async () => {
    applyTokenToApi(null);
    setToken(null);
    setUser(null);

    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};