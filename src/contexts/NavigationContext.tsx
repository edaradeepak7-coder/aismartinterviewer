'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';

interface NavigationContextType {
  isNavigating: boolean;
  startNavigation: () => void;
  finishNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextType>({
  isNavigating: false,
  startNavigation: () => {},
  finishNavigation: () => {},
});

export const useNavigation = () => useContext(NavigationContext);

export const NavigationProvider = ({ children }: { children: React.ReactNode }) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const startNavigation = () => {
    setIsNavigating(true);
  };

  const finishNavigation = () => {
    setIsNavigating(false);
  };

  // Auto-finish navigation when pathname changes
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  // Auto-finish navigation after timeout as fallback
  useEffect(() => {
    if (isNavigating) {
      const timeout = setTimeout(() => {
        console.warn('Navigation timeout - auto-completing loading state');
        setIsNavigating(false);
      }, 3000); // 3 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isNavigating]);

  return (
    <NavigationContext.Provider value={{
      isNavigating,
      startNavigation,
      finishNavigation
    }}>
      {children}
    </NavigationContext.Provider>
  );
};