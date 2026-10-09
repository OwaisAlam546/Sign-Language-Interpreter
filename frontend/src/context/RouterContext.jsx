import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const RouterContext = createContext({
  path: '/',
  navigate: () => {},
});

export function RouterProvider({ children }) {
  const [path, setPath] = useState(() => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
      if (currentPath === '/analytics' || currentPath === '/analyst') return '/analytics';
      if (currentPath === '/contact') return '/contact';
      return '/';
    }
    return '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      const current = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
      setPath(current === '/analyst' ? '/analytics' : (current === '' ? '/' : current));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((to, hash = '') => {
    const normalizedTo = to.toLowerCase().replace(/\/$/, '') || '/';
    const targetUrl = (normalizedTo === '/' ? '' : normalizedTo) + (hash ? (hash.startsWith('#') ? hash : `#${hash}`) : '') || '/';

    if (window.location.pathname.toLowerCase() !== normalizedTo || window.location.hash !== hash) {
      window.history.pushState({}, '', targetUrl);
      setPath(normalizedTo);

      if (hash) {
        setTimeout(() => {
          const el = document.getElementById(hash.replace('#', ''));
          if (el) {
            if (window.__lenis) {
              window.__lenis.scrollTo(el, { offset: -85 });
            } else {
              el.scrollIntoView({ behavior: 'smooth' });
            }
          }
        }, 100);
      } else {
        if (window.__lenis) {
          window.__lenis.scrollTo(0, { immediate: false });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    }
  }, []);

  return (
    <RouterContext.Provider value={{ path, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  return useContext(RouterContext);
}
