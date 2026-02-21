import { useState } from 'react';
import { PriceAlert } from '@/hooks/usePriceAlerts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditAlertDialogProps {
  alert: PriceAlert;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (alertId: string, updates: { target_price: number; condition: 'above' | 'below' }) => Promise<{ error: any }>;
}

export function EditAlertDialog({ alert, open, onOpenChange, onUpdate }: EditAlertDialogProps) {
  const [condition, setCondition] = useState<'above' | 'below'>(alert.condition);
  const [targetPrice, setTargetPrice] = useState(String(alert.target_price));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) return;

    setIsSubmitting(true);
    const { error } = await onUpdate(alert.id, { target_price: price, condition });
    setIsSubmitting(false);

    if (!error) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Alert</DialogTitle>
          <DialogDescription>
            {alert.asset_name} ({alert.asset_symbol})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Condition */}
          <div className="space-y-2">
            <Label>Condition</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={condition === 'above' ? 'default' : 'outline'}
                className={cn("gap-2", condition === 'above' && "bg-success hover:bg-success/90")}
                onClick={() => setCondition('above')}
              >
                <TrendingUp className="w-4 h-4" />
                Above
              </Button>
              <Button
                type="button"
                variant={condition === 'below' ? 'default' : 'outline'}
                className={cn("gap-2", condition === 'below' && "bg-destructive hover:bg-destructive/90")}
                onClick={() => setCondition('below')}
              >
                <TrendingDown className="w-4 h-4" />
                Below
              </Button>
            </div>
          </div>

          {/* Target Price */}
          <div className="space-y-2">
            <Label>Target Price ($)</Label>
            <Input
              type="number"
              step="any"
              min="0"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="Enter target price"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !targetPrice || parseFloat(targetPrice) <= 0}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
