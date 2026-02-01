import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { PullToRefresh } from '@/components/PullToRefresh';
import { FloatingChat } from '@/components/FloatingChat';
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
      
      {/* Show Header on all screen sizes */}
      {showHeader && <Header />}
      
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
      
      {/* Floating AI Chat */}
      <FloatingChat />
    </div>
  );
}
