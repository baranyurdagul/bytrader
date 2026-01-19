import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useTrades } from '@/hooks/useTrades';
import { usePriceAlerts } from '@/hooks/usePriceAlerts';
import { useWatchlist } from '@/hooks/useWatchlist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Mail,
  Lock,
  LogOut,
  LogIn,
  Wallet,
  Bell,
  Star,
  TrendingUp,
  Shield,
  Calendar,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Profile = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAuthenticated, signIn, signUp, signOut } = useAuth();
  const { trades } = useTrades();
  const { alerts } = usePriceAlerts();
  const { watchlist } = useWatchlist();
  const { toast } = useToast();

  // Auth form state
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = isLogin 
        ? await signIn(email, password)
        : await signUp(email, password);
      
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: isLogin ? "Welcome back!" : "Account created!",
          description: isLogin ? "You're now signed in" : "You can now access all features",
        });
        setEmail('');
        setPassword('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You've been signed out successfully",
    });
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Logged in view
  if (isAuthenticated && user) {
    const memberSince = user.created_at 
      ? new Date(user.created_at).toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric' 
        })
      : 'N/A';

    const stats = [
      { 
        label: 'Trades', 
        value: trades.length, 
        icon: TrendingUp, 
        color: 'text-primary',
        onClick: () => navigate('/portfolio')
      },
      { 
        label: 'Alerts', 
        value: alerts.length, 
        icon: Bell, 
        color: 'text-warning',
        onClick: () => navigate('/alerts')
      },
      { 
        label: 'Watchlist', 
        value: watchlist.length, 
        icon: Star, 
        color: 'text-success',
        onClick: () => navigate('/')
      },
    ];

    return (
      <Layout>
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          {/* Profile Header */}
          <div className="glass-card rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full gradient-gold flex items-center justify-center">
                <User className="w-8 h-8 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-sm text-success font-medium">Signed In</span>
                </div>
                <p className="text-lg font-semibold text-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Member since {memberSince}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Account verified</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {stats.map((stat) => (
              <button
                key={stat.label}
                onClick={stat.onClick}
                className="glass-card rounded-xl p-4 text-center hover:bg-secondary/50 transition-colors"
              >
                <stat.icon className={cn("w-5 h-5 mx-auto mb-2", stat.color)} />
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </button>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="glass-card rounded-xl p-4 mb-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3"
                onClick={() => navigate('/portfolio')}
              >
                <Wallet className="w-4 h-4 text-primary" />
                View Portfolio
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3"
                onClick={() => navigate('/alerts')}
              >
                <Bell className="w-4 h-4 text-warning" />
                Manage Alerts
              </Button>
            </div>
          </div>

          {/* Sign Out */}
          <Button
            variant="outline"
            className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </main>
      </Layout>
    );
  }

  // Not logged in - show auth form
  return (
    <Layout>
      <main className="container mx-auto px-4 py-8 max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-muted-foreground">
            {isLogin 
              ? 'Sign in to access your portfolio and alerts' 
              : 'Join to start tracking your trades'}
          </p>
        </div>

        <div className="glass-card rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  {isLogin ? 'Sign In' : 'Create Account'}
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                }}
                className="ml-1 text-primary hover:underline font-medium"
              >
                {isLogin ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default Profile;
