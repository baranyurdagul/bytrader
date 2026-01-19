import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Trash2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import { useTrades } from '@/hooks/useTrades';
import { useLivePrices } from '@/hooks/useLivePrices';
import { cn } from '@/lib/utils';

export function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { messages, isLoading, error, sendMessage, clearMessages, updatePortfolioContext } = useStreamingChat();
  const { trades } = useTrades();
  const { commodities } = useLivePrices();

  // Update portfolio context when trades or prices change
  useEffect(() => {
    if (trades.length > 0 && commodities.length > 0) {
      const positions = trades.reduce((acc, trade) => {
        const existing = acc.find(p => p.asset_id === trade.asset_id);
        const multiplier = trade.trade_type === 'BUY' ? 1 : -1;
        
        if (existing) {
          existing.quantity += trade.quantity * multiplier;
          if (trade.trade_type === 'BUY') {
            existing.totalCost += trade.total_value;
            existing.buyCount += trade.quantity;
          }
        } else {
          acc.push({
            asset_id: trade.asset_id,
            asset_name: trade.asset_name,
            asset_symbol: trade.asset_symbol,
            quantity: trade.quantity * multiplier,
            totalCost: trade.trade_type === 'BUY' ? trade.total_value : 0,
            buyCount: trade.trade_type === 'BUY' ? trade.quantity : 0,
          });
        }
        return acc;
      }, [] as Array<{ asset_id: string; asset_name: string; asset_symbol: string; quantity: number; totalCost: number; buyCount: number }>);

      const portfolioPositions = positions
        .filter(p => p.quantity > 0)
        .map(p => {
          const asset = commodities.find(a => a.id === p.asset_id);
          const currentPrice = asset?.price || 0;
          const currentValue = p.quantity * currentPrice;
          const averageBuyPrice = p.buyCount > 0 ? p.totalCost / p.buyCount : 0;
          const profitLoss = currentValue - (p.quantity * averageBuyPrice);
          const profitLossPercent = averageBuyPrice > 0 ? ((currentPrice - averageBuyPrice) / averageBuyPrice) * 100 : 0;

          return {
            asset_name: p.asset_name,
            asset_symbol: p.asset_symbol,
            quantity: p.quantity,
            averageBuyPrice,
            currentValue,
            profitLoss,
            profitLossPercent,
          };
        });

      const totalValue = portfolioPositions.reduce((sum, p) => sum + p.currentValue, 0);
      const totalCost = portfolioPositions.reduce((sum, p) => sum + (p.quantity * p.averageBuyPrice), 0);
      const totalProfitLoss = totalValue - totalCost;
      const totalProfitLossPercent = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

      updatePortfolioContext({
        positions: portfolioPositions,
        totalValue,
        totalProfitLoss,
        totalProfitLossPercent,
      });
    }
  }, [trades, commodities, updatePortfolioContext]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      sendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { label: 'Market Analysis', prompt: 'Give me a quick analysis of the current market conditions for metals and crypto.' },
    { label: 'Portfolio Review', prompt: 'Review my portfolio and suggest improvements.' },
    { label: 'Trading Tips', prompt: 'What are some trading tips for beginners?' },
  ];

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed z-50 bottom-24 right-4 md:bottom-6 md:right-6",
          "w-14 h-14 rounded-full shadow-lg",
          "bg-primary text-primary-foreground",
          "flex items-center justify-center",
          "hover:scale-110 active:scale-95 transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          isOpen && "rotate-90"
        )}
        aria-label={isOpen ? 'Close chat' : 'Open AI assistant'}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>

      {/* Chat Popup */}
      {isOpen && (
        <div 
          className={cn(
            "fixed z-50 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden",
            "flex flex-col",
            // Mobile: full width with margins
            "bottom-40 left-4 right-4 h-[60vh] md:h-[500px]",
            // Desktop: fixed width, positioned near button
            "md:bottom-20 md:right-6 md:left-auto md:w-[400px]",
            "animate-in slide-in-from-bottom-5 fade-in duration-200"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary/5 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">AI Trading Assistant</h3>
                <p className="text-xs text-muted-foreground">Powered by Gemini</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearMessages}
              className="h-8 w-8"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Hi! I'm your AI trading assistant. Ask me anything about markets, trading strategies, or get a portfolio review.
                </p>
                <div className="space-y-2">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => sendMessage(action.prompt)}
                      disabled={isLoading}
                      className="w-full text-left px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary text-sm transition-colors"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex",
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-secondary text-secondary-foreground rounded-bl-md'
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex justify-start">
                    <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Error */}
          {error && (
            <div className="px-4 py-2 bg-destructive/10 text-destructive text-xs">
              {error}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-border bg-background">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                disabled={isLoading}
                className="flex-1 text-sm"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
