import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface FeatureFlagContextData {
  flags: Record<string, boolean>;
  isFeatureEnabled: (key: string) => boolean;
  refreshFlags: () => Promise<void>;
  isLoading: boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextData>({
  flags: {},
  isFeatureEnabled: () => false,
  refreshFlags: async () => {},
  isLoading: true,
});

export const FeatureFlagProvider = ({ children, token }: { children: ReactNode, token: string | null }) => {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchFlags = async () => {
    if (!token) return;
    
    try {
      const response = await fetch("/api/feature-flags", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFlags(data);
      }
    } catch (error) {
      console.error("Erro ao buscar feature flags:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchFlags();
    } else {
      setFlags({});
      setIsLoading(false);
    }
  }, [token]);

  const isFeatureEnabled = (key: string) => {
    return !!flags[key];
  };

  return (
    <FeatureFlagContext.Provider value={{ flags, isFeatureEnabled, refreshFlags: fetchFlags, isLoading }}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

export const useFeatureFlags = () => {
  return useContext(FeatureFlagContext);
};
