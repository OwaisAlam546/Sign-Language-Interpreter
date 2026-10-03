import React, { createContext, useContext, useLayoutEffect, useState, useCallback, useMemo } from 'react';

const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
  isDark: true,
});

function applyThemeToDom(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('signspeak-theme');
        if (saved === 'light' || saved === 'dark') {
          applyThemeToDom(saved);
          return saved;
        }
      } catch (e) {}
    }
    applyThemeToDom('dark');
    return 'dark'; // Default to Dark mode
  });

  const setTheme = useCallback((newTheme) => {
    const val = newTheme === 'light' ? 'light' : 'dark';
    applyThemeToDom(val);
    setThemeState(val);
    try {
      localStorage.setItem('signspeak-theme', val);
    } catch (e) {}
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyThemeToDom(next);
      try {
        localStorage.setItem('signspeak-theme', next);
      } catch (e) {}
      return next;
    });
  }, []);

  useLayoutEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      setTheme,
      isDark: theme === 'dark',
    }),
    [theme, toggleTheme, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
