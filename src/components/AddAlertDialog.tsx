import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { CommodityData, formatPrice } from '@/lib/tradingData';
import { NewPriceAlert } from '@/hooks/usePriceAlerts';
import { cn } from '@/lib/utils';

interface AddAlertDialogProps {
  commodities: CommodityData[];
  onAddAlert: (alert: NewPriceAlert) => Promise<{ error: any }>;
  selectedAssetId?: string;
}

export function AddAlertDialog({ commodities, onAddAlert, selectedAssetId }: AddAlertDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [assetId, setAssetId] = useState<string>(selectedAssetId || '');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [targetPrice, setTargetPrice] = useState('');

  const selectedCommodity = commodities.find(c => c.id === assetId);

  const handleAssetChange = (id: string) => {
    setAssetId(id);
    const commodity = commodities.find(c => c.id === id);
    if (commodity) {
      // Set target price slightly above/below current price
      const adjustment = condition === 'above' ? 1.02 : 0.98;
      setTargetPrice((commodity.price * adjustment).toFixed(2));
    }
  };

  const handleConditionChange = (cond: 'above' | 'below') => {
    setCondition(cond);
    if (selectedCommodity) {
      const adjustment = cond === 'above' ? 1.02 : 0.98;
      setTargetPrice((selectedCommodity.price * adjustment).toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCommodity || !targetPrice) return;

    setIsSubmitting(true);

    const alert: NewPriceAlert = {
      asset_id: selectedCommodity.id,
      asset_name: selectedCommodity.name,
      asset_symbol: selectedCommodity.symbol,
      target_price: parseFloat(targetPrice),
      condition,
    };

    const { error } = await onAddAlert(alert);
    
    setIsSubmitting(false);

    if (!error) {
      setAssetId('');
      setCondition('above');
      setTargetPrice('');
      setOpen(false);
    }
  };

  const priceDifference = selectedCommodity && targetPrice
    ? ((parseFloat(targetPrice) - selectedCommodity.price) / selectedCommodity.price) * 100
    : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Bell className="w-4 h-4" />
          Set Alert
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Create Price Alert
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Asset Selection */}
          <div className="space-y-2">
            <Label>Asset</Label>
            <Select value={assetId} onValueChange={handleAssetChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select an asset" />
              </SelectTrigger>
              <SelectContent>
                {commodities.map((commodity) => (
                  <SelectItem key={commodity.id} value={commodity.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{commodity.name} ({commodity.symbol})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCommodity && (
              <p className="text-sm text-muted-foreground">
                Current price: ${formatPrice(selectedCommodity.price)}
              </p>
            )}
          </div>

          {/* Condition */}
          <div className="space-y-2">
            <Label>Alert when price goes</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={condition === 'above' ? 'default' : 'outline'}
                className={cn(
                  "flex-1 gap-2",
                  condition === 'above' && "bg-success hover:bg-success/90"
                )}
                onClick={() => handleConditionChange('above')}
              >
                <TrendingUp className="w-4 h-4" />
                Above
              </Button>
              <Button
                type="button"
                variant={condition === 'below' ? 'default' : 'outline'}
                className={cn(
                  "flex-1 gap-2",
                  condition === 'below' && "bg-destructive hover:bg-destructive/90"
                )}
                onClick={() => handleConditionChange('below')}
              >
                <TrendingDown className="w-4 h-4" />
                Below
              </Button>
            </div>
          </div>

          {/* Target Price */}
          <div className="space-y-2">
            <Label htmlFor="targetPrice">Target Price ($)</Label>
            <Input
              id="targetPrice"
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              required
            />
            {selectedCommodity && targetPrice && (
              <p className={cn(
                "text-sm",
                priceDifference >= 0 ? "text-success" : "text-destructive"
              )}>
                {priceDifference >= 0 ? '+' : ''}{priceDifference.toFixed(2)}% from current price
              </p>
            )}
          </div>

          {/* Preview */}
          {selectedCommodity && targetPrice && (
            <div className="p-3 rounded-lg bg-muted border border-border">
              <p className="text-sm">
                🔔 You'll be notified when <strong>{selectedCommodity.name}</strong> goes{' '}
                <span className={condition === 'above' ? 'text-success' : 'text-destructive'}>
                  {condition}
                </span>{' '}
                <strong>${parseFloat(targetPrice).toLocaleString()}</strong>
              </p>
            </div>
          )}

          {/* Submit */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting || !assetId || !targetPrice}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Alert...
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Create Alert
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
