import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser, useClerk, useAuth as useClerkAuth } from '@clerk/clerk-react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [localUser, setLocalUser] = useState(null);
  const [localLoading, setLocalLoading] = useState(true);

  // Clerk hooks safely
  let clerkData = { isLoaded: false, isSignedIn: false, user: null };
  let clerkSignOut = null;
  let getToken = null;

  try {
    const clerkUserObj = useUser();
    const clerkObj = useClerk();
    const clerkAuthObj = useClerkAuth();
    clerkData = clerkUserObj;
    clerkSignOut = clerkObj.signOut;
    getToken = clerkAuthObj.getToken;
  } catch (e) {
    // Clerk provider not mounted or missing
  }

  useEffect(() => {
    checkLocalSession();
  }, []);

  const checkLocalSession = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.user) {
        setLocalUser(res.data.user);
      }
    } catch (err) {
      setLocalUser(null);
    } finally {
      setLocalLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
    }
    setLocalUser(res.data.user);
    return res.data;
  };

  const signup = async (email, password) => {
    const res = await api.post('/auth/signup', { email, password });
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
    }
    setLocalUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    if (clerkSignOut) {
      try {
        await clerkSignOut();
      } catch (e) {}
    }
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    localStorage.removeItem('token');
    setLocalUser(null);
  };

  // Determine active user state (Clerk user preferred if logged in, else local user)
  const isClerkActive = clerkData.isLoaded && clerkData.isSignedIn && clerkData.user;
  const activeUser = isClerkActive
    ? {
        id: clerkData.user.id,
        email: clerkData.user.primaryEmailAddress?.emailAddress || clerkData.user.id,
        fullName: clerkData.user.fullName || clerkData.user.primaryEmailAddress?.emailAddress,
        imageUrl: clerkData.user.imageUrl,
        isClerk: true
      }
    : localUser;

  const loading = clerkData.isLoaded ? false : localLoading;

  return (
    <AuthContext.Provider
      value={{
        user: activeUser,
        loading,
        login,
        signup,
        logout,
        isClerkActive,
        getToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
