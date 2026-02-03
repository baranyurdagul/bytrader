import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { Trade } from '@/hooks/useTrades';
import { cn } from '@/lib/utils';

interface EditTradeDialogProps {
  trade: Trade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTrade: (tradeId: string, updates: Partial<Trade>) => Promise<{ error: any }>;
}

export function EditTradeDialog({ trade, open, onOpenChange, onUpdateTrade }: EditTradeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [tradeDate, setTradeDate] = useState('');

  // Update form when trade changes
  useEffect(() => {
    if (trade) {
      setTradeType(trade.trade_type);
      setQuantity(String(trade.quantity));
      setPricePerUnit(String(trade.price_per_unit));
      setNotes(trade.notes || '');
      setTradeDate(new Date(trade.trade_date).toISOString().split('T')[0]);
    }
  }, [trade]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!trade || !quantity || !pricePerUnit) return;

    setIsSubmitting(true);

    const totalValue = parseFloat(quantity) * parseFloat(pricePerUnit);

    const { error } = await onUpdateTrade(trade.id, {
      trade_type: tradeType,
      quantity: parseFloat(quantity),
      price_per_unit: parseFloat(pricePerUnit),
      total_value: totalValue,
      notes: notes || null,
      trade_date: new Date(tradeDate).toISOString(),
    });
    
    setIsSubmitting(false);

    if (!error) {
      onOpenChange(false);
    }
  };

  const totalValue = quantity && pricePerUnit 
    ? (parseFloat(quantity) * parseFloat(pricePerUnit)).toFixed(2)
    : '0.00';

  if (!trade) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Trade - {trade.asset_name}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Trade Type */}
          <div className="space-y-2">
            <Label>Trade Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={tradeType === 'BUY' ? 'default' : 'outline'}
                className={cn(
                  "flex-1",
                  tradeType === 'BUY' && "bg-success hover:bg-success/90"
                )}
                onClick={() => setTradeType('BUY')}
              >
                BUY
              </Button>
              <Button
                type="button"
                variant={tradeType === 'SELL' ? 'default' : 'outline'}
                className={cn(
                  "flex-1",
                  tradeType === 'SELL' && "bg-destructive hover:bg-destructive/90"
                )}
                onClick={() => setTradeType('SELL')}
              >
                SELL
              </Button>
            </div>
          </div>

          {/* Quantity and Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-quantity">Quantity</Label>
              <Input
                id="edit-quantity"
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-price">Price per Unit ($)</Label>
              <Input
                id="edit-price"
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Total Value */}
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-xl font-bold font-mono">${totalValue}</p>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="edit-date">Trade Date</Label>
            <Input
              id="edit-date"
              type="date"
              value={tradeDate}
              onChange={(e) => setTradeDate(e.target.value)}
              required
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes (optional)</Label>
            <Textarea
              id="edit-notes"
              placeholder="Add any notes about this trade..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Submit */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting || !quantity || !pricePerUnit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving Changes...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
