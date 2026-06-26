import { createContext, useCallback, useContext, useState } from 'react';
import { SESSION_KEY } from '../utils/constants';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [username, setUsername] = useState(() => sessionStorage.getItem(SESSION_KEY) || '');

  const setSessionUsername = useCallback((name) => {
    setUsername(name);
    if (name) {
      sessionStorage.setItem(SESSION_KEY, name);
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const clearSession = useCallback(() => setSessionUsername(''), [setSessionUsername]);

  return (
    <UserContext.Provider value={{ username, setUsername: setSessionUsername, clearSession }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
