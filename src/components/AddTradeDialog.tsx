import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2 } from 'lucide-react';
import { CommodityData } from '@/lib/tradingData';
import { NewTrade } from '@/hooks/useTrades';
import { cn } from '@/lib/utils';

interface AddTradeDialogProps {
  commodities: CommodityData[];
  onAddTrade: (trade: NewTrade) => Promise<{ error: any }>;
}

export function AddTradeDialog({ commodities, onAddTrade }: AddTradeDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().split('T')[0]);

  const selectedCommodity = commodities.find(c => c.id === selectedAsset);

  const handleAssetChange = (assetId: string) => {
    setSelectedAsset(assetId);
    const commodity = commodities.find(c => c.id === assetId);
    if (commodity) {
      setPricePerUnit(commodity.price.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCommodity || !quantity || !pricePerUnit) return;

    setIsSubmitting(true);

    const trade: NewTrade = {
      asset_id: selectedCommodity.id,
      asset_name: selectedCommodity.name,
      asset_symbol: selectedCommodity.symbol,
      trade_type: tradeType,
      quantity: parseFloat(quantity),
      price_per_unit: parseFloat(pricePerUnit),
      notes: notes || undefined,
      trade_date: new Date(tradeDate).toISOString(),
    };

    const { error } = await onAddTrade(trade);
    
    setIsSubmitting(false);

    if (!error) {
      // Reset form
      setSelectedAsset('');
      setTradeType('BUY');
      setQuantity('');
      setPricePerUnit('');
      setNotes('');
      setTradeDate(new Date().toISOString().split('T')[0]);
      setOpen(false);
    }
  };

  const totalValue = quantity && pricePerUnit 
    ? (parseFloat(quantity) * parseFloat(pricePerUnit)).toFixed(2)
    : '0.00';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Trade
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log New Trade</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Asset Selection */}
          <div className="space-y-2">
            <Label>Asset</Label>
            <Select value={selectedAsset} onValueChange={handleAssetChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select an asset" />
              </SelectTrigger>
              <SelectContent>
                {commodities.map((commodity) => (
                  <SelectItem key={commodity.id} value={commodity.id}>
                    {commodity.name} ({commodity.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
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
              <Label htmlFor="price">Price per Unit ($)</Label>
              <Input
                id="price"
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
            <Label htmlFor="date">Trade Date</Label>
            <Input
              id="date"
              type="date"
              value={tradeDate}
              onChange={(e) => setTradeDate(e.target.value)}
              required
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
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
            disabled={isSubmitting || !selectedAsset || !quantity || !pricePerUnit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding Trade...
              </>
            ) : (
              `Add ${tradeType} Trade`
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
