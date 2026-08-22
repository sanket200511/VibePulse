import { useState, useEffect } from "react";

/**
 * Demo Mode configuration settings.
 * Defaults to true for the demonstration, but can be controlled via localStorage.
 */
export function isDemoModeEnabled(): boolean {
  const stored = localStorage.getItem("vibepulse_demo_mode");
  if (stored === null) {
    return false;
  }
  return stored === "true";
}

export function setDemoMode(enabled: boolean): void {
  localStorage.setItem("vibepulse_demo_mode", enabled ? "true" : "false");
  window.dispatchEvent(new Event("storage"));
}

/**
 * Custom hook to reactively track and set Demo Mode.
 * Updates components immediately when the mode is switched.
 */
export function useDemoMode() {
  const [isDemo, setIsDemo] = useState(isDemoModeEnabled());

  useEffect(() => {
    const handleStorage = () => {
      setIsDemo(isDemoModeEnabled());
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("vibepulse_demo_change", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("vibepulse_demo_change", handleStorage);
    };
  }, []);

  const toggleDemoMode = (enabled: boolean) => {
    setDemoMode(enabled);
    window.dispatchEvent(new Event("vibepulse_demo_change"));
  };

  return { isDemo, toggleDemoMode };
}
