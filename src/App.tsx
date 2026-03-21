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
import { registerServiceWorker, requestNotificationPermission, resetNotificationCounters, sendPushNotification } from './notifications';
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

// ===== Auth Screen =====
function AuthScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    if (isRegister) {
      if (!username || !email || !password) { setError('يرجى ملء جميع الحقول'); setLoading(false); return; }
      if (password.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); setLoading(false); return; }
      const res = store.register(username, email, password, referralCode || undefined);
      if (res.success && res.user) onLogin(res.user);
      else setError(res.error || 'خطأ في التسجيل');
    } else {
      let res = store.login(email, password);
      if (!res.success) {
        const sbUser = await loginViaSupabase(email, password);
        if (sbUser) {
          res = store.login(email, password);
          if (!res.success) {
            const currentUser = store.getCurrentUser();
            if (currentUser) res = { success: true, user: currentUser };
          }
        }
      }
      if (res.success && res.user) onLogin(res.user);
      else setError('بيانات الدخول غير صحيحة');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {toast && <CustomToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/8 rounded-full blur-[100px] animate-glow-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/8 rounded-full blur-[100px] animate-glow-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 w-full max-w-md animate-scale-in">
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center animate-float shadow-lg shadow-blue-500/30">
              <Cpu size={40} className="text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-bounce-in">
              <Zap size={12} className="text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mt-4 text-gradient">CryptoMine Pro</h1>
          <p className="text-gray-500 mt-2 text-sm">منصة التعدين السحابي بالذكاء الاصطناعي</p>
        </div>

        <div className="glass-card rounded-3xl p-8 shadow-2xl">
          <div className="flex bg-gray-800/30 rounded-xl p-1 mb-6">
            <button onClick={() => { setIsRegister(false); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${!isRegister ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
              تسجيل الدخول
            </button>
            <button onClick={() => { setIsRegister(true); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${isRegister ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
              إنشاء حساب
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="animate-slide-up">
                <label className="block text-xs text-gray-500 mb-1.5">اسم المستخدم</label>
                <div className="relative">
                  <UserIcon size={16} className="absolute right-3 top-3 text-gray-600" />
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                    className="w-full bg-gray-800/30 border border-gray-700/50 rounded-xl py-2.5 pr-10 pl-4 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
                    placeholder="اسم المستخدم" />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">البريد الإلكتروني</label>
              <div className="relative">
                <CreditCard size={16} className="absolute right-3 top-3 text-gray-600" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-gray-800/30 border border-gray-700/50 rounded-xl py-2.5 pr-10 pl-4 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
                  placeholder="example@email.com" dir="ltr" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">كلمة المرور</label>
              <div className="relative">
                <Lock size={16} className="absolute right-3 top-3 text-gray-600" />
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-gray-800/30 border border-gray-700/50 rounded-xl py-2.5 pr-10 pl-10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
                  placeholder="••••••••" dir="ltr" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-3 text-gray-600 hover:text-gray-400">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {isRegister && (
              <div className="animate-slide-up">
                <label className="block text-xs text-gray-500 mb-1.5">كود الإحالة (اختياري)</label>
                <div className="relative">
                  <Share2 size={16} className="absolute right-3 top-3 text-gray-600" />
                  <input type="text" value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())}
                    className="w-full bg-gray-800/30 border border-gray-700/50 rounded-xl py-2.5 pr-10 pl-4 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
                    placeholder="CM-XXXXXX" dir="ltr" />
                </div>
              </div>
            )}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm text-center animate-slide-up flex items-center justify-center gap-2">
                <AlertTriangle size={16} /> {error}
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <RefreshCw size={16} className="animate-spin" /> : null}
              {isRegister ? 'إنشاء حساب' : 'تسجيل الدخول'}
            </button>
          </form>

          {isRegister && (
            <div className="mt-4 bg-gradient-to-r from-yellow-500/5 to-amber-500/5 border border-yellow-500/20 rounded-xl p-3 flex items-center gap-3 animate-slide-up">
              <Gift size={22} className="text-yellow-400 shrink-0" />
              <p className="text-xs text-yellow-300/80">تم استلام جهاز الهدية المجاني - الربح المتوقع $5</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Welcome Modal =====
function WelcomeModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 500);
    const t2 = setTimeout(() => setStep(2), 1200);
    const t3 = setTimeout(() => setStep(3), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
      <div className="relative glass-card-solid rounded-3xl p-8 max-w-sm w-full animate-scale-in text-center" onClick={e => e.stopPropagation()}>
        <div className="absolute -top-8 left-1/2 -translate-x-1/2">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-3xl animate-float shadow-lg shadow-yellow-500/30">🎁</div>
        </div>
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white mb-2">مرحباً بك في CryptoMine Pro!</h2>
          <p className="text-gray-400 text-sm mb-4">أنت الآن جزء من مجتمع التعدين الذكي</p>
          <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-2xl p-5 mb-4">
            <Gift size={36} className="text-yellow-400 mx-auto mb-3" />
            <p className="text-yellow-300 font-bold text-lg mb-1">هدية! 🎁</p>
            <p className="text-gray-300 text-sm">جهاز تعدين مجاني لمدة 24 ساعة</p>
            <p className="text-gray-300 text-sm">المدة: 24 ساعة</p>
            <p className="text-green-400 font-bold text-2xl mt-3 mining-profit-counter">$5.00</p>
            <p className="text-gray-500 text-xs mt-1">الربح المتوقع</p>
          </div>
          <div className="space-y-2 mb-5">
            {step >= 1 && (
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2 animate-slide-up">
                <CheckCircle size={16} className="text-green-400 shrink-0" />
                <p className="text-green-300 text-xs">تم إنشاء حسابك بنجاح</p>
              </div>
            )}
            {step >= 2 && (
              <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2 animate-slide-up">
                <Gift size={16} className="text-yellow-400 shrink-0" />
                <p className="text-yellow-300 text-xs">تم استلام جهاز الهدية المجاني</p>
              </div>
            )}
            {step >= 3 && (
              <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2 animate-slide-up">
                <Zap size={16} className="text-blue-400 shrink-0" />
                <p className="text-blue-300 text-xs">جهاز الهدية يعمل الآن!</p>
              </div>
            )}
          </div>
          <button onClick={onClose}
            className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-bold py-3 rounded-xl transition-all shadow-lg shadow-yellow-500/20">
            ابدأ التعدين الآن! 🚀
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Notification Center =====
function NotificationCenter({ userId, onClose }: { userId: string; onClose: () => void }) {
  const notifications = store.getNotifications(userId);
  useEffect(() => { store.markNotificationsRead(userId); }, [userId]);

  const typeStyles = {
    success: 'bg-green-500/10 border-green-500/20 text-green-400',
    warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    error: 'bg-red-500/10 border-red-500/20 text-red-400',
  };
  const typeIcons = {
    success: <CheckCircle size={16} />, warning: <AlertTriangle size={16} />,
    info: <Bell size={16} />, error: <XCircle size={16} />,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div className="relative glass-card-solid rounded-2xl w-full max-w-md max-h-[70vh] overflow-hidden animate-slide-down" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-700/50 flex items-center justify-between bg-gradient-to-r from-blue-900/30 to-purple-900/30">
          <h3 className="font-bold text-white flex items-center gap-2"><Bell size={18} className="text-blue-400" /> الإشعارات</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-gray-800/50 p-1.5 rounded-lg"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto max-h-[60vh] hide-scrollbar">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell size={40} className="mx-auto mb-2 text-gray-700 opacity-50" />
              <p className="text-gray-500 text-sm">لا توجد إشعارات</p>
            </div>
          ) : notifications.slice(0, 30).map(n => (
            <div key={n.id} className={`p-4 border-b border-gray-800/40 flex items-start gap-3 transition-colors ${!n.read ? 'bg-blue-500/10' : 'hover:bg-gray-800/20'}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${typeStyles[n.type]}`}>
                {typeIcons[n.type]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-medium">{n.title}</p>
                <p className="text-gray-400 text-xs mt-0.5">{n.message}</p>
                <p className="text-gray-600 text-[10px] mt-1">{formatDate(n.date)}</p>
              </div>
              {!n.read && <span className="w-2 h-2 bg-blue-400 rounded-full shrink-0 mt-2" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== Chat Widget =====
function ChatWidget({ user, onClose }: { user: User; onClose: () => void }) {
  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState(store.getUserMessages(user.id));
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    const i = setInterval(() => {
      const newMessages = store.getUserMessages(user.id);
      
      // التحقق من وجود رسائل جديدة من الأدمن فقط
      if (newMessages.length > messages.length) {
        const lastMessage = newMessages[newMessages.length - 1];
        // إذا كانت الرسالة من الأدمن وليست من المستخدم نفسه
        if (lastMessage.from === 'admin001' && lastMessage.id !== lastMessageIdRef.current) {
          lastMessageIdRef.current = lastMessage.id;
          // إظهار إشعار للمستخدم فقط إذا كانت الرسالة من الأدمن
          sendPushNotification('رسالة جديدة من الدعم الفني', lastMessage.message);
        }
      }
      
      setMessages(newMessages);
      store.markMessagesRead(user.id, user.id);
    }, 1000);
    return () => clearInterval(i);
  }, [user.id, messages.length]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = () => {
    if (!msg.trim()) return;
    store.sendMessage(user.id, 'admin001', msg.trim());
    setMsg('');
    // لا نعرض إشعار للمرسل نفسه
  };

  return (
    <div className="fixed bottom-20 left-4 z-50 w-80 animate-scale-in">
      <div className="glass-card-solid rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-3 border-b border-gray-700/50 flex items-center justify-between bg-gradient-to-r from-blue-900/30 to-purple-900/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Shield size={14} className="text-white" />
            </div>
            <div>
              <p className="text-white text-xs font-medium">الدعم الفني</p>
              <p className="text-green-400 text-[10px]">● متصل الآن</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1"><X size={14} /></button>
        </div>
        <div className="h-64 overflow-y-auto p-3 space-y-2 hide-scrollbar">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <MessageCircle size={30} className="mx-auto mb-2 text-gray-700" />
              <p className="text-gray-600 text-xs">ابدأ المحادثة...</p>
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.from === user.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${m.from === user.id
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                : 'bg-gray-800/60 text-gray-300 border border-gray-700/30'}`}>
                <p>{m.message}</p>
                <p className={`text-[9px] mt-1 ${m.from === user.id ? 'text-blue-200' : 'text-gray-600'}`}>
                  {new Date(m.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="p-2 border-t border-gray-700/50 flex gap-2">
          <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-gray-800/30 border border-gray-700/30 rounded-lg px-3 py-2 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-blue-500/30"
            placeholder="اكتب رسالتك..." />
          <button onClick={handleSend} className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white hover:opacity-80 transition-all">
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Admin Chat =====
function AdminChat({ onClose: _onClose }: { onClose: () => void }) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState(store.getAdminMessages());
  const [users, setUsers] = useState(store.getUsers());
  const [search, setSearch] = useState('');
  const [showUserList, setShowUserList] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<{ [key: string]: string }>({});

  useEffect(() => {
    const i = setInterval(() => {
      const newMessages = store.getAdminMessages();
      
      // التحقق من وجود رسائل جديدة من المستخدمين
      if (newMessages.length > messages.length) {
        const lastMessage = newMessages[newMessages.length - 1];
        // إذا كانت الرسالة من مستخدم وليست من الأدمن
        if (lastMessage.from !== 'admin001' && lastMessage.id !== lastMessageIdRef.current[lastMessage.from]) {
          lastMessageIdRef.current[lastMessage.from] = lastMessage.id;
          const user = users.find(u => u.id === lastMessage.from);
          if (user) {
            // إظهار إشعار للأدمن فقط
            sendPushNotification(`رسالة جديدة من ${user.username}`, lastMessage.message);
          }
        }
      }
      
      setMessages(newMessages);
      setUsers(store.getUsers());
    }, 1000);
    return () => clearInterval(i);
  }, [messages.length, users]);

  useEffect(() => {
    if (selectedUser) {
      store.markMessagesRead(selectedUser, 'admin001');
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedUser, messages]);

  const handleSend = () => {
    if (!msg.trim() || !selectedUser) return;
    store.sendMessage('admin001', selectedUser, msg.trim());
    setMsg('');
    setMessages(store.getAdminMessages());
    // لا نعرض إشعار للأدمن نفسه
  };

  const chatUsers = users.filter(u => !u.isAdmin);
  const usersWithChats = chatUsers.filter(u => messages.some(m => m.from === u.id || m.to === u.id));
  const usersWithoutChats = chatUsers.filter(u => !messages.some(m => m.from === u.id || m.to === u.id));
  const filteredNewUsers = usersWithoutChats.filter(u => u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
  const userMsgs = selectedUser ? messages.filter(m => m.from === selectedUser || m.to === selectedUser) : [];
  const selectedUserInfo = selectedUser ? users.find(u => u.id === selectedUser) : null;

  return (
    <div className="glass-card rounded-2xl overflow-hidden animate-slide-up">
      <div className="flex flex-col sm:flex-row h-[500px]">
        <div className={`${selectedUser ? 'hidden sm:block' : 'block'} w-full sm:w-1/3 border-b sm:border-b-0 sm:border-l border-gray-700/30 overflow-y-auto hide-scrollbar`}>
          <div className="p-3 border-b border-gray-700/30 flex items-center justify-between">
            <p className="text-white text-xs font-medium">الرسائل</p>
            <button onClick={() => setShowUserList(!showUserList)} className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded-lg hover:bg-blue-500/20 transition-all border border-blue-500/20">
              {showUserList ? 'إخفاء' : 'رسالة جديدة'}
            </button>
          </div>
          {showUserList && (
            <div className="p-2 border-b border-gray-700/30 bg-gray-800/20">
              <input value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-gray-800/30 border border-gray-700/30 rounded-lg px-2 py-1.5 text-white text-[10px] placeholder-gray-600 focus:outline-none focus:border-blue-500/30 mb-1"
                placeholder="بحث عن مستخدم..." />
              <div className="max-h-32 overflow-y-auto hide-scrollbar">
                {filteredNewUsers.map(u => (
                  <button key={u.id} onClick={() => { setSelectedUser(u.id); setShowUserList(false); }}
                    className="w-full text-right p-1.5 hover:bg-gray-700/20 rounded-lg transition-all flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 text-[10px] font-bold">{u.username.charAt(0)}</div>
                    <div>
                      <p className="text-white text-[10px]">{u.username}</p>
                      <p className="text-gray-600 text-[8px]">{u.email}</p>
                    </div>
                  </button>
                ))}
                {filteredNewUsers.length === 0 && <p className="text-gray-600 text-[10px] text-center py-2">لا توجد نتائج</p>}
              </div>
            </div>
          )}
          {usersWithChats.map(u => {
            const lastMsg = messages.filter(m => m.from === u.id || m.to === u.id).sort((a, b) => b.date - a.date)[0];
            const unread = messages.filter(m => m.from === u.id && m.to === 'admin001' && !m.read).length;
            return (
              <button key={u.id} onClick={() => setSelectedUser(u.id)}
                className={`w-full p-3 text-right hover:bg-gray-800/20 transition-all flex items-center gap-2 border-b border-gray-800/20 ${selectedUser === u.id ? 'bg-blue-500/10 border-r-2 border-r-blue-500' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center text-blue-400 text-xs font-bold border border-gray-700/20">
                  {u.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium">{u.username}</p>
                  {lastMsg && <p className="text-gray-600 text-[10px] truncate">{lastMsg.message}</p>}
                </div>
                {unread > 0 && <span className="w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center">{unread}</span>}
              </button>
            );
          })}
          {usersWithChats.length === 0 && !showUserList && <p className="text-gray-600 text-center py-8 text-xs">لا توجد رسائل</p>}
        </div>
        <div className="flex-1 flex flex-col">
          {selectedUser && selectedUserInfo && (
            <div className="p-3 border-b border-gray-700/30 bg-gradient-to-r from-blue-900/20 to-purple-900/20 flex items-center gap-2">
              <button onClick={() => setSelectedUser(null)} className="sm:hidden p-1.5 text-gray-400 hover:text-white bg-gray-800/50 rounded-lg">
                <ChevronLeft size={14} />
              </button>
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-bold border border-blue-500/20">
                {selectedUserInfo.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white text-xs font-medium">{selectedUserInfo.username}</p>
                <p className="text-gray-500 text-[10px]">{selectedUserInfo.email}</p>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 hide-scrollbar">
            {!selectedUser ? (
              <div className="text-center py-20"><MessageCircle size={30} className="mx-auto mb-2 text-gray-700" /><p className="text-gray-600 text-xs">اختر محادثة</p></div>
            ) :