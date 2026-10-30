import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

export type PrimaryRoute = 'dashboard' | 'projects' | 'tools' | 'settings';

export type ToolRoute = 
  | 'cad' 
  | 'scanner' 
  | 'installation' 
  | 'panel' 
  | 'calculations' 
  | 'estimator' 
  | 'compliance' 
  | 'templates' 
  | 'reports'
  | 'ai';

export interface RouteState {
  primary: PrimaryRoute;
  tool: ToolRoute;
  rawHash: string;
}

const ALL_TOOLS: ToolRoute[] = [
  'cad',
  'scanner',
  'installation',
  'panel',
  'calculations',
  'estimator',
  'compliance',
  'templates',
  'reports',
  'ai'
];

/**
 * Parses any hash string (e.g. "#/dashboard", "#projects", "#/tools/cad", "#panel")
 * into normalized primary route and tool sub-route.
 */
export function parseHash(hashInput: string): RouteState {
  // Strip '#', '#/', or '/'
  const clean = (hashInput || '').replace(/^[#/]+/, '').trim().toLowerCase();

  if (!clean || clean === 'dashboard') {
    return { primary: 'dashboard', tool: 'cad', rawHash: '#/dashboard' };
  }

  if (clean === 'projects' || clean === 'saved') {
    return { primary: 'projects', tool: 'cad', rawHash: '#/projects' };
  }

  if (clean === 'settings') {
    return { primary: 'settings', tool: 'cad', rawHash: '#/settings' };
  }

  // Direct shortcuts for high-priority views requested by user
  if (clean === 'cad') {
    return { primary: 'tools', tool: 'cad', rawHash: '#/tools/cad' };
  }

  if (clean === 'calculations' || clean === 'calculator' || clean === 'calc' || clean === 'sizing') {
    return { primary: 'tools', tool: 'calculations', rawHash: '#/tools/calculations' };
  }

  if (clean === 'ai' || clean === 'ai-assistant' || clean === 'copilot' || clean === 'assistant') {
    return { primary: 'tools', tool: 'ai', rawHash: '#/tools/ai' };
  }

  // Handle #/tools or #/tools/:tool
  if (clean === 'tools') {
    return { primary: 'tools', tool: 'cad', rawHash: '#/tools/cad' };
  }

  if (clean.startsWith('tools/')) {
    const sub = clean.replace('tools/', '');
    const matchedTool = ALL_TOOLS.find(t => t === sub) || 'cad';
    return { primary: 'tools', tool: matchedTool, rawHash: `#/tools/${matchedTool}` };
  }

  // Direct tool shortcuts: e.g. #scanner, #panel, etc.
  const directTool = ALL_TOOLS.find(t => t === clean);
  if (directTool) {
    return { primary: 'tools', tool: directTool, rawHash: `#/tools/${directTool}` };
  }

  // Fallback to dashboard
  return { primary: 'dashboard', tool: 'cad', rawHash: '#/dashboard' };
}

/**
 * Formats a primary route or module name into a standard hash URL.
 */
export function formatRouteHash(target: string): string {
  const clean = target.replace(/^[#/]+/, '').trim().toLowerCase();

  if (!clean || clean === 'dashboard') return '#/dashboard';
  if (clean === 'projects' || clean === 'saved') return '#/projects';
  if (clean === 'settings') return '#/settings';

  if (clean === 'tools') return '#/tools/cad';

  if (clean.startsWith('tools/')) {
    const sub = clean.replace('tools/', '');
    return ALL_TOOLS.includes(sub as ToolRoute) ? `#/tools/${sub}` : '#/tools/cad';
  }

  if (ALL_TOOLS.includes(clean as ToolRoute)) {
    return `#/tools/${clean}`;
  }

  return '#/dashboard';
}

interface HashRouterContextType {
  primary: PrimaryRoute;
  tool: ToolRoute;
  rawHash: string;
  navigate: (target: string, replace?: boolean) => void;
  navigateToTool: (toolName: ToolRoute) => void;
}

const HashRouterContext = createContext<HashRouterContextType | undefined>(undefined);

/**
 * HashRouter Component for Shell view management
 * Synchronizes with window.location.hash without page reloads.
 */
export const HashRouter: React.FC<{
  children: React.ReactNode;
  initialTarget?: string;
  onRouteChanged?: (route: RouteState) => void;
}> = ({ children, initialTarget, onRouteChanged }) => {
  const [routeState, setRouteState] = useState<RouteState>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      return parseHash(window.location.hash);
    }
    return parseHash(initialTarget || '#/dashboard');
  });

  const navigate = useCallback((target: string, replace: boolean = false) => {
    const nextState = parseHash(target);
    const targetHash = nextState.rawHash;

    if (typeof window !== 'undefined') {
      if (replace) {
        window.history.replaceState(null, '', targetHash);
      } else {
        if (window.location.hash !== targetHash) {
          window.history.pushState(null, '', targetHash);
        }
      }
    }

    setRouteState(nextState);
    if (onRouteChanged) {
      onRouteChanged(nextState);
    }
  }, [onRouteChanged]);

  const navigateToTool = useCallback((toolName: ToolRoute) => {
    navigate(`#/tools/${toolName}`);
  }, [navigate]);

  // Listen to browser hashchange (back/forward navigation, manual hash typing)
  useEffect(() => {
    const handleHashChange = () => {
      const next = parseHash(window.location.hash);
      setRouteState(next);
      if (onRouteChanged) {
        onRouteChanged(next);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [onRouteChanged]);

  const value = useMemo(() => ({
    primary: routeState.primary,
    tool: routeState.tool,
    rawHash: routeState.rawHash,
    navigate,
    navigateToTool
  }), [routeState, navigate, navigateToTool]);

  return (
    <HashRouterContext.Provider value={value}>
      {children}
    </HashRouterContext.Provider>
  );
};

export function useHashRoute(): HashRouterContextType {
  const context = useContext(HashRouterContext);
  if (!context) {
    throw new Error('useHashRoute must be used within a <HashRouter>');
  }
  return context;
}

/**
 * Declarative Route renderer component
 */
export const HashRoute: React.FC<{
  path: PrimaryRoute;
  component: React.ReactNode;
}> = ({ path, component }) => {
  const { primary } = useHashRoute();
  if (primary !== path) return null;
  return <>{component}</>;
};

/**
 * HashLink component for zero-reload bookmarkable navigation
 */
export const HashLink: React.FC<{
  to: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  exact?: boolean;
  style?: React.CSSProperties;
  title?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}> = ({
  to,
  children,
  className = '',
  activeClassName = '',
  exact = false,
  style,
  title,
  onClick
}) => {
  const { rawHash, navigate } = useHashRoute();
  const targetHash = formatRouteHash(to);

  const isActive = exact 
    ? rawHash.toLowerCase() === targetHash.toLowerCase()
    : rawHash.toLowerCase().startsWith(targetHash.toLowerCase());

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (onClick) {
      onClick(e);
    }
    navigate(targetHash);
  };

  return (
    <a
      href={targetHash}
      onClick={handleClick}
      className={`${className} ${isActive ? activeClassName : ''}`}
      style={style}
      title={title}
    >
      {children}
    </a>
  );
};
