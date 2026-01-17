// Trading data and technical analysis algorithms

export interface CommodityData {
  id: string;
  name: string;
  symbol: string;
  category: 'metal' | 'crypto' | 'index';
  price: number;
  priceUnit: string;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume: string;
  marketCap: string;
  priceHistory: PricePoint[];
}

export interface PricePoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  movingAverages: {
    sma20: number;
    sma50: number;
    sma200: number;
    ema12: number;
    ema26: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  stochastic: {
    k: number;
    d: number;
  };
  atr: number;
  adx: number;
}

export interface Signal {
  type: 'BUY' | 'SELL' | 'HOLD';
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
  indicators: string[];
  confidence: number;
  timestamp: Date;
  actionMessage: string;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface TrendAnalysis {
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: number; // 0-100
  support: number;
  resistance: number;
  pivotPoints: {
    pp: number;
    r1: number;
    r2: number;
    r3: number;
    s1: number;
    s2: number;
    s3: number;
  };
}

// Generate realistic price history
function generatePriceHistory(basePrice: number, volatility: number, days: number = 30): PricePoint[] {
  const history: PricePoint[] = [];
  let currentPrice = basePrice * (0.95 + Math.random() * 0.1);
  const now = Date.now();
  
  for (let i = days; i >= 0; i--) {
    const timestamp = now - i * 24 * 60 * 60 * 1000;
    const dailyChange = (Math.random() - 0.5) * volatility * currentPrice;
    const open = currentPrice;
    const close = currentPrice + dailyChange;
    const high = Math.max(open, close) * (1 + Math.random() * 0.02);
    const low = Math.min(open, close) * (1 - Math.random() * 0.02);
    const volume = Math.floor(Math.random() * 1000000) + 500000;
    
    history.push({ timestamp, open, high, low, close, volume });
    currentPrice = close;
  }
  
  return history;
}

// Calculate RSI (Relative Strength Index)
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = prices[prices.length - i] - prices[prices.length - i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Calculate SMA (Simple Moving Average)
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// Calculate EMA (Exponential Moving Average)
function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];
  const multiplier = 2 / (period + 1);
  let ema = calculateSMA(prices.slice(0, period), period);
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

// Calculate MACD
function calculateMACD(prices: number[]): { value: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdValue = ema12 - ema26;
  
  const macdHistory = [];
  for (let i = 26; i <= prices.length; i++) {
    const slice = prices.slice(0, i);
    macdHistory.push(calculateEMA(slice, 12) - calculateEMA(slice, 26));
  }
  const signal = calculateEMA(macdHistory, 9);
  
  return {
    value: macdValue,
    signal: signal,
    histogram: macdValue - signal
  };
}

// Calculate Bollinger Bands
function calculateBollingerBands(prices: number[], period: number = 20): { upper: number; middle: number; lower: number } {
  const sma = calculateSMA(prices, period);
  const slice = prices.slice(-period);
  const squaredDiffs = slice.map(p => Math.pow(p - sma, 2));
  const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / period);
  
  return {
    upper: sma + 2 * stdDev,
    middle: sma,
    lower: sma - 2 * stdDev
  };
}

// Calculate Stochastic Oscillator
function calculateStochastic(priceHistory: PricePoint[], period: number = 14): { k: number; d: number } {
  if (!priceHistory || priceHistory.length < period) {
    return { k: 50, d: 50 };
  }
  
  const recentData = priceHistory.slice(-period);
  if (recentData.length === 0 || !recentData[recentData.length - 1]) {
    return { k: 50, d: 50 };
  }
  
  const currentClose = recentData[recentData.length - 1].close;
  const lowestLow = Math.min(...recentData.map(p => p.low));
  const highestHigh = Math.max(...recentData.map(p => p.high));
  
  const range = highestHigh - lowestLow;
  const k = range === 0 ? 50 : ((currentClose - lowestLow) / range) * 100;
  
  const kValues: number[] = [];
  for (let i = 0; i < Math.min(3, priceHistory.length - period + 1); i++) {
    const startIdx = priceHistory.length - period - i;
    if (startIdx < 0) break;
    
    const slice = priceHistory.slice(startIdx, startIdx + period);
    if (slice.length === 0 || !slice[slice.length - 1]) continue;
    
    const close = slice[slice.length - 1].close;
    const low = Math.min(...slice.map(p => p.low));
    const high = Math.max(...slice.map(p => p.high));
    const sliceRange = high - low;
    kValues.push(sliceRange === 0 ? 50 : ((close - low) / sliceRange) * 100);
  }
  
  const d = kValues.length > 0 ? kValues.reduce((a, b) => a + b, 0) / kValues.length : k;
  
  return { k: isNaN(k) ? 50 : k, d: isNaN(d) ? 50 : d };
}

