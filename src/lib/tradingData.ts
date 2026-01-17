// Simulated trading data and technical analysis algorithms

export interface CommodityData {
  id: string;
  name: string;
  symbol: string;
  price: number;
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
  
  // Signal line (9-period EMA of MACD)
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
  const recentData = priceHistory.slice(-period);
  const currentClose = recentData[recentData.length - 1].close;
  const lowestLow = Math.min(...recentData.map(p => p.low));
  const highestHigh = Math.max(...recentData.map(p => p.high));
  
  const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
  
  // %D is 3-period SMA of %K
  const kValues = [];
  for (let i = 3; i <= period; i++) {
    const slice = priceHistory.slice(-(period - i + 3), priceHistory.length - i + 3);
    const close = slice[slice.length - 1].close;
    const low = Math.min(...slice.map(p => p.low));
    const high = Math.max(...slice.map(p => p.high));
    kValues.push(((close - low) / (high - low)) * 100);
  }
  
  const d = kValues.slice(-3).reduce((a, b) => a + b, 0) / 3;
  
  return { k, d };
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
  // Simplified ADX calculation
  const changes = [];
  for (let i = 1; i < priceHistory.length; i++) {
    const current = priceHistory[i];
    const previous = priceHistory[i - 1];
    changes.push(Math.abs(current.close - previous.close) / previous.close);
  }
  
  const avgChange = changes.slice(-period).reduce((a, b) => a + b, 0) / period;
  return Math.min(100, avgChange * 1000); // Normalized to 0-100 scale
}

// Generate trading signal based on technical indicators
function generateSignal(indicators: TechnicalIndicators, currentPrice: number): Signal {
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
  
  if (buyScore > sellScore + 2) {
    type = 'BUY';
    strength = buyScore > 5 ? 'STRONG' : buyScore > 3 ? 'MODERATE' : 'WEAK';
  } else if (sellScore > buyScore + 2) {
    type = 'SELL';
    strength = sellScore > 5 ? 'STRONG' : sellScore > 3 ? 'MODERATE' : 'WEAK';
  } else {
    type = 'HOLD';
    strength = 'MODERATE';
  }
  
  return {
    type,
    strength,
    indicators: signals,
    confidence,
    timestamp: new Date()
  };
}

// Calculate trend analysis
function calculateTrendAnalysis(priceHistory: PricePoint[], currentPrice: number): TrendAnalysis {
  const closes = priceHistory.map(p => p.close);
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, Math.min(50, closes.length));
  
  // Calculate support and resistance
  const recentPrices = priceHistory.slice(-20);
  const lows = recentPrices.map(p => p.low);
  const highs = recentPrices.map(p => p.high);
  const support = Math.min(...lows);
  const resistance = Math.max(...highs);
  
  // Calculate pivot points
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
  
  // Determine trend direction and strength
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

// Main function to get all commodity data
export function getCommodityData(): CommodityData[] {
  const goldHistory = generatePriceHistory(2650, 0.015);
  const silverHistory = generatePriceHistory(31.5, 0.025);
  const copperHistory = generatePriceHistory(4.25, 0.02);
  
  const goldPrice = goldHistory[goldHistory.length - 1].close;
  const silverPrice = silverHistory[silverHistory.length - 1].close;
  const copperPrice = copperHistory[copperHistory.length - 1].close;
  
  const goldPrevPrice = goldHistory[goldHistory.length - 2].close;
  const silverPrevPrice = silverHistory[silverHistory.length - 2].close;
  const copperPrevPrice = copperHistory[copperHistory.length - 2].close;
  
  return [
    {
      id: 'gold',
      name: 'Gold',
      symbol: 'XAU/USD',
      price: goldPrice,
      change: goldPrice - goldPrevPrice,
      changePercent: ((goldPrice - goldPrevPrice) / goldPrevPrice) * 100,
      high24h: Math.max(...goldHistory.slice(-1).map(p => p.high)),
      low24h: Math.min(...goldHistory.slice(-1).map(p => p.low)),
      volume: '125.4K',
      marketCap: '$12.5T',
      priceHistory: goldHistory
    },
    {
      id: 'silver',
      name: 'Silver',
      symbol: 'XAG/USD',
      price: silverPrice,
      change: silverPrice - silverPrevPrice,
      changePercent: ((silverPrice - silverPrevPrice) / silverPrevPrice) * 100,
      high24h: Math.max(...silverHistory.slice(-1).map(p => p.high)),
      low24h: Math.min(...silverHistory.slice(-1).map(p => p.low)),
      volume: '89.2K',
      marketCap: '$1.4T',
      priceHistory: silverHistory
    },
    {
      id: 'copper',
      name: 'Copper',
      symbol: 'HG/USD',
      price: copperPrice,
      change: copperPrice - copperPrevPrice,
      changePercent: ((copperPrice - copperPrevPrice) / copperPrevPrice) * 100,
      high24h: Math.max(...copperHistory.slice(-1).map(p => p.high)),
      low24h: Math.min(...copperHistory.slice(-1).map(p => p.low)),
      volume: '234.8K',
      marketCap: '$245B',
      priceHistory: copperHistory
    }
  ];
}

export function getTechnicalIndicators(priceHistory: PricePoint[]): TechnicalIndicators {
  const closes = priceHistory.map(p => p.close);
  const currentPrice = closes[closes.length - 1];
  
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

export function getSignal(indicators: TechnicalIndicators, currentPrice: number): Signal {
  return generateSignal(indicators, currentPrice);
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
