import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const RouterContext = createContext({
  path: '/',
  navigate: () => {},
});

// Configure manual scroll restoration so browser history doesn't override route scroll targets
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

const NAV_OFFSET = 88; // Height of navbar + top offset + comfortable margin

let activeScrollCancel = null;

function cancelPendingScroll() {
  if (activeScrollCancel) {
    activeScrollCancel();
    activeScrollCancel = null;
  }
}

function scrollToTarget(rawId) {
  cancelPendingScroll();
  if (!rawId) return;
  const id = rawId.replace(/^#/, '');

  if (id === 'hero' || id === 'top') {
    if (window.__lenis) {
      window.__lenis.scrollTo(0, { immediate: false });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return;
  }

  let cancelled = false;
  activeScrollCancel = () => {
    cancelled = true;
  };

  const startTime = performance.now();
  const maxWaitMs = 3000;

  const attemptScroll = () => {
    if (cancelled) return;
    const el = document.getElementById(id);
    if (!el) {
      if (performance.now() - startTime < maxWaitMs) {
        requestAnimationFrame(attemptScroll);
      }
      return;
    }

    // Refresh ScrollTrigger if available to ensure coordinates are accurate
    try {
      if (window.ScrollTrigger?.refresh) {
        window.ScrollTrigger.refresh();
      }
    } catch {}

    // Scroll to element accounting for navbar offset
    if (window.__lenis) {
      window.__lenis.scrollTo(el, { offset: -NAV_OFFSET, immediate: false });
    } else {
      const targetY = Math.max(0, el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET);
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }

    // Compensate for layout shifts (e.g. 3D models, images, or async components rendering above)
    let shiftChecks = 0;
    let lastTop = el.getBoundingClientRect().top;

    const checkLayoutShift = () => {
      if (cancelled) return;
      shiftChecks++;
      const currentEl = document.getElementById(id);
      if (!currentEl) return;

      const currentTop = currentEl.getBoundingClientRect().top;
      // If layout shifted significantly after scroll began, re-align
      if (Math.abs(currentTop - lastTop) > 28 && shiftChecks > 3) {
        if (window.__lenis) {
          window.__lenis.scrollTo(currentEl, { offset: -NAV_OFFSET, immediate: false });
        } else {
          const targetY = Math.max(0, currentEl.getBoundingClientRect().top + window.scrollY - NAV_OFFSET);
          window.scrollTo({ top: targetY, behavior: 'smooth' });
        }
      }
      lastTop = currentTop;

      if (shiftChecks < 16) {
        requestAnimationFrame(checkLayoutShift);
      }
    };

    setTimeout(() => {
      if (!cancelled) requestAnimationFrame(checkLayoutShift);
    }, 120);
  };

  requestAnimationFrame(attemptScroll);
}

export function RouterProvider({ children }) {
  const [path, setPath] = useState(() => {
    if (typeof window !== 'undefined') {
      // Check if page load was a genuine refresh / reload or direct URL visit
      const isReloadOrDirect = (() => {
        try {
          const navEntries = window.performance?.getEntriesByType?.('navigation');
          if (navEntries && navEntries.length > 0) {
            const navType = navEntries[0].type;
            // 'reload' is a full refresh; 'navigate' is direct address-bar entry.
            // 'back_forward' must preserve history route!
            return navType === 'reload' || navType === 'navigate';
          }
          const legacyType = window.performance?.navigation?.type;
          return legacyType === 1 || legacyType === 0;
        } catch {
          return false;
        }
      })();

      if (isReloadOrDirect) {
        // Requirement: refreshing or reloading returns to Home page
        if (window.location.pathname !== '/' || window.location.hash) {
          window.history.replaceState({}, '', '/');
        }
        return '/';
      }

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
      const targetPath = current === '/analyst' ? '/analytics' : (current === '' ? '/' : current);
      setPath(targetPath);

      const hash = window.location.hash.replace(/^#/, '');
      if (hash && targetPath === '/') {
        scrollToTarget(hash);
      } else {
        cancelPendingScroll();
        if (window.__lenis) {
          window.__lenis.scrollTo(0, { immediate: false });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      cancelPendingScroll();
    };
  }, []);

  const navigate = useCallback((to, hash = '') => {
    const normalizedTo = to.toLowerCase().replace(/\/$/, '') || '/';
    const cleanHash = hash ? (hash.startsWith('#') ? hash.slice(1) : hash) : '';
    const targetUrl = (normalizedTo === '/' ? '/' : normalizedTo) + (cleanHash ? `#${cleanHash}` : '');

    const currentPath = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
    const currentHash = window.location.hash.replace(/^#/, '');

    const pathChanged = currentPath !== normalizedTo;
    const hashChanged = currentHash !== cleanHash;

    if (pathChanged || hashChanged) {
      window.history.pushState({}, '', targetUrl);
    }
    setPath(normalizedTo);

    if (cleanHash) {
      scrollToTarget(cleanHash);
    } else {
      cancelPendingScroll();
      if (window.__lenis) {
        window.__lenis.scrollTo(0, { immediate: false });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
