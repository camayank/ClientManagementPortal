import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useUser } from './use-user';

export function useLayout() {
  const { user, isLoading } = useUser();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/auth');
    }
  }, [user, isLoading, setLocation]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    location
  };
}
