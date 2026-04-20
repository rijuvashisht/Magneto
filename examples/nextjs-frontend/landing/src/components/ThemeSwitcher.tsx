"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type Theme = "system" | "dark" | "light";

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("system");
  const [isOpen, setIsOpen] = useState(false);

  // Apply theme on mount and when changed
  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored) {
      setTheme(stored);
      applyTheme(stored);
    } else {
      applyTheme("system");
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    
    // Remove both classes first
    root.classList.remove("dark", "light");
    
    if (newTheme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(prefersDark ? "dark" : "light");
    } else {
      root.classList.add(newTheme);
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
    setIsOpen(false);
  };

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const getCurrentIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="w-5 h-5" />;
      case "dark":
        return <Moon className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-[#21262d] border-2 border-gray-300 dark:border-[#30363d] text-gray-700 dark:text-gray-200 hover:border-blue-500 dark:hover:border-[#58a6ff] transition-all shadow-lg"
        aria-label="Toggle theme"
      >
        {getCurrentIcon()}
        <span className="text-sm font-medium">
          {theme === "light" ? "Light" : theme === "dark" ? "Dark" : "Auto"}
        </span>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Menu */}
          <div className="absolute right-0 top-full mt-2 z-50 w-36 rounded-xl border-2 border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] shadow-2xl overflow-hidden">
            <button
              onClick={() => handleThemeChange("system")}
              className={`w-full flex flex-col items-center gap-1 px-4 py-3 transition-colors ${
                theme === "system"
                  ? "bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500"
                  : "hover:bg-gray-100 dark:hover:bg-[#21262d] border-2 border-transparent"
              }`}
            >
              <Monitor className={`w-6 h-6 ${theme === "system" ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`} />
              <span className={`text-sm ${theme === "system" ? "text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-gray-400"}`}>
                System
              </span>
            </button>
            
            <button
              onClick={() => handleThemeChange("dark")}
              className={`w-full flex flex-col items-center gap-1 px-4 py-3 transition-colors ${
                theme === "dark"
                  ? "bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500"
                  : "hover:bg-gray-100 dark:hover:bg-[#21262d] border-2 border-transparent"
              }`}
            >
              <Moon className={`w-6 h-6 ${theme === "dark" ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`} />
              <span className={`text-sm ${theme === "dark" ? "text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-gray-400"}`}>
                Dark
              </span>
            </button>
            
            <button
              onClick={() => handleThemeChange("light")}
              className={`w-full flex flex-col items-center gap-1 px-4 py-3 transition-colors ${
                theme === "light"
                  ? "bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500"
                  : "hover:bg-gray-100 dark:hover:bg-[#21262d] border-2 border-transparent"
              }`}
            >
              <Sun className={`w-6 h-6 ${theme === "light" ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`} />
              <span className={`text-sm ${theme === "light" ? "text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-gray-400"}`}>
                Light
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
