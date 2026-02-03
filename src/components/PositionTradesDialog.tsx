import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trade, PortfolioPosition } from '@/hooks/useTrades';
import { formatPrice } from '@/lib/tradingData';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Trash2, 
  Pencil,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PositionTradesDialogProps {
  position: PortfolioPosition | null;
  trades: Trade[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteTrade: (id: string) => Promise<any>;
  onEditTrade: (trade: Trade) => void;
  onDeletePosition: (assetId: string) => void;
}

export function PositionTradesDialog({ 
  position, 
  trades, 
  open, 
  onOpenChange, 
  onDeleteTrade,
  onEditTrade,
  onDeletePosition
}: PositionTradesDialogProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  if (!position) return null;

  // Filter trades for this position
  const positionTrades = trades.filter(t => t.asset_id === position.asset_id);

  const handleDeletePosition = () => {
    onDeletePosition(position.asset_id);
    setDeleteConfirmOpen(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{position.asset_name} Trades</span>
              <Button
                variant="destructive"
                size="sm"
                className="gap-1"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete All
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {/* Position Summary */}
          <div className="p-3 rounded-lg bg-muted mb-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Quantity</p>
                <p className="font-mono font-semibold">{position.quantity.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg Price</p>
                <p className="font-mono font-semibold">${formatPrice(position.averageBuyPrice)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">P/L</p>
                <p className={cn(
                  "font-mono font-semibold",
                  position.profitLoss >= 0 ? "text-success" : "text-destructive"
                )}>
                  {position.profitLoss >= 0 ? '+' : ''}${formatPrice(position.profitLoss)}
                </p>
              </div>
            </div>
          </div>

          {/* Trades List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {positionTrades.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No trades for this position</p>
            ) : (
              positionTrades.map((trade) => {
                const isBuy = trade.trade_type === 'BUY';
                return (
                  <div 
                    key={trade.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors group"
                  >
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
                          <span className="text-xs text-muted-foreground">
                            {new Date(trade.trade_date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {Number(trade.quantity).toFixed(4)} @ ${formatPrice(Number(trade.price_per_unit))}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono font-semibold mr-2">
                        ${formatPrice(Number(trade.total_value))}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onEditTrade(trade)}
                      >
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onDeleteTrade(trade.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Position Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete All {position.asset_name} Trades?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {positionTrades.length} trades for {position.asset_name}. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePosition}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All Trades
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
