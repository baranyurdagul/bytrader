// Market hours definitions (in their local timezone offsets from UTC)
// US Market: NYSE/NASDAQ - Mon-Fri 9:30-16:00 ET (UTC-5 / UTC-4 DST)
// Crypto: 24/7
// Qatar Stock Exchange: Sun-Thu 9:30-13:00 AST (UTC+3)

interface MarketSchedule {
  days: number[]; // 0=Sun, 6=Sat
  openHour: number;
  openMinute: number;
  closeHour: number;
  closeMinute: number;
  timezone: string; // IANA timezone
  label: string;
}

const MARKET_SCHEDULES: Record<string, MarketSchedule> = {
  us: {
    days: [1, 2, 3, 4, 5], // Mon-Fri
    openHour: 9, openMinute: 30,
    closeHour: 16, closeMinute: 0,
    timezone: 'America/New_York',
    label: 'US Market',
  },
  china: {
    days: [1, 2, 3, 4, 5], // Mon-Fri
    openHour: 9, openMinute: 0,
    closeHour: 15, closeMinute: 0,
    timezone: 'Asia/Shanghai',
    label: 'China Market',
  },
  qatar: {
    days: [0, 1, 2, 3, 4], // Sun-Thu
    openHour: 9, openMinute: 30,
    closeHour: 13, closeMinute: 0,
    timezone: 'Asia/Qatar',
    label: 'Qatar Exchange',
  },
};

function getLocalTime(timezone: string): { day: number; hour: number; minute: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);

  const weekdayStr = parts.find(p => p.type === 'weekday')?.value || '';
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');

  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day = dayMap[weekdayStr] ?? new Date().getDay();

  return { day, hour: hour === 24 ? 0 : hour, minute };
}

function isScheduleOpen(schedule: MarketSchedule): boolean {
  const { day, hour, minute } = getLocalTime(schedule.timezone);
  
  if (!schedule.days.includes(day)) return false;
  
  const currentMinutes = hour * 60 + minute;
  const openMinutes = schedule.openHour * 60 + schedule.openMinute;
  const closeMinutes = schedule.closeHour * 60 + schedule.closeMinute;
  
  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

export type CategoryType = 'metal' | 'crypto' | 'index' | 'etf' | 'stock';

// Map asset category to its market schedule
function getMarketForCategory(category: CategoryType, assetId?: string): string | null {
  switch (category) {
    case 'crypto':
      return 'crypto'; // always open
    case 'metal':
    case 'index':
    case 'etf':
      return 'us';
    case 'stock':
      if (assetId === 'vfqs' || assetId === 'ords') return 'qatar';
      return 'us';
    default:
      return null;
  }
}

export interface MarketStatusInfo {
  isOpen: boolean;
  label: string;
}

export function getAssetMarketStatus(category: CategoryType, assetId?: string): MarketStatusInfo {
  const market = getMarketForCategory(category, assetId);
  
  if (!market) return { isOpen: false, label: 'Closed' };
  if (market === 'crypto') return { isOpen: true, label: 'Open 24/7' };
  
  const schedule = MARKET_SCHEDULES[market];
  if (!schedule) return { isOpen: false, label: 'Closed' };
  
  const open = isScheduleOpen(schedule);
  return { isOpen: open, label: open ? 'Open' : 'Closed' };
}

// Check if ANY non-crypto market is open (for the header indicator)
export function isAnyMarketOpen(): boolean {
  return Object.values(MARKET_SCHEDULES).some(s => isScheduleOpen(s));
}

// Get COMEX (US) market status
export function getComexMarketStatus(): MarketStatusInfo {
  const schedule = MARKET_SCHEDULES.us;
  const open = isScheduleOpen(schedule);
  return { isOpen: open, label: open ? 'Open' : 'Closed' };
}

// Get SGE (Shanghai) market status
export function getSgeMarketStatus(): MarketStatusInfo {
  const schedule = MARKET_SCHEDULES.china;
  const open = isScheduleOpen(schedule);
  return { isOpen: open, label: open ? 'Open' : 'Closed' };
}

// Get time until a market opens, returns formatted string like "2h 30m"
export function getTimeUntilOpen(market: 'us' | 'china'): string | null {
  const schedule = MARKET_SCHEDULES[market];
  if (!schedule) return null;
  if (isScheduleOpen(schedule)) return null; // already open

  const now = new Date();
  const { day, hour, minute } = getLocalTime(schedule.timezone);
  const currentMinutes = hour * 60 + minute;
  const openMinutes = schedule.openHour * 60 + schedule.openMinute;

  // Find next trading day
  let daysUntil = 0;
  let checkDay = day;
  for (let i = 0; i < 7; i++) {
    if (i === 0 && currentMinutes < openMinutes && schedule.days.includes(checkDay)) {
      daysUntil = 0;
      break;
    }
    checkDay = (day + i + (i === 0 ? 1 : 0)) % 7;
    if (i === 0) checkDay = (day + 1) % 7;
    if (schedule.days.includes(checkDay)) {
      daysUntil = i + 1;
      break;
    }
  }

  // Recalculate properly
  let minutesUntil: number;
  if (daysUntil === 0) {
    minutesUntil = openMinutes - currentMinutes;
  } else {
    minutesUntil = (24 * 60 - currentMinutes) + (daysUntil - 1) * 24 * 60 + openMinutes;
  }

  if (minutesUntil <= 0) minutesUntil += 7 * 24 * 60;

  const hours = Math.floor(minutesUntil / 60);
  const mins = minutesUntil % 60;

  if (hours >= 24) {
    const d = Math.floor(hours / 24);
    const h = hours % 24;
    return `${d}d ${h}h`;
  }
  return `${hours}h ${mins}m`;
}