// Calculate ATR (Average True Range)
function calculateATR(priceHistory: PricePoint[], period: number = 14): number {
  const trueRanges = [];
  
  for (let i = 1; i < priceHistory.length; i++) {
    const current = priceHistory[i];
    const previous = priceHistory[i - 1];
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );
    trueRanges.push(tr);
  }
  
  return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
}

// Calculate ADX (Average Directional Index)
function calculateADX(priceHistory: PricePoint[], period: number = 14): number {
  const changes = [];
  for (let i = 1; i < priceHistory.length; i++) {
    const current = priceHistory[i];
    const previous = priceHistory[i - 1];
    changes.push(Math.abs(current.close - previous.close) / previous.close);
  }
  
  const avgChange = changes.slice(-period).reduce((a, b) => a + b, 0) / period;
  return Math.min(100, avgChange * 1000);
}

// Generate user-friendly action message based on signal
function generateActionMessage(type: Signal['type'], strength: Signal['strength'], assetName: string): string {
  if (type === 'BUY') {
    if (strength === 'STRONG') {
      return `🚨 STRONG BUY OPPORTUNITY for ${assetName}! Multiple indicators suggest this is a good entry point. Consider buying now.`;
    } else if (strength === 'MODERATE') {
      return `📈 Good time to consider buying ${assetName}. Watch for price confirmation before entering.`;
    } else {
      return `💡 Slight buy signal for ${assetName}. Wait for stronger confirmation or add to existing position.`;
    }
  } else if (type === 'SELL') {
    if (strength === 'STRONG') {
      return `🚨 STRONG SELL SIGNAL for ${assetName}! Consider taking profits or exiting position now to protect gains.`;
    } else if (strength === 'MODERATE') {
      return `📉 Consider selling ${assetName}. Set stop-loss to protect your investment.`;
    } else {
      return `⚠️ Weak sell signal for ${assetName}. Monitor closely and prepare exit strategy.`;
    }
  } else {
    return `⏸️ HOLD ${assetName}. No clear direction - wait for a stronger signal before taking action.`;
  }
}

// Generate trading signal based on technical indicators
function generateSignal(indicators: TechnicalIndicators, currentPrice: number, assetName: string): Signal {
  const signals: string[] = [];
  let buyScore = 0;
  let sellScore = 0;
  
  // RSI Analysis
  if (indicators.rsi < 30) {
    signals.push('RSI Oversold');
    buyScore += 2;
  } else if (indicators.rsi > 70) {
    signals.push('RSI Overbought');
    sellScore += 2;
  }
  
  // MACD Analysis
  if (indicators.macd.histogram > 0 && indicators.macd.value > indicators.macd.signal) {
    signals.push('MACD Bullish Crossover');
    buyScore += 2;
  } else if (indicators.macd.histogram < 0 && indicators.macd.value < indicators.macd.signal) {
    signals.push('MACD Bearish Crossover');
    sellScore += 2;
  }
  
  // Moving Average Analysis
  if (currentPrice > indicators.movingAverages.sma20 && 
      indicators.movingAverages.sma20 > indicators.movingAverages.sma50) {
    signals.push('Price Above MA20 & MA50');
    buyScore += 1.5;
  } else if (currentPrice < indicators.movingAverages.sma20 && 
             indicators.movingAverages.sma20 < indicators.movingAverages.sma50) {
    signals.push('Price Below MA20 & MA50');
    sellScore += 1.5;
  }
  
  // Golden Cross / Death Cross
  if (indicators.movingAverages.sma50 > indicators.movingAverages.sma200) {
    signals.push('Golden Cross (MA50 > MA200)');
    buyScore += 1;
  } else if (indicators.movingAverages.sma50 < indicators.movingAverages.sma200) {
    signals.push('Death Cross (MA50 < MA200)');
    sellScore += 1;
  }
  
  // Bollinger Bands Analysis
  if (currentPrice <= indicators.bollingerBands.lower) {
    signals.push('Price at Lower Bollinger Band');
    buyScore += 1.5;
  } else if (currentPrice >= indicators.bollingerBands.upper) {
    signals.push('Price at Upper Bollinger Band');
    sellScore += 1.5;
  }
  
  // Stochastic Analysis
  if (indicators.stochastic.k < 20 && indicators.stochastic.k > indicators.stochastic.d) {
    signals.push('Stochastic Oversold Crossover');
    buyScore += 1;
  } else if (indicators.stochastic.k > 80 && indicators.stochastic.k < indicators.stochastic.d) {
    signals.push('Stochastic Overbought Crossover');
    sellScore += 1;
  }
  
  // ADX Trend Strength
  if (indicators.adx > 25) {
    signals.push('Strong Trend (ADX > 25)');
  }
  
  const totalScore = buyScore + sellScore;
  const confidence = totalScore > 0 ? Math.min(95, (Math.abs(buyScore - sellScore) / totalScore) * 100 + 50) : 50;
  
  let type: Signal['type'];
  let strength: Signal['strength'];
  let urgency: Signal['urgency'];
  
  if (buyScore > sellScore + 2) {
    type = 'BUY';
    strength = buyScore > 5 ? 'STRONG' : buyScore > 3 ? 'MODERATE' : 'WEAK';
    urgency = buyScore > 5 ? 'HIGH' : buyScore > 3 ? 'MEDIUM' : 'LOW';
  } else if (sellScore > buyScore + 2) {
    type = 'SELL';
    strength = sellScore > 5 ? 'STRONG' : sellScore > 3 ? 'MODERATE' : 'WEAK';
    urgency = sellScore > 5 ? 'HIGH' : sellScore > 3 ? 'MEDIUM' : 'LOW';
  } else {
    type = 'HOLD';
    strength = 'MODERATE';
    urgency = 'LOW';
  }
  
  const actionMessage = generateActionMessage(type, strength, assetName);
  
  return {
    type,
    strength,
    indicators: signals,
    confidence,
    timestamp: new Date(),
    actionMessage,
    urgency
  };
}

