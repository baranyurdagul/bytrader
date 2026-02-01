import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Bell, Settings, Coins, Wallet, User, LogOut, LogIn, RefreshCw, Calculator } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { SilverSpreadTile } from '@/components/SilverSpreadTile';

export function Header() {
  const location = useLocation();
  const { user, signOut, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      // Clear all caches for PWA
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Unregister service workers to get fresh content
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.update()));
      }
      
      toast({
        title: "Refreshing app...",
        description: "Loading latest version",
      });
      
      // Force reload from server (bypass cache)
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Refresh error:', error);
      window.location.reload();
    }
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3">
              <div className="p-2 rounded-lg gradient-gold">
                <Coins className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">MetalTrader Pro</h1>
                <p className="text-xs text-muted-foreground">Commodities Analysis Platform</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/"
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === '/'
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                Markets
              </Link>
              <Link
                to="/portfolio"
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                  location.pathname === '/portfolio'
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Wallet className="w-4 h-4" />
                Portfolio
              </Link>
              <Link
                to="/alerts"
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                  location.pathname === '/alerts'
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Bell className="w-4 h-4" />
                Alerts
              </Link>
              <Link
                to="/currency"
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                  location.pathname === '/currency'
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Calculator className="w-4 h-4" />
                Currency
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Refresh Button for PWA */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="relative"
              title="Refresh app"
            >
              <RefreshCw className={cn(
                "w-5 h-5 text-muted-foreground",
                isRefreshing && "animate-spin"
              )} />
            </Button>
            
            {/* Silver Spread Tile */}
            <div className="hidden lg:block">
              <SilverSpreadTile />
            </div>
            
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20">
              <Activity className="w-4 h-4 text-success animate-pulse" />
              <span className="text-xs font-medium text-success">Markets Open</span>
            </div>
            
            <Link 
              to="/alerts"
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
            </Link>

            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-success rounded-full" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.email}</p>
                    <p className="text-xs text-muted-foreground">Signed in</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/portfolio" className="cursor-pointer">
                      <Wallet className="w-4 h-4 mr-2" />
                      Portfolio
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <Settings className="w-4 h-4 mr-2" />
                      Profile & Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link to="/auth">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
