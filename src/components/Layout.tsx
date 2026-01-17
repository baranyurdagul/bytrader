import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

interface LayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
}

export function Layout({ children, showHeader = true }: LayoutProps) {
  const isMobile = useIsMobile();
  const { pullDistance, pullProgress, isRefreshing, shouldTrigger } = usePullToRefresh();

  return (
    <div className="min-h-screen bg-background">
      {/* Pull to refresh indicator - mobile only */}
      {isMobile && (
        <PullToRefresh
          pullDistance={pullDistance}
          pullProgress={pullProgress}
          isRefreshing={isRefreshing}
          shouldTrigger={shouldTrigger}
        />
      )}
      
      {/* Only show header on desktop */}
      {showHeader && !isMobile && <Header />}
      
      {/* Mobile header - simplified */}
      {showHeader && isMobile && (
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-center">
              <h1 className="text-lg font-bold text-foreground">MetalTrader Pro</h1>
            </div>
          </div>
        </header>
      )}
      
      {/* Main content with bottom padding for mobile nav */}
      <main 
        className={isMobile ? "pb-20" : ""}
        style={{
          transform: isMobile && pullDistance > 0 ? `translateY(${pullDistance}px)` : 'none',
          transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none',
        }}
      >
        {children}
      </main>
      
      {/* Bottom nav only on mobile */}
      {isMobile && <BottomNav />}
    </div>
  );
}