// Calculate trend analysis
function calculateTrendAnalysis(priceHistory: PricePoint[], currentPrice: number): TrendAnalysis {
  const closes = priceHistory.map(p => p.close);
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, Math.min(50, closes.length));
  
  const recentPrices = priceHistory.slice(-20);
  const lows = recentPrices.map(p => p.low);
  const highs = recentPrices.map(p => p.high);
  const support = Math.min(...lows);
  const resistance = Math.max(...highs);
  
  const lastCandle = priceHistory[priceHistory.length - 1];
  const pp = (lastCandle.high + lastCandle.low + lastCandle.close) / 3;
  
  const pivotPoints = {
    pp,
    r1: 2 * pp - lastCandle.low,
    r2: pp + (lastCandle.high - lastCandle.low),
    r3: lastCandle.high + 2 * (pp - lastCandle.low),
    s1: 2 * pp - lastCandle.high,
    s2: pp - (lastCandle.high - lastCandle.low),
    s3: lastCandle.low - 2 * (lastCandle.high - pp),
  };
  
  let direction: TrendAnalysis['direction'];
  let strength: number;
  
  if (currentPrice > sma20 && sma20 > sma50) {
    direction = 'BULLISH';
    strength = Math.min(100, ((currentPrice - sma50) / sma50) * 1000 + 50);
  } else if (currentPrice < sma20 && sma20 < sma50) {
    direction = 'BEARISH';
    strength = Math.min(100, ((sma50 - currentPrice) / sma50) * 1000 + 50);
  } else {
    direction = 'NEUTRAL';
    strength = 50;
  }
  
  return {
    direction,
    strength,
    support,
    resistance,
    pivotPoints
  };
}

