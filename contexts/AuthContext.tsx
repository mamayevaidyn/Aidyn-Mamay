import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  mockLogin: (email: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  mockLogin: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      // Check if there's a mock user in localStorage
      const mockUser = localStorage.getItem('lumia_mock_user');
      if (mockUser) {
        setUser({ email: mockUser, uid: 'mock-uid-123' } as User);
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const mockLogin = (email: string) => {
    if (!auth) {
      localStorage.setItem('lumia_mock_user', email);
      setUser({ email, uid: 'mock-uid-123' } as User);
    }
  };

  const logout = async () => {
    if (auth) {
      await signOut(auth);
    } else {
      localStorage.removeItem('lumia_mock_user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, mockLogin }}>
      {children}
    </AuthContext.Provider>
  );
};
