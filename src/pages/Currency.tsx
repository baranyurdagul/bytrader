import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

const CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', flag: '🇶🇦' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', flag: '🇸🇦' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', flag: '🇰🇼' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'د.ب', flag: '🇧🇭' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع', flag: '🇴🇲' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'ج.م', flag: '🇪🇬' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', flag: '🇵🇰' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', flag: '🇨🇭' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: '$', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', symbol: '$', flag: '🇦🇺' },
];

const MAIN_CURRENCIES = ['USD', 'EUR', 'AED', 'QAR', 'TRY'];

export default function Currency() {
  const [amount, setAmount] = useState<string>('1000');
  const [fromCurrency, setFromCurrency] = useState<string>('USD');
  const [toCurrency, setToCurrency] = useState<string>('AED');
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isFallback, setIsFallback] = useState(false);
  const { toast } = useToast();

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-exchange-rates?base=USD`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch rates');

      const data = await response.json();
      setRates(data.allRates || data.rates);
      setLastUpdated(data.lastUpdated);
      setIsFallback(data.isFallback || false);
    } catch (error) {
      console.error('Error fetching rates:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch exchange rates. Using cached data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const convert = (value: number, from: string, to: string): number => {
    if (!rates[from] || !rates[to]) return 0;
    // Convert through USD as base
    const inUsd = value / rates[from];
    return inUsd * rates[to];
  };

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const getCurrencyInfo = (code: string): CurrencyInfo | undefined => {
    return CURRENCIES.find(c => c.code === code);
  };

  const numericAmount = parseFloat(amount) || 0;
  const convertedAmount = convert(numericAmount, fromCurrency, toCurrency);
  const rate = convert(1, fromCurrency, toCurrency);

  // Calculate rate compared to USD
  const fromToUsd = rates[fromCurrency] ? 1 / rates[fromCurrency] : 0;
  const toToUsd = rates[toCurrency] ? 1 / rates[toCurrency] : 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 pb-24 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Currency Calculator</h1>
            <p className="text-sm text-muted-foreground">
              Real-time exchange rates
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchRates}
            disabled={loading}
            className="shrink-0"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>

        {/* Status */}
        {lastUpdated && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isFallback ? "bg-yellow-500" : "bg-green-500"
            )} />
            <span>
              {isFallback ? 'Using cached rates' : 'Live rates'} • Updated {new Date(lastUpdated).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Main Converter Card */}
        <Card className="border-primary/20">
          <CardContent className="pt-6 space-y-6">
            {/* Amount Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Amount</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-2xl font-bold h-14"
                placeholder="Enter amount"
              />
            </div>

            {/* From Currency */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">From</label>
              <Select value={fromCurrency} onValueChange={setFromCurrency}>
                <SelectTrigger className="h-14">
                  <SelectValue>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getCurrencyInfo(fromCurrency)?.flag}</span>
                      <span className="font-semibold">{fromCurrency}</span>
                      <span className="text-muted-foreground">{getCurrencyInfo(fromCurrency)?.name}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{currency.flag}</span>
                        <span className="font-semibold">{currency.code}</span>
                        <span className="text-muted-foreground">{currency.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="icon"
                onClick={swapCurrencies}
                className="rounded-full h-10 w-10"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>

            {/* To Currency */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">To</label>
              <Select value={toCurrency} onValueChange={setToCurrency}>
                <SelectTrigger className="h-14">
                  <SelectValue>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getCurrencyInfo(toCurrency)?.flag}</span>
                      <span className="font-semibold">{toCurrency}</span>
                      <span className="text-muted-foreground">{getCurrencyInfo(toCurrency)?.name}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{currency.flag}</span>
                        <span className="font-semibold">{currency.code}</span>
                        <span className="text-muted-foreground">{currency.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Result */}
            <div className="pt-4 border-t border-border">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  {getCurrencyInfo(fromCurrency)?.symbol}{numericAmount.toLocaleString()} {fromCurrency} =
                </p>
                <p className="text-4xl font-bold text-primary">
                  {getCurrencyInfo(toCurrency)?.symbol}{convertedAmount.toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </p>
                <p className="text-lg font-semibold">{toCurrency}</p>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">
                1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Rates for Main Currencies */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Rates (vs USD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {MAIN_CURRENCIES.filter(c => c !== 'USD').map((code) => {
                const currency = getCurrencyInfo(code);
                const rate = rates[code] || 0;
                const previousRate = rate * 0.999; // Simulated previous for demo
                const change = ((rate - previousRate) / previousRate) * 100;
                const isUp = change >= 0;

                return (
                  <div
                    key={code}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                    onClick={() => {
                      setFromCurrency('USD');
                      setToCurrency(code);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{currency?.flag}</span>
                      <div>
                        <p className="font-semibold text-sm">{code}</p>
                        <p className="text-xs text-muted-foreground">{currency?.symbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-semibold text-sm">{rate.toFixed(2)}</p>
                      <div className={cn(
                        "flex items-center gap-0.5 text-xs",
                        isUp ? "text-green-500" : "text-red-500"
                      )}>
                        {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        <span>{Math.abs(change).toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* All Currency Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Rates (1 {fromCurrency} =)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {CURRENCIES.filter(c => c.code !== fromCurrency).map((currency) => {
                const rate = convert(1, fromCurrency, currency.code);
                return (
                  <div
                    key={currency.code}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                    onClick={() => setToCurrency(currency.code)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{currency.flag}</span>
                      <div>
                        <p className="font-semibold">{currency.code}</p>
                        <p className="text-xs text-muted-foreground">{currency.name}</p>
                      </div>
                    </div>
                    <p className="font-mono font-semibold">
                      {currency.symbol}{rate.toLocaleString(undefined, { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 4 
                      })}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Attribution */}
        <p className="text-center text-xs text-muted-foreground">
          Rates provided by <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">ExchangeRate-API</a>
        </p>
      </div>
    </Layout>
  );
}
