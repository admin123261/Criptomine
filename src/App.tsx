import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Cpu, DollarSign, Download, Upload, Gift, MessageCircle, LogOut, Shield, Users,
  CheckCircle, XCircle, Clock, Zap, TrendingUp, ArrowUpCircle,
  Send, X, Eye, EyeOff, Play, Home, ShoppingCart,
  HardDrive, Bell, RefreshCw, CreditCard, Copy, Wallet, Check,
  User as UserIcon, Lock, Share2, ChevronLeft, Award, Star, AlertTriangle,
  Info, ExternalLink, BookOpen, Pickaxe, Timer, Percent, PhoneCall
} from 'lucide-react';
import { User, UserDevice, DEVICE_TEMPLATES, GIFT_DEVICE, DeviceTemplate } from './types';
import * as store from './store';
import { loginViaSupabase } from './supabaseSync';
import { 
  registerServiceWorker, 
  requestNotificationPermission, 
  resetNotificationCounters,
  getUserNotifications,
  getUnreadNotificationsCount,
  markNotificationsAsRead
} from './notifications';
import { supabase } from "./supabaseClient";

// ===== Helpers =====
function formatTime(ms: number) {
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getDeviceTemplate(id: number): DeviceTemplate {
  if (id === 0) return GIFT_DEVICE;
  return DEVICE_TEMPLATES.find(d => d.id === id) || DEVICE_TEMPLATES[0];
}

function calcProfit(device: UserDevice) {
  const template = getDeviceTemplate(device.deviceId);
  if (!device.isRunning || !device.startTime || !device.duration)
    return { current: 0, total: 0, progress: 0, remaining: 0, finished: false, perSecond: 0, perMinute: 0, perHour: 0 };
  const totalDuration = device.duration * 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - device.startTime;
  const progress = Math.min(elapsed / totalDuration, 1);
  const remaining = Math.max(totalDuration - elapsed, 0);
  const finished = elapsed >= totalDuration;
  let totalProfit: number;
  if (device.isGift) { totalProfit = 5; }
  else { totalProfit = template.price * (device.duration === 3 ? 0.02 : 0.025) * device.duration; }
  const totalSeconds = device.duration * 24 * 60 * 60;
  const perSecond = totalProfit / totalSeconds;
  const perMinute = perSecond * 60;
  const perHour = perSecond * 3600;
  return { current: totalProfit * progress, total: totalProfit, progress, remaining, finished, perSecond, perMinute, perHour };
}

const PLATFORM_WALLET = '0x0bcb69e95e45c419b17182a5f2f2bbadca7c9c75';

// ===== Custom Toast Component =====
function CustomToast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info' | 'warning'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: 'from-green-500 to-emerald-600 border-green-500/30',
    error: 'from-red-500 to-rose-600 border-red-500/30',
    info: 'from-blue-500 to-indigo-600 border-blue-500/30',
    warning: 'from-yellow-500 to-amber-600 border-yellow-500/30'
  };

  const icons = {
    success: <CheckCircle size={18} className="text-green-400" />,
    error: <XCircle size={18} className="text-red-400" />,
    info: <Bell size={18} className="text-blue-400" />,
    warning: <AlertTriangle size={18} className="text-yellow-400" />
  };

  return (
    <div className={`fixed top-4 right-4 z-50 animate-slide-in-right`}>
      <div className={`bg-gradient-to-r ${colors[type]} rounded-xl shadow-2xl border p-4 min-w-[280px] max-w-md backdrop-blur-lg`}>
        <div className="flex items-center gap-3">
          {icons[type]}
          <p className="text-white text-sm font-medium flex-1">{message}</p>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== باقي الكود (AuthScreen, WelcomeModal, NotificationCenter, ChatWidget, AdminChat, UpgradeModal, ProfilePage, TransactionList, Mining Cards) =====
// ... (أضف هنا جميع المكونات الأخرى كما هي)

// ===== MAIN APP =====
type Page = 'dashboard' | 'store' | 'my-devices' | 'deposit' | 'withdraw' | 'profile' | 'info';

export default function App() {
  const [user, setUser] = useState<User | null>(store.getCurrentUser());
  const [page, setPage] = useState<Page>('dashboard');
  const [showWelcome, setShowWelcome] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  // تعريف دالة refreshUser لتحديث بيانات المستخدم
  const refreshUser = useCallback(() => {
    try {
      const u = store.getCurrentUser();
      if (u) {
        setUser({ ...u });
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  }, []);

  // تحديث المستخدم كل ثانية
  useEffect(() => {
    const interval = setInterval(refreshUser, 1000);
    return () => clearInterval(interval);
  }, [refreshUser]);

  // تفعيل إشعارات المتصفح
  useEffect(() => {
    registerServiceWorker();
    requestNotificationPermission();
    resetNotificationCounters();
  }, []);

  // مراقبة الإشعارات الجديدة للمستخدم الحالي فقط
  useEffect(() => {
    if (!user) return;
    
    let lastNotifCount = 0;
    let lastMessageTime = 0;
    
    // الحصول على العدد الأولي
    try {
      lastNotifCount = getUnreadNotificationsCount(user.id);
    } catch (error) {
      console.error('Error getting initial notification count:', error);
    }
    
    const checkNewNotifications = () => {
      try {
        // التحقق من الإشعارات الجديدة للمستخدم الحالي فقط
        const currentNotifCount = getUnreadNotificationsCount(user.id);
        
        if (currentNotifCount > lastNotifCount) {
          const notifications = getUserNotifications(user.id);
          const newNotifs = notifications.filter((n: any) => !n.read && n.date > Date.now() - 5000);
          
          if (newNotifs.length > 0) {
            const latestNotif = newNotifs[0];
            // عرض إشعار المتصفح للمستخدم الحالي فقط
            if (Notification.permission === 'granted') {
              new Notification(latestNotif.title, {
                body: latestNotif.message,
                icon: '/logo.png',
                vibrate: [200, 100, 200]
              });
            }
            
            // عرض توست داخل التطبيق
            setNotification(latestNotif.message);
            setTimeout(() => setNotification(null), 3000);
          }
          
          lastNotifCount = currentNotifCount;
        }
        
        // التحقق من الرسائل الجديدة للمستخدم الحالي فقط (الرسائل الواردة فقط)
        const messages = store.getChatMessages();
        const newMessages = messages.filter((m: any) => 
          m.to === user.id && 
          !m.read && 
          m.date > lastMessageTime
        );
        
        if (newMessages.length > 0) {
          newMessages.forEach((msg: any) => {
            const sender = msg.from === 'admin001' ? 'الدعم الفني' : 'مستخدم';
            if (Notification.permission === 'granted') {
              new Notification(`📨 رسالة جديدة من ${sender}`, {
                body: msg.message.length > 50 ? msg.message.substring(0, 50) + '...' : msg.message,
                icon: '/logo.png'
              });
            }
            setNotification(`رسالة جديدة من ${sender}`);
            setTimeout(() => setNotification(null), 3000);
            
            // تحديث وقت آخر رسالة
            if (msg.date > lastMessageTime) {
              lastMessageTime = msg.date;
            }
          });
        }
      } catch (error) {
        console.error('Error checking notifications:', error);
      }
    };
    
    const interval = setInterval(checkNewNotifications, 5000);
    return () => clearInterval(interval);
  }, [user]);

  // طلب إذن الإشعارات عند تسجيل الدخول (مع تأخير)
  useEffect(() => {
    if (user && !user.isAdmin) {
      const timer = setTimeout(() => {
        requestNotificationPermission().catch(console.error);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [user]);

  // مراقبة Supabase للإشعارات
  useEffect(() => {
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mining_notifications",
        },
        (payload) => {
          const data = payload.new as any;
          // فقط عرض الإشعار إذا كان للمستخدم الحالي
          if (data.user_id === user?.id) {
            setToast({ message: data.message, type: 'info' });
            const audio = new Audio("/notification.mp3");
            audio.play().catch(e => console.log('Audio play failed:', e));
            setTimeout(() => {
              setToast(null);
            }, 3000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!user) {
    return <AuthScreen onLogin={(u) => {
      setUser(u);
      if (u.isNew) { 
        setShowWelcome(true); 
        const users = store.getUsers(); 
        const idx = users.findIndex(x => x.id === u.id); 
        if (idx !== -1) { 
          users[idx].isNew = false; 
          store.updateUser(users[idx]); 
        } 
      }
    }} />;
  }

  if (user.isAdmin) return <AdminPanel user={user} onLogout={() => { store.logout(); setUser(null); }} />;

  const notify = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => { 
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount < 10) { notify('الحد الأدنى للإيداع 10 دولار', 'error'); return; }
    const res = store.createTransaction(user.id, 'deposit', amount);
    if (res.success) { notify('تم إرسال طلب الإيداع بنجاح!', 'success'); setDepositAmount(''); refreshUser(); }
    else notify(res.error || 'خطأ', 'error');
  };

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 10) { notify('الحد الأدنى للسحب 10 دولار', 'error'); return; }
    if (!walletAddress.trim()) { notify('يرجى إدخال عنوان المحفظة', 'error'); return; }
    if (user.balance < amount) { notify('رصيدك غير كافي', 'error'); return; }
    const res = store.createTransaction(user.id, 'withdraw', amount, walletAddress.trim());
    if (res.success) { notify(`تم إرسال طلب سحب $${amount.toFixed(2)} (رسوم 10%، المستلم: $${(amount * 0.90).toFixed(2)})`, 'success'); setWithdrawAmount(''); setWalletAddress(''); refreshUser(); }
    else notify(res.error || 'خطأ', 'error');
  };

  const handleBuyDevice = (deviceId: number) => {
    if (confirm('هل تريد تأكيد شراء هذا الجهاز؟')) {
      const res = store.buyDevice(user.id, deviceId);
      if (res.success) { notify('تم شراء الجهاز بنجاح!', 'success'); setPage('my-devices'); refreshUser(); }
      else notify(res.error || 'خطأ', 'error');
    }
  };

  const copyWallet = () => { navigator.clipboard.writeText(PLATFORM_WALLET); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const unreadNotif = getUnreadNotificationsCount(user.id);
  const unreadChat = store.getUnreadCount(user.id);
  const runningDevices = user.devices.filter(d => d.isRunning);

  return (
    <div className="min-h-screen pb-20">
      {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
      {showNotif && <NotificationCenter userId={user.id} onClose={() => setShowNotif(false)} />}
      
      {toast && <CustomToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <div className="glass-card rounded-xl px-5 py-3 shadow-2xl text-white text-sm font-medium">{notification}</div>
        </div>
      )}

      {/* باقي محتوى التطبيق كما هو */}
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-gray-800/30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Cpu size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">CryptoMine Pro</h1>
              <p className="text-[10px] text-gray-600">مرحباً {user.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNotif(true)} className="relative p-2 text-gray-500 hover:text-white transition-colors">
              <Bell size={18} />
              {unreadNotif > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center animate-bounce-in">{unreadNotif}</span>}
            </button>
            <button onClick={() => setPage('profile')} className="p-2 text-gray-500 hover:text-white transition-colors"><UserIcon size={18} /></button>
            <button onClick={() => { store.logout(); setUser(null); }} className="p-2 text-gray-500 hover:text-white transition-colors"><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5">
        {/* باقي محتوى الصفحات كما هو */}
        {/* ... أضف هنا باقي الكود الخاص بالصفحات ... */}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-gray-800/30">
        <div className="max-w-4xl mx-auto flex items-center justify-around py-1.5 px-2">
          {[
            { id: 'dashboard' as Page, icon: Home, label: 'الرئيسية' },
            { id: 'store' as Page, icon: ShoppingCart, label: 'الأجهزة' },
            { id: 'my-devices' as Page, icon: HardDrive, label: 'أجهزتي' },
            { id: 'deposit' as Page, icon: Download, label: 'إيداع' },
            { id: 'withdraw' as Page, icon: Upload, label: 'سحب' },
          ].map(item => (
            <button key={item.id} onClick={() => setPage(item.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-300 ${page === item.id
                ? 'text-blue-400 bg-blue-500/10'
                : 'text-gray-600 hover:text-gray-400'}`}>
              <item.icon size={18} />
              <span className="text-[9px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Chat FAB */}
      {!showChat && (
        <button onClick={() => setShowChat(true)} className="fixed bottom-20 left-4 z-50 group">
          <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center hover:scale-110 transition-all relative">
            <MessageCircle size={22} className="text-white" />
            {unreadChat > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center animate-bounce-in border-2 border-gray-900">{unreadChat}</span>}
            <span className="absolute -top-0.5 -left-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-gray-900 animate-pulse" />
          </div>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800 text-white text-[10px] px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg pointer-events-none">
            💬 تواصل مع الدعم
          </div>
        </button>
      )}
      {showChat && <ChatWidget user={user} onClose={() => setShowChat(false)} />}
    </div>
  );
}

// ===== ADMIN PANEL =====
function AdminPanel({ user, onLogout }: { user: User; onLogout: () => void }) {
  // ... الكود الخاص بلوحة التحكم كما هو
}