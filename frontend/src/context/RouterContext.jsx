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

  const onUserInteract = () => {
    cancelled = true;
    cleanupUserListeners();
  };

  const cleanupUserListeners = () => {
    window.removeEventListener('wheel', onUserInteract);
    window.removeEventListener('touchmove', onUserInteract);
    window.removeEventListener('keydown', onUserInteract);
  };

  activeScrollCancel = () => {
    cancelled = true;
    cleanupUserListeners();
  };

  window.addEventListener('wheel', onUserInteract, { passive: true });
  window.addEventListener('touchmove', onUserInteract, { passive: true });
  window.addEventListener('keydown', onUserInteract, { passive: true });

  const startTime = performance.now();
  const maxWaitMs = 3500;

  const attemptScroll = () => {
    if (cancelled) {
      cleanupUserListeners();
      return;
    }

    const el = document.getElementById(id);
    if (!el) {
      if (performance.now() - startTime < maxWaitMs) {
        requestAnimationFrame(attemptScroll);
      } else {
        cleanupUserListeners();
      }
      return;
    }

    // Always ensure Lenis and ScrollTrigger recognize the full mounted Home page dimensions
    if (window.__lenis) {
      window.__lenis.resize();
    }
    try {
      if (window.ScrollTrigger?.refresh) {
        window.ScrollTrigger.refresh();
      }
    } catch {}

    const currentScrollY = window.__lenis ? window.__lenis.scroll : window.scrollY;
    const rect = el.getBoundingClientRect();
    const absoluteTop = rect.top + currentScrollY;
    const targetY = Math.max(0, absoluteTop - NAV_OFFSET);

    // Prevent Lenis from clamping prematurely if Home layout height is still expanding from short pages like Contact
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (maxScroll < targetY - 50 && performance.now() - startTime < 800) {
      requestAnimationFrame(attemptScroll);
      return;
    }

    // Scroll to the computed target
    if (window.__lenis) {
      window.__lenis.resize();
      window.__lenis.scrollTo(targetY, { duration: 0.9, immediate: false });
    } else {
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }

    // Destination verification & reconciliation loop:
    // Ensures that section navigation from short pages (such as Contact) or across layout shifts
    // does not get trapped at Live Demo or intermediate sections.
    let verificationFrames = 0;
    const maxVerificationFrames = 75; // ~1.2s total monitoring
    let settledFrames = 0;

    const verifyArrival = () => {
      if (cancelled) {
        cleanupUserListeners();
        return;
      }

      verificationFrames++;
      const currentEl = document.getElementById(id);
      if (!currentEl) {
        cleanupUserListeners();
        return;
      }

      const currentRect = currentEl.getBoundingClientRect();
      const distanceFromTarget = Math.abs(currentRect.top - NAV_OFFSET);

      if (distanceFromTarget <= 15) {
        settledFrames++;
        if (settledFrames >= 5) {
          // Locked in and settled accurately at target section
          cleanupUserListeners();
          return;
        }
      } else {
        settledFrames = 0;
        // If navigation stalled prematurely (e.g. at Live Demo because of prior short-page limit)
        // re-measure and re-drive the scroll
        if (verificationFrames >= 16 && verificationFrames % 10 === 0) {
          if (window.__lenis) {
            window.__lenis.resize();
            const freshScrollY = window.__lenis.scroll;
            const freshTargetY = Math.max(0, currentEl.getBoundingClientRect().top + freshScrollY - NAV_OFFSET);
            window.__lenis.scrollTo(freshTargetY, { duration: 0.6, immediate: false });
          } else {
            const freshTargetY = Math.max(0, currentEl.getBoundingClientRect().top + window.scrollY - NAV_OFFSET);
            window.scrollTo({ top: freshTargetY, behavior: 'smooth' });
          }
        }
      }

      if (verificationFrames < maxVerificationFrames) {
        requestAnimationFrame(verifyArrival);
      } else {
        cleanupUserListeners();
      }
    };

    requestAnimationFrame(verifyArrival);
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