// Main function to get all asset data
export function getCommodityData(): CommodityData[] {
  // Metals (prices per troy ounce)
  const goldHistory = generatePriceHistory(2650, 0.015);
  const silverHistory = generatePriceHistory(31.5, 0.025);
  const copperHistory = generatePriceHistory(4.25, 0.02);
  
  // Crypto
  const bitcoinHistory = generatePriceHistory(95000, 0.04);
  const ethereumHistory = generatePriceHistory(3400, 0.045);
  
  // Indices
  const nasdaqHistory = generatePriceHistory(21500, 0.018);
  const sp500History = generatePriceHistory(5900, 0.012);
  
  const getLastPrices = (history: PricePoint[]) => ({
    current: history[history.length - 1].close,
    previous: history[history.length - 2].close,
    high: history[history.length - 1].high,
    low: history[history.length - 1].low
  });
  
  const gold = getLastPrices(goldHistory);
  const silver = getLastPrices(silverHistory);
  const copper = getLastPrices(copperHistory);
  const bitcoin = getLastPrices(bitcoinHistory);
  const ethereum = getLastPrices(ethereumHistory);
  const nasdaq = getLastPrices(nasdaqHistory);
  const sp500 = getLastPrices(sp500History);
  
  return [
    // Metals
    {
      id: 'gold',
      name: 'Gold',
      symbol: 'XAU/USD',
      category: 'metal',
      price: gold.current,
      priceUnit: '/oz',
      change: gold.current - gold.previous,
      changePercent: ((gold.current - gold.previous) / gold.previous) * 100,
      high24h: gold.high,
      low24h: gold.low,
      volume: '125.4K',
      marketCap: '$12.5T',
      priceHistory: goldHistory
    },
    {
      id: 'silver',
      name: 'Silver',
      symbol: 'XAG/USD',
      category: 'metal',
      price: silver.current,
      priceUnit: '/oz',
      change: silver.current - silver.previous,
      changePercent: ((silver.current - silver.previous) / silver.previous) * 100,
      high24h: silver.high,
      low24h: silver.low,
      volume: '89.2K',
      marketCap: '$1.4T',
      priceHistory: silverHistory
    },
    {
      id: 'copper',
      name: 'Copper',
      symbol: 'HG/USD',
      category: 'metal',
      price: copper.current,
      priceUnit: '/oz',
      change: copper.current - copper.previous,
      changePercent: ((copper.current - copper.previous) / copper.previous) * 100,
      high24h: copper.high,
      low24h: copper.low,
      volume: '234.8K',
      marketCap: '$245B',
      priceHistory: copperHistory
    },
    // Crypto
    {
      id: 'bitcoin',
      name: 'Bitcoin',
      symbol: 'BTC/USD',
      category: 'crypto',
      price: bitcoin.current,
      priceUnit: '',
      change: bitcoin.current - bitcoin.previous,
      changePercent: ((bitcoin.current - bitcoin.previous) / bitcoin.previous) * 100,
      high24h: bitcoin.high,
      low24h: bitcoin.low,
      volume: '24.5B',
      marketCap: '$1.9T',
      priceHistory: bitcoinHistory
    },
    {
      id: 'ethereum',
      name: 'Ethereum',
      symbol: 'ETH/USD',
      category: 'crypto',
      price: ethereum.current,
      priceUnit: '',
      change: ethereum.current - ethereum.previous,
      changePercent: ((ethereum.current - ethereum.previous) / ethereum.previous) * 100,
      high24h: ethereum.high,
      low24h: ethereum.low,
      volume: '12.3B',
      marketCap: '$410B',
      priceHistory: ethereumHistory
    },
    // Indices
    {
      id: 'nasdaq100',
      name: 'Nasdaq 100',
      symbol: 'NDX',
      category: 'index',
      price: nasdaq.current,
      priceUnit: '',
      change: nasdaq.current - nasdaq.previous,
      changePercent: ((nasdaq.current - nasdaq.previous) / nasdaq.previous) * 100,
      high24h: nasdaq.high,
      low24h: nasdaq.low,
      volume: '4.2B',
      marketCap: '$25T',
      priceHistory: nasdaqHistory
    },
    {
      id: 'sp500',
      name: 'S&P 500',
      symbol: 'SPX',
      category: 'index',
      price: sp500.current,
      priceUnit: '',
      change: sp500.current - sp500.previous,
      changePercent: ((sp500.current - sp500.previous) / sp500.previous) * 100,
      high24h: sp500.high,
      low24h: sp500.low,
      volume: '3.8B',
      marketCap: '$42T',
      priceHistory: sp500History
    }
  ];
}

export function getTechnicalIndicators(priceHistory: PricePoint[]): TechnicalIndicators {
  const closes = priceHistory.map(p => p.close);
  
  return {
    rsi: calculateRSI(closes),
    macd: calculateMACD(closes),
    movingAverages: {
      sma20: calculateSMA(closes, 20),
      sma50: calculateSMA(closes, Math.min(50, closes.length)),
      sma200: calculateSMA(closes, Math.min(200, closes.length)),
      ema12: calculateEMA(closes, 12),
      ema26: calculateEMA(closes, 26)
    },
    bollingerBands: calculateBollingerBands(closes),
    stochastic: calculateStochastic(priceHistory),
    atr: calculateATR(priceHistory),
    adx: calculateADX(priceHistory)
  };
}

export function getSignal(indicators: TechnicalIndicators, currentPrice: number, assetName: string = 'Asset'): Signal {
  return generateSignal(indicators, currentPrice, assetName);
}

export function getTrendAnalysis(priceHistory: PricePoint[], currentPrice: number): TrendAnalysis {
  return calculateTrendAnalysis(priceHistory, currentPrice);
}

export function formatPrice(price: number, decimals: number = 2): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export function formatChange(change: number, percent: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${formatPrice(change)} (${sign}${percent.toFixed(2)}%)`;
}

export function getCategoryIcon(category: CommodityData['category']): string {
  switch (category) {
    case 'metal': return '🏆';
    case 'crypto': return '₿';
    case 'index': return '📊';
    default: return '💰';
  }
}

export function getCategoryLabel(category: CommodityData['category']): string {
  switch (category) {
    case 'metal': return 'Precious Metal';
    case 'crypto': return 'Cryptocurrency';
    case 'index': return 'Stock Index';
    default: return 'Asset';
  }
}
