import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Chat from "./pages/chat";
import Profile from "./pages/profile";
import Auth from "./pages/auth";
import { useAppStore } from "./store";
import { GET_USER_INFO } from "./utils/constants";
import apiClient from "./lib/api-client";

// Loading spinner for better UX
const Loader = () => <div style={{ textAlign: "center", marginTop: "20%" }}>Loading...</div>;

// Route wrapper for private routes
const PrivateRoute = ({ children }) => {
  const { userInfo } = useAppStore();

  if (userInfo === undefined) return <Loader />; // Graceful handling during state update

  return userInfo ? children : <Navigate to="/auth" />;
};

// Route wrapper for authentication-only routes
const AuthRoute = ({ children }) => {
  const { userInfo } = useAppStore();

  if (userInfo === undefined) return <Loader />; // Graceful handling during state update

  return !userInfo ? children : <Navigate to="/chat" />;
};

// Main App Component
function App() {
  const { userInfo, setUserInfo } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserData = async () => {
      try {
        const response = await apiClient.get(GET_USER_INFO, { withCredentials: true });

        if (response.status === 200 && response.data.id) {
          setUserInfo(response.data); // Set user info if valid response
        } else {
          setUserInfo(null); // Clear user info for invalid session
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        setUserInfo(null); // Clear user info on error
      } finally {
        setLoading(false); // Stop the loading spinner
      }
    };

    if (!userInfo) getUserData();
    else setLoading(false);
  }, [userInfo, setUserInfo]);

  if (loading) return <Loader />;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/auth"
          element={
            <AuthRoute>
              <Auth />
            </AuthRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <PrivateRoute>
              <Chat />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/auth" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
