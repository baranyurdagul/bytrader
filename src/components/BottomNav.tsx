import { Link, useLocation } from 'react-router-dom';
import { Home, Wallet, Bell, Newspaper, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  requiresAuth?: boolean;
}

const navItems: NavItem[] = [
  { path: '/', icon: Home, label: 'Markets' },
  { path: '/portfolio', icon: Wallet, label: 'Portfolio' },
  { path: '/currency', icon: Calculator, label: 'Currency' },
  { path: '/news', icon: Newspaper, label: 'News' },
  { path: '/alerts', icon: Bell, label: 'Alerts' },
];

export function BottomNav() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="container mx-auto px-2">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            // Show different icon/label for auth based on login status
            const displayLabel = item.path === '/auth' 
              ? (isAuthenticated ? 'Account' : 'Sign In')
              : item.label;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 min-w-[60px]",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 transition-transform",
                  isActive && "scale-110"
                )} />
                <span className="text-[10px] font-medium">{displayLabel}</span>
                {isActive && (
                  <div className="absolute -bottom-0 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
