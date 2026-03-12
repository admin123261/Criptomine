export interface DeviceTemplate {
  id: number;
  name: string;
  nameAr: string;
  price: number;
  hashRate: string;
  icon: string;
  color: string;
  gradient: string;
}

export interface UserDevice {
  id: string;
  deviceId: number;
  isRunning: boolean;
  startTime: number | null;
  duration: number | null;
  totalEarned: number;
  isGift?: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  date: number;
  note?: string;
  walletAddress?: string;
}

export interface ChatMessage {
  id: string;
  from: string;
  to: string;
  message: string;
  date: number;
  read: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
  date: number;
  read: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  balance: number;
  devices: UserDevice[];
  isAdmin: boolean;
  isNew: boolean;
  createdAt: number;
  referralCode: string;
  referredBy?: string;
  referralEarnings: number;
  totalDeposits: number;
  totalWithdrawals: number;
  lastLogin: number;
}

export const DEVICE_TEMPLATES: DeviceTemplate[] = [
  { id: 1, name: 'Starter Miner', nameAr: 'جهاز المبتدئ', price: 12, hashRate: '15 MH/s', icon: '⚡', color: 'from-green-500 to-emerald-600', gradient: 'bg-gradient-to-br from-green-500/10 to-emerald-600/10' },
  { id: 2, name: 'Basic Miner', nameAr: 'جهاز أساسي', price: 40, hashRate: '50 MH/s', icon: '🔋', color: 'from-blue-500 to-cyan-600', gradient: 'bg-gradient-to-br from-blue-500/10 to-cyan-600/10' },
  { id: 3, name: 'Pro Miner', nameAr: 'جهاز احترافي', price: 80, hashRate: '120 MH/s', icon: '💎', color: 'from-purple-500 to-violet-600', gradient: 'bg-gradient-to-br from-purple-500/10 to-violet-600/10' },
  { id: 4, name: 'Elite Miner', nameAr: 'جهاز النخبة', price: 180, hashRate: '300 MH/s', icon: '🚀', color: 'from-orange-500 to-amber-600', gradient: 'bg-gradient-to-br from-orange-500/10 to-amber-600/10' },
  { id: 5, name: 'Mega Miner', nameAr: 'جهاز خارق', price: 480, hashRate: '800 MH/s', icon: '🔥', color: 'from-red-500 to-rose-600', gradient: 'bg-gradient-to-br from-red-500/10 to-rose-600/10' },
  { id: 6, name: 'Ultra Miner', nameAr: 'جهاز الوحش', price: 1000, hashRate: '2000 MH/s', icon: '👑', color: 'from-yellow-400 to-amber-500', gradient: 'bg-gradient-to-br from-yellow-400/10 to-amber-500/10' },
];

export const GIFT_DEVICE: DeviceTemplate = {
  id: 0, name: 'Gift Miner', nameAr: 'جهاز الهدية', price: 0, hashRate: '5 MH/s', icon: '🎁', color: 'from-pink-500 to-rose-500', gradient: 'bg-gradient-to-br from-pink-500/10 to-rose-500/10'
};
