import { useEffect, useRef, useState, type RefObject } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';
const MIN_CONTENT_WIDTH = 640;

export type DashboardResponsiveState = {
  isMobile: boolean;
  isContentConstrained: boolean;
  isMenuPanelCollapsed: boolean;
  isMobileMenuOpen: boolean;
  contentRef: RefObject<HTMLDivElement | null>;
  toggleMenuPanel: () => void;
  closeMobileMenu: () => void;
};

export function useDashboardResponsive(): DashboardResponsiveState {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isContentConstrained, setIsContentConstrained] = useState(false);
  const [manualOverride, setManualOverride] = useState<boolean | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMenuPanelCollapsed = isMobile
    ? true
    : (manualOverride ?? isContentConstrained);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.(MOBILE_QUERY);
    if (!mediaQuery) return;
    const updateMobile = () => {
      setIsMobile(mediaQuery.matches);
      if (mediaQuery.matches) {
        setIsMobileMenuOpen(false);
      }
    };

    updateMobile();
    mediaQuery.addEventListener('change', updateMobile);
    return () => mediaQuery.removeEventListener('change', updateMobile);
  }, []);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    const updateConstraint = () => {
      if (element.clientWidth === 0) return;
      const expandedContentWidth =
        element.clientWidth - (isMenuPanelCollapsed ? 288 : 0);
      setIsContentConstrained(expandedContentWidth < MIN_CONTENT_WIDTH);
    };

    updateConstraint();
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(updateConstraint);
    observer.observe(element);
    return () => observer.disconnect();
  }, [isMenuPanelCollapsed]);

  return {
    isMobile,
    isContentConstrained,
    isMenuPanelCollapsed,
    isMobileMenuOpen,
    contentRef,
    toggleMenuPanel: () => {
      if (isMobile) {
        setIsMobileMenuOpen((open) => !open);
        return;
      }
      setManualOverride((override) => !(override ?? isContentConstrained));
    },
    closeMobileMenu: () => setIsMobileMenuOpen(false),
  };
}
