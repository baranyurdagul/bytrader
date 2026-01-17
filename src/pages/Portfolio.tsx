import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { AddTradeDialog } from '@/components/AddTradeDialog';
import { PortfolioCharts } from '@/components/PortfolioCharts';
import { useAuth } from '@/hooks/useAuth';
import { useTrades, Trade } from '@/hooks/useTrades';
import { useLivePrices } from '@/hooks/useLivePrices';
import { getCommodityData, formatPrice } from '@/lib/tradingData';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  BarChart3, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Trash2,
  Loader2,
  LogIn
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Portfolio = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { commodities: liveCommodities } = useLivePrices(60000);
  const { trades, isLoading: tradesLoading, addTrade, deleteTrade, calculatePortfolioStats } = useTrades();

  const commodities = liveCommodities.length > 0 ? liveCommodities : getCommodityData();

  // Create price map for calculations
  const currentPrices = useMemo(() => {
    const prices: Record<string, number> = {};
    commodities.forEach(c => {
      prices[c.id] = c.price;
    });
    return prices;
  }, [commodities]);

  const portfolioStats = useMemo(() => 
    calculatePortfolioStats(currentPrices),
    [calculatePortfolioStats, currentPrices]
  );

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto text-center">
            <Wallet className="w-16 h-16 mx-auto mb-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Sign in to Access Your Portfolio
            </h1>
            <p className="text-muted-foreground mb-8">
              Track your trades, monitor profit/loss, and see your overall performance.
            </p>
            <Button onClick={() => navigate('/auth')} className="gap-2">
              <LogIn className="w-4 h-4" />
              Sign In to Continue
            </Button>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Portfolio Tracker</h1>
            <p className="text-muted-foreground">Track your trades and performance</p>
          </div>
          <AddTradeDialog commodities={commodities} onAddTrade={addTrade} />
        </div>

        {/* Portfolio Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Total Value</span>
            </div>
            <p className="text-2xl font-bold font-mono">
              ${formatPrice(portfolioStats.totalValue)}
            </p>
          </div>

          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Total Invested</span>
            </div>
            <p className="text-2xl font-bold font-mono">
              ${formatPrice(portfolioStats.totalInvested)}
            </p>
          </div>

          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              {portfolioStats.totalProfitLoss >= 0 ? (
                <TrendingUp className="w-5 h-5 text-success" />
              ) : (
                <TrendingDown className="w-5 h-5 text-destructive" />
              )}
              <span className="text-sm text-muted-foreground">Profit/Loss</span>
            </div>
            <p className={cn(
              "text-2xl font-bold font-mono",
              portfolioStats.totalProfitLoss >= 0 ? "text-success" : "text-destructive"
            )}>
              {portfolioStats.totalProfitLoss >= 0 ? '+' : ''}${formatPrice(portfolioStats.totalProfitLoss)}
            </p>
          </div>

          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              {portfolioStats.totalProfitLossPercent >= 0 ? (
                <TrendingUp className="w-5 h-5 text-success" />
              ) : (
                <TrendingDown className="w-5 h-5 text-destructive" />
              )}
              <span className="text-sm text-muted-foreground">Return</span>
            </div>
            <p className={cn(
              "text-2xl font-bold font-mono",
              portfolioStats.totalProfitLossPercent >= 0 ? "text-success" : "text-destructive"
            )}>
              {portfolioStats.totalProfitLossPercent >= 0 ? '+' : ''}{portfolioStats.totalProfitLossPercent.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Portfolio Charts */}
        <PortfolioCharts 
          trades={trades} 
          positions={portfolioStats.positions} 
          currentPrices={currentPrices} 
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Positions */}
          <div className="glass-card rounded-xl p-5">
            <h2 className="text-lg font-semibold text-foreground mb-4">Current Positions</h2>
            
            {portfolioStats.positions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No positions yet</p>
                <p className="text-sm">Add your first trade to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {portfolioStats.positions.map((position) => (
                  <div 
                    key={position.asset_id}
                    className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{position.asset_name}</h3>
                        <p className="text-sm text-muted-foreground">{position.asset_symbol}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-semibold">${formatPrice(position.currentValue)}</p>
                        <p className={cn(
                          "text-sm font-mono",
                          position.profitLoss >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {position.profitLoss >= 0 ? '+' : ''}{position.profitLossPercent.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Quantity</p>
                        <p className="font-mono">{position.quantity.toFixed(4)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Buy</p>
                        <p className="font-mono">${formatPrice(position.averageBuyPrice)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">P/L</p>
                        <p className={cn(
                          "font-mono",
                          position.profitLoss >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {position.profitLoss >= 0 ? '+' : ''}${formatPrice(position.profitLoss)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Trades */}
          <div className="glass-card rounded-xl p-5">
            <h2 className="text-lg font-semibold text-foreground mb-4">Trade History</h2>
            
            {tradesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : trades.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No trades recorded</p>
                <p className="text-sm">Start logging your trades</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin pr-2">
                {trades.slice(0, 20).map((trade) => (
                  <TradeRow key={trade.id} trade={trade} onDelete={deleteTrade} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </Layout>
  );
};

function TradeRow({ trade, onDelete }: { trade: Trade; onDelete: (id: string) => Promise<any> }) {
  const isBuy = trade.trade_type === 'BUY';
  
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors group">
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-1.5 rounded-md",
          isBuy ? "bg-success/10" : "bg-destructive/10"
        )}>
          {isBuy ? (
            <ArrowUpCircle className="w-4 h-4 text-success" />
          ) : (
            <ArrowDownCircle className="w-4 h-4 text-destructive" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-semibold",
              isBuy ? "text-success" : "text-destructive"
            )}>
              {trade.trade_type}
            </span>
            <span className="text-sm text-foreground">{trade.asset_name}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {Number(trade.quantity).toFixed(4)} @ ${formatPrice(Number(trade.price_per_unit))}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-mono font-semibold">${formatPrice(Number(trade.total_value))}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(trade.trade_date).toLocaleDateString()}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
          onClick={() => onDelete(trade.id)}
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export default Portfolio;
