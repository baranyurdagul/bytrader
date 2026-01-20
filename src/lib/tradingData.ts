// Trading data and technical analysis algorithms
// NOTE: All price data should come from the backend API, not this file
// This file only contains types, technical analysis algorithms, and utilities

export interface CommodityData {
  id: string;
  name: string;
  symbol: string;
  category: 'metal' | 'crypto' | 'index' | 'etf';
  price: number;
  priceUnit: string;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume: string;
  marketCap: string;
  priceHistory: PricePoint[];
  dataSource?: 'live' | 'cached' | 'unavailable' | 'simulated';
  sourceProvider?: string;
  dividendYield?: number;
  expenseRatio?: number;
}

// Utility functions for formatting
export function formatPrice(price: number, decimals: number = 2): string {
  return price.toLocaleString('en-US', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
}

export function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}`;
}

export function getCategoryIcon(category: string): string {
  switch (category) {
    case 'metal': return '🏆';
    case 'crypto': return '₿';
    case 'index': return '📊';
    case 'etf': return '📈';
    default: return '📊';
  }
}

export function getCategoryLabel(category: string): string {
  switch (category) {
    case 'metal': return 'Metal';
    case 'crypto': return 'Cryptocurrency';
    case 'index': return 'Index';
    case 'etf': return 'ETF';
    default: return category;
  }
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
  strength: number;
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
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// Calculate EMA (Exponential Moving Average)
function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const multiplier = 2 / (period + 1);
  let ema = calculateSMA(prices.slice(0, period), period);
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

// Calculate MACD
function calculateMACD(prices: number[]): { value: number; signal: number; histogram: number } {
  if (prices.length < 26) {
    return { value: 0, signal: 0, histogram: 0 };
  }
  
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdValue = ema12 - ema26;
  
  const macdHistory = [];
  for (let i = 26; i <= prices.length; i++) {
    const slice = prices.slice(0, i);
    macdHistory.push(calculateEMA(slice, 12) - calculateEMA(slice, 26));
  }
  const signal = macdHistory.length >= 9 ? calculateEMA(macdHistory, 9) : macdValue;
  
  return {
    value: macdValue,
    signal: signal,
    histogram: macdValue - signal
  };
}

// Calculate Bollinger Bands
function calculateBollingerBands(prices: number[], period: number = 20): { upper: number; middle: number; lower: number } {
  if (prices.length < period) {
    const price = prices[prices.length - 1] || 0;
    return { upper: price, middle: price, lower: price };
  }
  
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
  if (priceHistory.length < 2) return 0;
  
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
  
  const slice = trueRanges.slice(-period);
  return slice.length > 0 ? slice.reduce((a, b) => a + b, 0) / slice.length : 0;
}

// Calculate ADX (Average Directional Index)
function calculateADX(priceHistory: PricePoint[], period: number = 14): number {
  if (priceHistory.length < 2) return 0;
  
  const changes = [];
  for (let i = 1; i < priceHistory.length; i++) {
    const current = priceHistory[i];
    const previous = priceHistory[i - 1];
    changes.push(Math.abs(current.close - previous.close) / previous.close);
  }
  
  const slice = changes.slice(-period);
  const avgChange = slice.length > 0 ? slice.reduce((a, b) => a + b, 0) / slice.length : 0;
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
  if (!priceHistory || priceHistory.length === 0) {
    return {
      direction: 'NEUTRAL',
      strength: 50,
      support: currentPrice * 0.95,
      resistance: currentPrice * 1.05,
      pivotPoints: {
        pp: currentPrice,
        r1: currentPrice * 1.02,
        r2: currentPrice * 1.04,
        r3: currentPrice * 1.06,
        s1: currentPrice * 0.98,
        s2: currentPrice * 0.96,
        s3: currentPrice * 0.94,
      },
    };
  }

  const closes = priceHistory.map(p => p.close);
  const sma20 = calculateSMA(closes, Math.min(20, closes.length));
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

// Get technical indicators from price history
export function getTechnicalIndicators(priceHistory: PricePoint[]): TechnicalIndicators {
  if (!priceHistory || priceHistory.length === 0) {
    return {
      rsi: 50,
      macd: { value: 0, signal: 0, histogram: 0 },
      movingAverages: { sma20: 0, sma50: 0, sma200: 0, ema12: 0, ema26: 0 },
      bollingerBands: { upper: 0, middle: 0, lower: 0 },
      stochastic: { k: 50, d: 50 },
      atr: 0,
      adx: 0,
    };
  }

  const closes = priceHistory.map(p => p.close);
  
  return {
    rsi: calculateRSI(closes),
    macd: calculateMACD(closes),
    movingAverages: {
      sma20: calculateSMA(closes, 20),
      sma50: calculateSMA(closes, Math.min(50, closes.length)),
      sma200: calculateSMA(closes, Math.min(200, closes.length)),
      ema12: calculateEMA(closes, 12),
      ema26: calculateEMA(closes, 26),
    },
    bollingerBands: calculateBollingerBands(closes),
    stochastic: calculateStochastic(priceHistory),
    atr: calculateATR(priceHistory),
    adx: calculateADX(priceHistory),
  };
}

// Get trading signal
export function getSignal(indicators: TechnicalIndicators, currentPrice: number, assetName: string): Signal {
  return generateSignal(indicators, currentPrice, assetName);
}

// Get trend analysis
export function getTrendAnalysis(priceHistory: PricePoint[], currentPrice: number): TrendAnalysis {
  return calculateTrendAnalysis(priceHistory, currentPrice);
}

// DEPRECATED: This function should not be used anymore
// All data should come from the backend API
// Keeping for backwards compatibility but returns empty array
export function getCommodityData(): CommodityData[] {
  console.warn('getCommodityData() is deprecated. Use useLivePrices() hook instead.');
  return [];
}
