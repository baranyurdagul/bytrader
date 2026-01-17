import { useMemo } from 'react';
import { Trade, PortfolioPosition } from '@/hooks/useTrades';
import { formatPrice } from '@/lib/tradingData';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { TrendingUp, PieChart as PieChartIcon } from 'lucide-react';

interface PortfolioChartsProps {
  trades: Trade[];
  positions: PortfolioPosition[];
  currentPrices: Record<string, number>;
}

// Colors for the pie chart
const COLORS = [
  'hsl(43, 96%, 56%)',   // Gold
  'hsl(220, 10%, 75%)',   // Silver
  'hsl(25, 80%, 55%)',    // Copper
  'hsl(30, 90%, 50%)',    // Bitcoin
  'hsl(250, 80%, 60%)',   // Ethereum
  'hsl(195, 80%, 50%)',   // Nasdaq
  'hsl(145, 70%, 45%)',   // S&P
];

export function PortfolioValueChart({ trades, currentPrices }: { trades: Trade[]; currentPrices: Record<string, number> }) {
  const chartData = useMemo(() => {
    if (trades.length === 0) return [];

    // Sort trades by date
    const sortedTrades = [...trades].sort(
      (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
    );

    // Calculate cumulative portfolio value over time
    const positions: Record<string, { quantity: number; cost: number }> = {};
    const dataPoints: { date: string; value: number; invested: number }[] = [];

    sortedTrades.forEach((trade) => {
      const assetId = trade.asset_id;
      
      if (!positions[assetId]) {
        positions[assetId] = { quantity: 0, cost: 0 };
      }

      if (trade.trade_type === 'BUY') {
        positions[assetId].quantity += Number(trade.quantity);
        positions[assetId].cost += Number(trade.total_value);
      } else {
        const avgCost = positions[assetId].cost / positions[assetId].quantity || 0;
        positions[assetId].quantity -= Number(trade.quantity);
        positions[assetId].cost -= avgCost * Number(trade.quantity);
      }

      // Calculate total invested and current value at this point
      let totalInvested = 0;
      let totalValue = 0;
      
      Object.entries(positions).forEach(([id, pos]) => {
        if (pos.quantity > 0) {
          totalInvested += pos.cost;
          totalValue += pos.quantity * (currentPrices[id] || 0);
        }
      });

      dataPoints.push({
        date: new Date(trade.trade_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: totalValue,
        invested: totalInvested,
      });
    });

    return dataPoints;
  }, [trades, currentPrices]);

  if (chartData.length === 0) {
    return (
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Portfolio Value Over Time</h2>
        </div>
        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
          <p>Add trades to see your portfolio growth</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Portfolio Value Over Time</h2>
      </div>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `$${formatPrice(value, 0)}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number, name: string) => [
                `$${formatPrice(value)}`,
                name === 'value' ? 'Current Value' : 'Total Invested'
              ]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="invested"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              dot={false}
              name="Invested"
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              name="Value"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function AllocationChart({ positions }: { positions: PortfolioPosition[] }) {
  const chartData = useMemo(() => {
    if (positions.length === 0) return [];

    const totalValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0);
    
    return positions.map((pos) => ({
      name: pos.asset_symbol,
      value: pos.currentValue,
      percentage: totalValue > 0 ? ((pos.currentValue / totalValue) * 100).toFixed(1) : 0,
    }));
  }, [positions]);

  if (chartData.length === 0) {
    return (
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <PieChartIcon className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Allocation Breakdown</h2>
        </div>
        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
          <p>Add trades to see your allocation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <PieChartIcon className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Allocation Breakdown</h2>
      </div>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percentage }) => `${name} (${percentage}%)`}
              labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
            >
              {chartData.map((_, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: number) => [`$${formatPrice(value)}`, 'Value']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 justify-center">
        {chartData.map((entry, index) => (
          <div key={entry.name} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-sm text-muted-foreground">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PortfolioCharts({ trades, positions, currentPrices }: PortfolioChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <PortfolioValueChart trades={trades} currentPrices={currentPrices} />
      <AllocationChart positions={positions} />
    </div>
  );
}