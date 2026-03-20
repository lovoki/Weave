import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('weave-theme') as Theme;
    if (saved === 'light') {
      setTheme('light');
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    
    const applyTheme = () => {
      setTheme(nextTheme);
      if (nextTheme === 'light') {
        document.documentElement.classList.add('light-theme');
      } else {
        document.documentElement.classList.remove('light-theme');
      }
      localStorage.setItem('weave-theme', nextTheme);
    };

    if (!document.startViewTransition) {
      applyTheme();
      return;
    }

    const clickEvent = window.event as MouseEvent;
    if (clickEvent && clickEvent.clientX) {
      document.documentElement.style.setProperty('--click-x', `${clickEvent.clientX}px`);
      document.documentElement.style.setProperty('--click-y', `${clickEvent.clientY}px`);
    } else {
      document.documentElement.style.setProperty('--click-x', `50%`);
      document.documentElement.style.setProperty('--click-y', `50%`);
    }

    document.startViewTransition(() => {
      applyTheme();
    });
  };

  return { theme, toggleTheme };
}