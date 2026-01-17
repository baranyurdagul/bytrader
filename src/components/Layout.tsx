import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
}

export function Layout({ children, showHeader = true }: LayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
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
      <main className={isMobile ? "pb-20" : ""}>
        {children}
      </main>
      
      {/* Bottom nav only on mobile */}
      {isMobile && <BottomNav />}
    </div>
  );
}
