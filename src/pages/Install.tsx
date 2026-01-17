import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Download, Share, Plus, CheckCircle, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if on iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto text-center">
            <CheckCircle className="w-20 h-20 mx-auto mb-6 text-success" />
            <h1 className="text-2xl font-bold text-foreground mb-4">
              App Installed!
            </h1>
            <p className="text-muted-foreground">
              ByTrader is now installed on your device. You can find it on your home screen.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <Smartphone className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Install ByTrader
            </h1>
            <p className="text-muted-foreground">
              Add ByTrader to your home screen for quick access and offline use
            </p>
          </div>

          {/* Android/Chrome Install Button */}
          {deferredPrompt && (
            <div className="mb-8">
              <Button
                onClick={handleInstallClick}
                size="lg"
                className="w-full gap-2"
              >
                <Download className="w-5 h-5" />
                Install App
              </Button>
            </div>
          )}

          {/* iOS Instructions */}
          {isIOS && (
            <div className="glass-card rounded-xl p-6 mb-6">
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Share className="w-5 h-5 text-primary" />
                Install on iPhone/iPad
              </h2>
              <ol className="space-y-4 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  <span>
                    Tap the <Share className="w-4 h-4 inline-block mx-1" /> Share button at the bottom of Safari
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <span>
                    Scroll down and tap <Plus className="w-4 h-4 inline-block mx-1" /> "Add to Home Screen"
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  <span>
                    Tap "Add" in the top right corner
                  </span>
                </li>
              </ol>
            </div>
          )}

          {/* Generic Instructions */}
          {!isIOS && !deferredPrompt && (
            <div className="glass-card rounded-xl p-6">
              <h2 className="font-semibold text-foreground mb-4">
                How to Install
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Look for the install icon in your browser's address bar or menu:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• <strong>Chrome:</strong> Click the install icon in the address bar</li>
                <li>• <strong>Edge:</strong> Click the "App available" icon</li>
                <li>• <strong>Firefox:</strong> Use browser menu → Install</li>
              </ul>
            </div>
          )}

          {/* Features */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">📱</div>
              <p className="text-sm font-medium text-foreground">Works Offline</p>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">⚡</div>
              <p className="text-sm font-medium text-foreground">Fast & Native</p>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">🔔</div>
              <p className="text-sm font-medium text-foreground">Push Alerts</p>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">🏠</div>
              <p className="text-sm font-medium text-foreground">Home Screen</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Install;
