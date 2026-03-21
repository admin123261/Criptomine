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
import { registerServiceWorker, requestNotificationPermission, checkForNewMessages, checkForNewNotifications, resetNotificationCounters } from './notifications';
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
const [toast, setToast] = useState(null);
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

  useEffect(() => {
    const i = setInterval(() => {
      setMessages(store.getUserMessages(user.id));
      store.markMessagesRead(user.id, user.id);
    }, 1000);
    return () => clearInterval(i);
  }, [user.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = () => {
    if (!msg.trim()) return;
    store.sendMessage(user.id, 'admin001', msg.trim());
    setMsg('');
    setMessages(store.getUserMessages(user.id));
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

  useEffect(() => {
    const i = setInterval(() => {
      setMessages(store.getAdminMessages());
      setUsers(store.getUsers());
    }, 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (selectedUser) store.markMessagesRead(selectedUser, 'admin001');
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedUser, messages]);

  const handleSend = () => {
    if (!msg.trim() || !selectedUser) return;
    store.sendMessage('admin001', selectedUser, msg.trim());
    setMsg('');
    setMessages(store.getAdminMessages());
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
            ) : userMsgs.length === 0 ? (
              <div className="text-center py-20"><MessageCircle size={30} className="mx-auto mb-2 text-gray-700" /><p className="text-gray-600 text-xs">لا توجد رسائل</p></div>
            ) : userMsgs.map(m => (
              <div key={m.id} className={`flex ${m.from === 'admin001' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${m.from === 'admin001'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                  : 'bg-gray-800/60 text-gray-300 border border-gray-700/30'}`}>
                  <p>{m.message}</p>
                  <p className={`text-[9px] mt-1 ${m.from === 'admin001' ? 'text-blue-200' : 'text-gray-600'}`}>
                    {new Date(m.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          {selectedUser && (
            <div className="p-2 border-t border-gray-700/30 flex gap-2">
              <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
                className="flex-1 bg-gray-800/30 border border-gray-700/30 rounded-lg px-3 py-2 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-blue-500/30"
                placeholder="اكتب رسالتك..." />
              <button onClick={handleSend} className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white hover:opacity-80">
                <Send size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Upgrade Modal =====
function UpgradeModal({ device, onClose, onUpgrade }: { device: UserDevice; onClose: () => void; onUpgrade: (newId: number) => void }) {
  const current = getDeviceTemplate(device.deviceId);
  const availableUpgrades = DEVICE_TEMPLATES.filter(d => d.price > current.price);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div className="relative glass-card-solid rounded-2xl p-6 max-w-sm w-full animate-scale-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-1">ترقية الجهاز</h3>
        <p className="text-gray-500 text-xs mb-4">الجهاز الحالي: {current.nameAr} (${current.price})</p>
        <div className="space-y-2 max-h-60 overflow-y-auto hide-scrollbar">
          {availableUpgrades.map(d => {
            const diff = d.price - current.price;
            return (
              <button key={d.id} onClick={() => onUpgrade(d.id)}
                className="w-full glass-card rounded-xl p-3 flex items-center justify-between hover:border-blue-500/30 transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{d.icon}</span>
                  <div>
                    <p className="text-white text-sm font-medium">{d.nameAr}</p>
                    <p className="text-gray-500 text-[10px]">{d.hashRate}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-green-400 font-bold text-sm">${d.price}</p>
                  <p className="text-yellow-400 text-[10px]">فرق: ${diff}</p>
                </div>
              </button>
            );
          })}
        </div>
        <button onClick={onClose} className="w-full mt-4 py-2 text-gray-500 text-sm hover:text-white transition-colors">إلغاء</button>
      </div>
    </div>
  );
}

// ===== Profile Page =====
function ProfilePage({ user, onBack, onNotify }: { user: User; onBack: () => void; onNotify: (msg: string) => void }) {
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [copied, setCopied] = useState(false);

  const handleChangePassword = () => {
    if (newPass !== confirmPass) { onNotify('كلمات المرور غير متطابقة'); return; }
    const res = store.changePassword(user.id, oldPass, newPass);
    if (res.success) { onNotify('تم تغيير كلمة المرور بنجاح'); setOldPass(''); setNewPass(''); setConfirmPass(''); }
    else onNotify(res.error || 'خطأ');
  };

  const copyCode = () => { navigator.clipboard.writeText(user.referralCode); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="space-y-4 animate-slide-up pb-20">
      <button onClick={onBack} className="flex items-center gap-1 text-gray-500 text-sm hover:text-white transition-colors">
        <ChevronLeft size={16} /> رجوع
      </button>

      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-blue-500/20">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user.username}</h2>
            <p className="text-gray-500 text-xs">{user.email}</p>
            <p className="text-gray-600 text-[10px]">عضو منذ {formatDate(user.createdAt)}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-800/20 rounded-xl p-3 text-center">
            <p className="text-gray-500 text-[10px]">الرصيد</p>
            <p className="text-green-400 font-bold">${user.balance.toFixed(2)}</p>
          </div>
          <div className="bg-gray-800/20 rounded-xl p-3 text-center">
            <p className="text-gray-500 text-[10px]">إجمالي الإيداعات</p>
            <p className="text-blue-400 font-bold">${user.totalDeposits.toFixed(0)}</p>
          </div>
          <div className="bg-gray-800/20 rounded-xl p-3 text-center">
            <p className="text-gray-500 text-[10px]">إجمالي السحوبات</p>
            <p className="text-orange-400 font-bold">${user.totalWithdrawals.toFixed(0)}</p>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <h3 className="font-bold text-white mb-3 flex items-center gap-2"><Share2 size={16} className="text-purple-400" /> كود الإحالة الخاص بك</h3>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-gray-800/30 border border-gray-700/30 rounded-xl px-4 py-2.5 text-white font-mono text-sm" dir="ltr">{user.referralCode}</div>
          <button onClick={copyCode} className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500/20 transition-all border border-blue-500/20">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
        <p className="text-gray-500 text-xs">عمولة الإحالة: 3%</p>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-gray-800/20 rounded-lg p-2 text-center">
            <p className="text-gray-500 text-[10px]">عدد الإحالات</p>
            <p className="text-purple-400 font-bold">{store.getReferralCount(user.id)}</p>
          </div>
          <div className="bg-gray-800/20 rounded-lg p-2 text-center">
            <p className="text-gray-500 text-[10px]">أرباح الإحالة</p>
            <p className="text-green-400 font-bold">${user.referralEarnings.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <h3 className="font-bold text-white mb-3 flex items-center gap-2"><Lock size={16} className="text-orange-400" /> تغيير كلمة المرور</h3>
        <div className="space-y-3">
          <input type="password" value={oldPass} onChange={e => setOldPass(e.target.value)}
            className="w-full bg-gray-800/30 border border-gray-700/30 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/30"
            placeholder="كلمة المرور الحالية" />
          <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
            className="w-full bg-gray-800/30 border border-gray-700/30 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/30"
            placeholder="كلمة المرور الجديدة" />
          <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
            className="w-full bg-gray-800/30 border border-gray-700/30 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/30"
            placeholder="تأكيد كلمة المرور" />
          <button onClick={handleChangePassword}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium py-2.5 rounded-xl hover:opacity-90 transition-all text-sm">
            تحديث كلمة المرور
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Transaction List =====
function TransactionList({ userId, typeFilter }: { userId: string; typeFilter?: 'deposit' | 'withdraw' }) {
  const txs = store.getTransactions().filter(t => t.userId === userId && (!typeFilter || t.type === typeFilter)).sort((a, b) => b.date - a.date);

  if (txs.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl overflow-hidden mt-4">
      <div className="p-3 border-b border-gray-800/30">
        <p className="text-gray-400 text-xs font-medium">سجل العمليات</p>
      </div>
      {txs.slice(0, 10).map(tx => (
        <div key={tx.id} className="p-3 border-b border-gray-800/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${tx.type === 'deposit' ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'}`}>
              {tx.type === 'deposit' ? <Download size={12} /> : <Upload size={12} />}
            </div>
            <div>
              <p className="text-white text-xs">{tx.type === 'deposit' ? 'إيداع' : 'سحب'}</p>
              <p className="text-gray-600 text-[10px]">{formatDate(tx.date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white font-medium text-xs">${tx.amount.toFixed(2)}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${tx.status === 'approved' ? 'bg-green-500/10 text-green-400' : tx.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
              {tx.status === 'approved' ? 'مؤكد' : tx.status === 'rejected' ? 'مرفوض' : 'معلق'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== Mining Device Cards =====
function MiniMiningCard({ device }: { device: UserDevice }) {
  const template = getDeviceTemplate(device.deviceId);
  const profit = calcProfit(device);
  const [, setTick] = useState(0);
  useEffect(() => { if (device.isRunning) { const i = setInterval(() => setTick(t => t + 1), 100); return () => clearInterval(i); } }, [device.isRunning]);
  if (!device.isRunning) return null;
  const p = calcProfit(device);

  return (
    <div className="glass-card rounded-xl p-3 mining-active-card relative overflow-hidden">
      <div className="mining-scan-line absolute inset-0 pointer-events-none" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="text-lg mining-device-icon">{template.icon}</span>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
          <div>
            <p className="text-white text-[11px] font-medium">{device.isGift ? 'هدية' : template.nameAr}</p>
            <p className="text-green-400 text-[10px] mining-profit-counter">${p.current.toFixed(4)}</p>
          </div>
        </div>
        <div className="text-left">
          <p className="text-gray-400 text-[9px]">{formatTime(profit.remaining)}</p>
          <div className="w-16 h-1 bg-gray-800 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-shimmer" style={{ width: `${profit.progress * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DeviceStoreCard({ device, onBuy, userBalance }: { device: DeviceTemplate; onBuy: (id: number) => void; userBalance: number }) {
  const profit3d = device.price * 0.02 * 3;
  const profit7d = device.price * 0.025 * 7;

  return (
    <div className={`glass-card rounded-2xl p-4 hover:border-gray-600/30 transition-all duration-300 group`}>
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${device.color} flex items-center justify-center text-2xl mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
        {device.icon}
      </div>
      <h3 className="text-white font-bold text-sm">{device.nameAr}</h3>
      <p className="text-gray-500 text-[10px] mb-2">{device.hashRate}</p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gray-800/20 rounded-lg p-2 text-center">
          <p className="text-gray-600 text-[8px]">3 أيام (2%)</p>
          <p className="text-green-400 text-xs font-bold">${profit3d.toFixed(2)}</p>
        </div>
        <div className="bg-gray-800/20 rounded-lg p-2 text-center">
          <p className="text-gray-600 text-[8px]">7 أيام (2.5%)</p>
          <p className="text-green-400 text-xs font-bold">${profit7d.toFixed(2)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-white font-bold text-lg">${device.price}</span>
        <button onClick={() => onBuy(device.id)} disabled={userBalance < device.price}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs rounded-xl hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-blue-500/15">
          شراء الجهاز
        </button>
      </div>
    </div>
  );
}

function MyDeviceCard({ device, userId, onNotify }: { device: UserDevice; userId: string; onNotify: (msg: string) => void }) {
  const template = getDeviceTemplate(device.deviceId);
  const [, setTick] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    if (device.isRunning) { const i = setInterval(() => setTick(t => t + 1), 100); return () => clearInterval(i); }
  }, [device.isRunning]);

  const profit = calcProfit(device);

  const handleStart = (days: number) => {
    const res = store.startMining(userId, device.id, days);
    if (res.success) onNotify('تم تشغيل جهاز التعدين!');
    else onNotify(res.error || 'خطأ');
  };

  const handleCollect = () => {
    const res = store.collectProfit(userId, device.id);
    if (res.success) onNotify(`تم جمع الأرباح! +$${res.profit?.toFixed(2)}`);
    else onNotify(res.error || 'خطأ');
  };

  const handleUpgrade = (newDeviceId: number) => {
    const res = store.upgradeDevice(userId, device.id, newDeviceId);
    if (res.success) { onNotify('تم ترقية الجهاز بنجاح!'); setShowUpgrade(false); }
    else onNotify(res.error || 'خطأ');
  };

  return (
    <>
      <div className={`glass-card rounded-2xl p-4 ${device.isRunning ? 'mining-active-card relative overflow-hidden' : ''}`}>
        {device.isRunning && <div className="mining-scan-line absolute inset-0 pointer-events-none" />}
        {device.isRunning && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-2 right-8 w-1.5 h-1.5 bg-blue-400 rounded-full particle-1" />
            <div className="absolute top-4 left-10 w-1 h-1 bg-purple-400 rounded-full particle-2" />
            <div className="absolute bottom-8 right-12 w-1.5 h-1.5 bg-green-400 rounded-full particle-3" />
            <div className="absolute top-6 right-20 w-1 h-1 bg-yellow-400 rounded-full particle-4" />
            <div className="absolute bottom-4 left-16 w-1.5 h-1.5 bg-cyan-400 rounded-full particle-5" />
          </div>
        )}

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center text-xl shadow-lg ${device.isRunning ? 'mining-device-icon' : ''}`}>
                {template.icon}
                {device.isRunning && <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse border-2 border-gray-900" />}
              </div>
              <div>
                <p className="text-white font-bold text-sm">{device.isGift ? 'جهاز الهدية 🎁' : template.nameAr}</p>
                <p className="text-gray-500 text-[10px]">{template.hashRate}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {device.isRunning ? (
                <span className="flex items-center gap-1 text-[10px] bg-green-500/10 text-green-400 px-2 py-1 rounded-lg border border-green-500/20">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full mining-live-text" /> يعمل
                </span>
              ) : profit.finished ? (
                <span className="text-[10px] bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded-lg border border-yellow-500/20">انتهى</span>
              ) : (
                <span className="text-[10px] bg-gray-500/10 text-gray-400 px-2 py-1 rounded-lg border border-gray-500/20">متوقف</span>
              )}
            </div>
          </div>

          {device.isRunning && (
            <div className="space-y-3 animate-slide-up">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-800/30 rounded-lg p-2 text-center border border-gray-700/20">
                  <p className="text-gray-500 text-[8px]">/ثانية</p>
                  <p className="text-green-400 text-[11px] font-bold mining-profit-counter">${calcProfit(device).perSecond.toFixed(6)}</p>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-2 text-center border border-gray-700/20">
                  <p className="text-gray-500 text-[8px]">/دقيقة</p>
                  <p className="text-green-400 text-[11px] font-bold">${calcProfit(device).perMinute.toFixed(5)}</p>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-2 text-center border border-gray-700/20">
                  <p className="text-gray-500 text-[8px]">/ساعة</p>
                  <p className="text-green-400 text-[11px] font-bold">${calcProfit(device).perHour.toFixed(4)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">الوقت المتبقي</span>
                <span className="text-white font-mono">{formatTime(profit.remaining)}</span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all animate-shimmer" style={{ width: `${profit.progress * 100}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">الربح الحالي</span>
                <span className="text-green-400 font-bold mining-profit-counter">${calcProfit(device).current.toFixed(4)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">الربح الإجمالي</span>
                <span className="text-blue-400 font-bold">${profit.total.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1 bg-green-500/5 rounded-lg px-2 py-1 border border-green-500/10">
                <span className="w-2 h-2 bg-green-400 rounded-full mining-live-text" />
                <span className="text-green-400 text-[10px] font-medium">LIVE - التعدين نشط</span>
              </div>
            </div>
          )}

          {!device.isRunning && !profit.finished && !device.startTime && !(device.isGift && device.totalEarned > 0) && (
            <div className="space-y-2 mt-3 animate-slide-up">
              <p className="text-gray-400 text-xs mb-2">اختر مدة التعدين:</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleStart(3)}
                  className="flex flex-col items-center gap-1 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all">
                  <Play size={16} className="text-blue-400" />
                  <span className="text-white text-xs font-bold">3 أيام</span>
                  <span className="text-green-400 text-[10px]">2% يومياً</span>
                  <span className="text-gray-500 text-[9px]">ربح: ${(template.price * 0.02 * 3).toFixed(2)}</span>
                </button>
                <button onClick={() => handleStart(7)}
                  className="flex flex-col items-center gap-1 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl hover:bg-purple-500/20 transition-all">
                  <Play size={16} className="text-purple-400" />
                  <span className="text-white text-xs font-bold">7 أيام</span>
                  <span className="text-green-400 text-[10px]">2.5% يومياً</span>
                  <span className="text-gray-500 text-[9px]">ربح: ${(template.price * 0.025 * 7).toFixed(2)}</span>
                </button>
              </div>
            </div>
          )}

          {profit.finished && (
            <div className="mt-3 animate-slide-up">
              <button onClick={handleCollect}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2">
                <DollarSign size={16} /> جمع الأرباح (${profit.total.toFixed(2)})
              </button>
            </div>
          )}

          {device.isGift && device.totalEarned > 0 && !device.isRunning && !profit.finished && (
            <div className="mt-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center animate-slide-up">
              <Gift size={20} className="text-yellow-400 mx-auto mb-1" />
              <p className="text-yellow-300 text-xs font-medium">تم استخدام جهاز الهدية</p>
              <p className="text-gray-500 text-[10px]">يمكنك شراء جهاز جديد من المتجر</p>
            </div>
          )}

          {!device.isGift && !device.isRunning && (
            <button onClick={() => setShowUpgrade(true)}
              className="mt-2 w-full py-2 text-xs text-purple-400 bg-purple-500/5 border border-purple-500/10 rounded-xl hover:bg-purple-500/10 transition-all flex items-center justify-center gap-1">
              <ArrowUpCircle size={14} /> ترقية الجهاز
            </button>
          )}

          <div className="mt-2 text-center">
            <p className="text-gray-600 text-[10px]">إجمالي الأرباح: ${device.totalEarned.toFixed(2)}</p>
          </div>
        </div>
      </div>
      {showUpgrade && <UpgradeModal device={device} onClose={() => setShowUpgrade(false)} onUpgrade={handleUpgrade} />}
    </>
  );
}

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

  const refreshUser = useCallback(() => {
    const u = store.getCurrentUser();
    if (u) setUser({ ...u });
  }, []);

  useEffect(() => { const i = setInterval(refreshUser, 1000); return () => clearInterval(i); }, [refreshUser]);

  // تفعيل إشعارات المتصفح
  useEffect(() => {
    registerServiceWorker();
    requestNotificationPermission();
    resetNotificationCounters();
  }, []);

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
        const data = payload.new;

        if (data.sender === "admin") return;

        setToast(data.message);

        // صوت
        const audio = new Audio("/notification.mp3");
        audio.play();

        // يختفي بعد 3 ثواني
        setTimeout(() => {
          setToast(null);
        }, 3000);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

  // مراقبة الرسائل والإشعارات الجديدة
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      const messages = store.getChatMessages();
      const notifications = store.getNotifications(user.id);
      checkForNewMessages(messages, user.id, user.isAdmin);
      checkForNewNotifications(notifications, user.id);
    }, 1500);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) {
    return <AuthScreen onLogin={(u) => {
      setUser(u);
      if (u.isNew) { setShowWelcome(true); const users = store.getUsers(); const idx = users.findIndex(x => x.id === u.id); if (idx !== -1) { users[idx].isNew = false; store.updateUser(users[idx]); } }
    }} />;
  }

  if (user.isAdmin) return <AdminPanel user={user} onLogout={() => { store.logout(); setUser(null); }} />;

  const notify = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };

  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount < 10) { notify('الحد الأدنى للإيداع 10 دولار'); return; }
    const res = store.createTransaction(user.id, 'deposit', amount);
    if (res.success) { notify('تم إرسال طلب الإيداع بنجاح!'); setDepositAmount(''); refreshUser(); }
    else notify(res.error || 'خطأ');
  };

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 10) { notify('الحد الأدنى للسحب 10 دولار'); return; }
    if (!walletAddress.trim()) { notify('يرجى إدخال عنوان المحفظة'); return; }
    if (user.balance < amount) { notify('رصيدك غير كافي'); return; }
    const res = store.createTransaction(user.id, 'withdraw', amount, walletAddress.trim());
    if (res.success) { notify(`تم إرسال طلب سحب $${amount.toFixed(2)} (رسوم 10%، المستلم: $${(amount * 0.90).toFixed(2)})`); setWithdrawAmount(''); setWalletAddress(''); refreshUser(); }
    else notify(res.error || 'خطأ');
  };

  const handleBuyDevice = (deviceId: number) => {
    if (confirm('هل تريد تأكيد شراء هذا الجهاز؟')) {
      const res = store.buyDevice(user.id, deviceId);
      if (res.success) { notify('تم شراء الجهاز بنجاح!'); setPage('my-devices'); refreshUser(); }
      else notify(res.error || 'خطأ');
    }
  };

  const copyWallet = () => { navigator.clipboard.writeText(PLATFORM_WALLET); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const unreadNotif = store.getUnreadNotifCount(user.id);
  const unreadChat = store.getUnreadCount(user.id);
  const runningDevices = user.devices.filter(d => d.isRunning);

  return (
    <div className="min-h-screen pb-20">
      {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
      {showNotif && <NotificationCenter userId={user.id} onClose={() => setShowNotif(false)} />}

      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <div className="glass-card rounded-xl px-5 py-3 shadow-2xl text-white text-sm font-medium">{notification}</div>
        </div>
      )}
{toast && (
  <div
    style={{
      position: "fixed",
      top: "20px",
      right: "20px",
      background: "#1e293b",
      color: "#fff",
      padding: "12px 20px",
      borderRadius: "10px",
      zIndex: 9999
    }}
  >
    🔔 {toast}
  </div>
)}
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
        {/* Dashboard */}
        {page === 'dashboard' && (
          <div className="space-y-4 animate-slide-up">
            <div className="glass-card rounded-2xl p-5">
              <p className="text-gray-500 text-xs mb-1">الرصيد</p>
              <p className="text-3xl font-bold text-white">${user.balance.toFixed(2)}</p>
              <div className="grid grid-cols-4 gap-2 mt-4">
                {[
                  { label: 'إجمالي الأرباح', value: `$${user.devices.reduce((s, d) => s + d.totalEarned, 0).toFixed(2)}`, color: 'text-green-400', icon: <TrendingUp size={14} /> },
                  { label: 'أجهزة نشطة', value: runningDevices.length, color: 'text-blue-400', icon: <Zap size={14} /> },
                  { label: 'الأجهزة', value: user.devices.length, color: 'text-purple-400', icon: <HardDrive size={14} /> },
                  { label: 'أرباح الإحالة', value: `$${user.referralEarnings.toFixed(2)}`, color: 'text-orange-400', icon: <Award size={14} /> },
                ].map((s, i) => (
                  <div key={i} className="bg-gray-800/20 rounded-xl p-2.5 text-center">
                    <div className={`${s.color} mx-auto mb-1`}>{s.icon}</div>
                    <p className="text-gray-600 text-[8px]">{s.label}</p>
                    <p className={`font-bold text-xs ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'إيداع', icon: <Download size={16} />, color: 'from-green-500 to-emerald-600', page: 'deposit' as Page },
                { label: 'سحب', icon: <Upload size={16} />, color: 'from-orange-500 to-red-500', page: 'withdraw' as Page },
                { label: 'أجهزتي', icon: <HardDrive size={16} />, color: 'from-blue-500 to-cyan-600', page: 'my-devices' as Page },
                { label: 'المتجر', icon: <ShoppingCart size={16} />, color: 'from-purple-500 to-violet-600', page: 'store' as Page },
              ].map((btn, i) => (
                <button key={i} onClick={() => setPage(btn.page)}
                  className={`bg-gradient-to-br ${btn.color} p-3 rounded-xl text-center hover:opacity-90 transition-all shadow-lg`}>
                  <div className="mx-auto mb-1">{btn.icon}</div>
                  <p className="text-[10px] font-medium">{btn.label}</p>
                </button>
              ))}
            </div>

            {runningDevices.length > 0 && (
              <div>
                <p className="text-gray-400 text-xs font-medium mb-2 flex items-center gap-1"><Zap size={12} className="text-green-400" /> أجهزة تعمل الآن</p>
                <div className="space-y-2">
                  {runningDevices.map(d => <MiniMiningCard key={d.id} device={d} />)}
                </div>
              </div>
            )}

            {store.getReferralCount(user.id) === 0 && (
              <div className="glass-card rounded-2xl p-4 border border-purple-500/10">
                <div className="flex items-center gap-3">
                  <Share2 size={20} className="text-purple-400 shrink-0" />
                  <div>
                    <p className="text-white text-sm font-medium">ادعُ أصدقاءك واحصل على 3% عمولة!</p>
                    <p className="text-gray-500 text-[10px]">كود الإحالة: {user.referralCode}</p>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(user.referralCode); notify('تم نسخ كود الإحالة!'); }}
                    className="shrink-0 px-3 py-1.5 bg-purple-500/10 text-purple-400 rounded-lg text-[10px] border border-purple-500/20 hover:bg-purple-500/20 transition-all">
                    نسخ الكود
                  </button>
                </div>
              </div>
            )}

            <button onClick={() => setShowChat(true)}
              className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 hover:border-blue-500/20 transition-all border border-transparent">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <MessageCircle size={18} className="text-white" />
              </div>
              <div className="flex-1 text-right">
                <p className="text-white text-sm font-medium">تواصل مع الدعم الفني</p>
                <p className="text-green-400 text-[10px]">● متصل الآن</p>
              </div>
              <ChevronLeft size={16} className="text-gray-600" />
            </button>

            {/* Telegram */}
            <a href="https://t.me/cryptminepro" target="_blank" rel="noopener noreferrer"
              className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 hover:border-sky-500/20 transition-all border border-transparent">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg">
                <Send size={18} className="text-white" />
              </div>
              <div className="flex-1 text-right">
                <p className="text-white text-sm font-medium">تابعنا على تلغرام</p>
                <p className="text-sky-400 text-[10px]">@cryptminepro</p>
              </div>
              <ExternalLink size={14} className="text-gray-600" />
            </a>

            {/* Info Page Button */}
            <button onClick={() => setPage('info')}
              className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 hover:border-amber-500/20 transition-all border border-transparent">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg">
                <BookOpen size={18} className="text-white" />
              </div>
              <div className="flex-1 text-right">
                <p className="text-white text-sm font-medium">دليل استخدام المنصة</p>
                <p className="text-amber-400 text-[10px]">تعرف على كيفية العمل والربح</p>
              </div>
              <ChevronLeft size={16} className="text-gray-600" />
            </button>
          </div>
        )}

        {/* Store */}
        {page === 'store' && (
          <div className="space-y-4 animate-slide-up pb-20">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><ShoppingCart size={20} className="text-purple-400" /> أجهزة التعدين</h2>
            <div className="grid grid-cols-2 gap-3">
              {DEVICE_TEMPLATES.map(d => <DeviceStoreCard key={d.id} device={d} onBuy={handleBuyDevice} userBalance={user.balance} />)}
            </div>
          </div>
        )}

        {/* My Devices */}
        {page === 'my-devices' && (
          <div className="space-y-4 animate-slide-up pb-20">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><HardDrive size={20} className="text-blue-400" /> أجهزتي ({user.devices.length})</h2>
            {user.devices.length === 0 ? (
              <div className="text-center py-12">
                <HardDrive size={40} className="mx-auto mb-3 text-gray-700" />
                <p className="text-gray-500 text-sm mb-3">لا تملك أجهزة بعد</p>
                <button onClick={() => setPage('store')} className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm rounded-xl">تصفح المتجر</button>
              </div>
            ) : (
              <div className="space-y-3">
                {user.devices.map(d => <MyDeviceCard key={d.id} device={d} userId={user.id} onNotify={notify} />)}
              </div>
            )}
          </div>
        )}

        {/* Deposit */}
        {page === 'deposit' && (
          <div className="space-y-4 animate-slide-up pb-20">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><Download size={20} className="text-green-400" /> إيداع رصيد</h2>
            <div className="glass-card rounded-2xl p-5">
              <label className="block text-xs text-gray-500 mb-2">مبلغ الإيداع (الحد الأدنى: $10)</label>
              <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
                className="w-full bg-gray-800/30 border border-gray-700/30 rounded-xl px-4 py-3 text-white text-lg font-bold placeholder-gray-600 focus:outline-none focus:border-green-500/30 mb-4"
                placeholder="0.00" min="10" dir="ltr" />

              <div className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-500/20 rounded-xl p-4 mb-4">
                <p className="text-gray-400 text-xs mb-2 flex items-center gap-1"><Wallet size={14} className="text-blue-400" /> عنوان محفظة المنصة</p>
                <div className="bg-gray-900/50 rounded-lg p-3 flex items-center gap-2 border border-gray-700/30">
                  <p className="text-blue-300 text-[11px] font-mono break-all flex-1" dir="ltr">{PLATFORM_WALLET}</p>
                  <button onClick={copyWallet} className="shrink-0 p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-all border border-blue-500/20">
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                {copied && <p className="text-green-400 text-[10px] mt-1 text-center">✅ تم نسخ العنوان بنجاح!</p>}
                <div className="flex items-center gap-2 mt-3">
                  <span className="flex items-center gap-1 text-[10px] bg-purple-500/10 text-purple-400 px-2 py-1 rounded-lg border border-purple-500/20">
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" /> شبكة ERC20 (Ethereum)
                  </span>
                </div>
              </div>

              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 mb-4 flex items-center gap-2">
                <AlertTriangle size={14} className="text-yellow-400 shrink-0" />
                <p className="text-yellow-300 text-[10px]">أرسل المبلغ عبر شبكة ERC20 فقط. أي إرسال عبر شبكة أخرى قد يؤدي لفقدان الأموال.</p>
              </div>

              <button onClick={handleDeposit}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-green-500/15 text-sm">
                إرسال طلب الإيداع
              </button>
            </div>
            <TransactionList userId={user.id} typeFilter="deposit" />
          </div>
        )}

        {/* Withdraw */}
        {page === 'withdraw' && (
          <div className="space-y-4 animate-slide-up pb-20">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><Upload size={20} className="text-orange-400" /> سحب أرباح <span className="text-xs text-gray-500">(رسوم: 10%)</span></h2>
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs text-gray-500">رصيدك المتاح</label>
                <span className="text-green-400 font-bold">${user.balance.toFixed(2)}</span>
              </div>

              <label className="block text-xs text-gray-500 mb-1.5">عنوان محفظتك (ERC20)</label>
              <div className="relative mb-3">
                <Wallet size={16} className="absolute right-3 top-3 text-gray-600" />
                <input type="text" value={walletAddress} onChange={e => setWalletAddress(e.target.value)}
                  className="w-full bg-gray-800/30 border border-gray-700/30 rounded-xl py-2.5 pr-10 pl-4 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-orange-500/30 transition-all"
                  placeholder="0x..." dir="ltr" />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center gap-1 text-[10px] bg-purple-500/10 text-purple-400 px-2 py-1 rounded-lg border border-purple-500/20">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" /> شبكة السحب: ERC20 (Ethereum)
                </span>
              </div>

              <label className="block text-xs text-gray-500 mb-1.5">مبلغ السحب (الحد الأدنى: $10)</label>
              <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                className="w-full bg-gray-800/30 border border-gray-700/30 rounded-xl px-4 py-3 text-white text-lg font-bold placeholder-gray-600 focus:outline-none focus:border-orange-500/30 mb-2"
                placeholder="0.00" min="10" dir="ltr" />
              {withdrawAmount && parseFloat(withdrawAmount) >= 10 && (
                <div className="bg-gray-800/20 rounded-lg p-2 mb-3 flex items-center justify-between">
                  <span className="text-gray-500 text-xs">المبلغ المستلم (بعد رسوم 10%):</span>
                  <span className="text-green-400 font-bold text-sm">${(parseFloat(withdrawAmount) * 0.90).toFixed(2)}</span>
                </div>
              )}

              {/* قوانين وشروط السحب */}
              <div className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-500/20 rounded-xl p-4 mb-4">
                <h4 className="text-white text-xs font-bold mb-2 flex items-center gap-1.5">
                  <Shield size={14} className="text-blue-400" /> قوانين وشروط السحب
                </h4>
                <ul className="space-y-1.5 text-gray-400 text-[10px]">
                  <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">•</span><span>الحد الأدنى للسحب: $10</span></li>
                  <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">•</span><span>رسوم السحب: 10% من المبلغ</span></li>
                  <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">•</span><span>مدة المراجعة: 24 إلى 48 ساعة</span></li>
                  <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">•</span><span>شبكة التحويل: ERC20 (Ethereum)</span></li>
                  <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">•</span><span>تأكد من صحة عنوان المحفظة</span></li>
                  <li className="flex items-start gap-1.5"><span className="text-orange-400 mt-0.5">⚠️</span><span>الطلبات المؤكدة غير قابلة للإلغاء</span></li>
                </ul>
              </div>

              {user.balance < 10 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-3 flex items-center gap-2 animate-slide-up">
                  <AlertTriangle size={16} className="text-red-400 shrink-0" />
                  <p className="text-red-400 text-xs">رصيدك: <span className="font-bold">${user.balance.toFixed(2)}</span> - رصيد غير كافٍ للسحب. الحد الأدنى: <span className="font-bold">$10</span></p>
                </div>
              )}
              {withdrawAmount && parseFloat(withdrawAmount) > user.balance && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-3 flex items-center gap-2 animate-slide-up">
                  <AlertTriangle size={16} className="text-red-400 shrink-0" />
                  <p className="text-red-400 text-xs">المبلغ المطلوب أكبر من رصيدك المتاح (<span className="font-bold">${user.balance.toFixed(2)}</span>)</p>
                </div>
              )}

              <button onClick={handleWithdraw} disabled={!walletAddress.trim() || user.balance < 10 || (!!withdrawAmount && parseFloat(withdrawAmount) > user.balance)}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-orange-500/15 disabled:opacity-40 disabled:cursor-not-allowed text-sm">
                {user.balance < 10 ? '❌ رصيد غير كافٍ' : 'طلب السحب'}
              </button>
            </div>
            <TransactionList userId={user.id} typeFilter="withdraw" />
          </div>
        )}

        {/* Profile */}
        {page === 'profile' && (
          <ProfilePage user={user} onBack={() => setPage('dashboard')} onNotify={notify} />
        )}
      </main>

        {/* Info Page */}
        {page === 'info' && (
          <div className="space-y-4 animate-slide-up pb-20">
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setPage('dashboard')} className="p-2 text-gray-400 hover:text-white transition-colors">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen size={20} className="text-amber-400" /> دليل استخدام المنصة
              </h2>
            </div>

            {/* مقدمة */}
            <div className="glass-card rounded-2xl p-5 border border-amber-500/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg">
                  <Info size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">ما هي CryptoMine Pro؟</h3>
                  <p className="text-amber-400 text-[10px]">منصة تعدين سحابي بالذكاء الاصطناعي</p>
                </div>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                CryptoMine Pro هي منصة تعدين عملات رقمية سحابية تعتمد على تقنيات الذكاء الاصطناعي.
                نوفر لك أجهزة تعدين افتراضية بأسعار مناسبة تبدأ من 12 دولار فقط، مع أرباح يومية
                مضمونة وسحب سريع لأرباحك.
              </p>
            </div>

            {/* كيف تبدأ */}
            <div className="glass-card rounded-2xl p-5 border border-blue-500/10">
              <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                <Zap size={16} className="text-blue-400" /> كيف تبدأ العمل؟
              </h3>
              <div className="space-y-3">
                {[
                  { step: '1', title: 'إنشاء حساب', desc: 'سجّل حسابك مجاناً واحصل على جهاز هدية بربح 5 دولار', icon: UserIcon, color: 'blue' },
                  { step: '2', title: 'إيداع الرصيد', desc: 'أودع 10 دولار كحد أدنى عبر شبكة ERC20', icon: Download, color: 'green' },
                  { step: '3', title: 'شراء جهاز تعدين', desc: 'اختر الجهاز المناسب لميزانيتك من 12$ إلى 1000$', icon: ShoppingCart, color: 'purple' },
                  { step: '4', title: 'تشغيل الجهاز', desc: 'اختر مدة التعدين (3 أيام أو 7 أيام) وابدأ الربح', icon: Play, color: 'amber' },
                  { step: '5', title: 'جمع الأرباح', desc: 'عند انتهاء المدة، اجمع أرباحك وأعد التشغيل', icon: DollarSign, color: 'emerald' },
                  { step: '6', title: 'سحب الأرباح', desc: 'اسحب أرباحك بحد أدنى 10$ عبر ERC20', icon: Upload, color: 'cyan' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                    <div className={`w-8 h-8 rounded-lg bg-${item.color}-500/20 flex items-center justify-center shrink-0`}>
                      <span className={`text-${item.color}-400 text-xs font-bold`}>{item.step}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{item.title}</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* الأجهزة والأسعار */}
            <div className="glass-card rounded-2xl p-5 border border-purple-500/10">
              <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                <Pickaxe size={16} className="text-purple-400" /> أجهزة التعدين والأسعار
              </h3>
              <div className="space-y-2">
                {DEVICE_TEMPLATES.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{d.icon}</div>
                      <div>
                        <p className="text-white text-sm font-medium">{d.name}</p>
                        <p className="text-gray-500 text-[10px]">قوة التعدين: {d.hashRate}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-green-400 text-sm font-bold">${d.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* نسب الأرباح */}
            <div className="glass-card rounded-2xl p-5 border border-green-500/10">
              <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                <Percent size={16} className="text-green-400" /> نسب الأرباح
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-center">
                  <Timer size={20} className="text-blue-400 mx-auto mb-2" />
                  <p className="text-white font-bold text-lg">3 أيام</p>
                  <p className="text-blue-400 text-sm font-medium">ربح 2% يومياً</p>
                  <p className="text-gray-500 text-[10px] mt-1">إجمالي: 6% من سعر الجهاز</p>
                </div>
                <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10 text-center">
                  <Timer size={20} className="text-green-400 mx-auto mb-2" />
                  <p className="text-white font-bold text-lg">7 أيام</p>
                  <p className="text-green-400 text-sm font-medium">ربح 2.5% يومياً</p>
                  <p className="text-gray-500 text-[10px] mt-1">إجمالي: 17.5% من سعر الجهاز</p>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <p className="text-amber-400 text-[11px] text-center">
                  💡 مثال: جهاز بسعر $100 × 7 أيام × 2.5% = ربح $17.5
                </p>
              </div>
            </div>

            {/* الترقية */}
            <div className="glass-card rounded-2xl p-5 border border-cyan-500/10">
              <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                <ArrowUpCircle size={16} className="text-cyan-400" /> ترقية الأجهزة
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                يمكنك ترقية جهازك إلى جهاز أقوى في أي وقت! ما عليك سوى دفع <span className="text-cyan-400 font-bold">فرق السعر فقط</span> بين
                جهازك الحالي والجهاز الجديد. مثلاً: إذا كنت تملك جهاز بـ $40 وتريد الترقية إلى جهاز بـ $80، تدفع فقط $40.
              </p>
            </div>

            {/* قوانين الإيداع والسحب */}
            <div className="glass-card rounded-2xl p-5 border border-red-500/10">
              <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-400" /> قوانين الإيداع والسحب
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                  <p className="text-green-400 text-xs font-bold mb-1.5">💰 الإيداع:</p>
                  <ul className="text-gray-300 text-[11px] space-y-1 pr-3">
                    <li>• الحد الأدنى للإيداع: <span className="text-white font-medium">$10</span></li>
                    <li>• شبكة التحويل: <span className="text-white font-medium">ERC20 (Ethereum)</span></li>
                    <li>• يتم تأكيد الإيداع خلال <span className="text-white font-medium">1 - 24 ساعة</span></li>
                    <li>• لا توجد رسوم على الإيداع</li>
                  </ul>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                  <p className="text-red-400 text-xs font-bold mb-1.5">📤 السحب:</p>
                  <ul className="text-gray-300 text-[11px] space-y-1 pr-3">
                    <li>• الحد الأدنى للسحب: <span className="text-white font-medium">$10</span></li>
                    <li>• رسوم السحب: <span className="text-white font-medium">10%</span></li>
                    <li>• شبكة التحويل: <span className="text-white font-medium">ERC20 (Ethereum)</span></li>
                    <li>• مدة المراجعة: <span className="text-white font-medium">24 إلى 48 ساعة</span></li>
                    <li>• تأكد من صحة عنوان المحفظة قبل الإرسال</li>
                    <li>• الطلبات المرسلة <span className="text-red-400 font-medium">غير قابلة للإلغاء</span></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* نظام الإحالة */}
            <div className="glass-card rounded-2xl p-5 border border-purple-500/10">
              <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                <Share2 size={16} className="text-purple-400" /> نظام الإحالة
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed mb-3">
                شارك كود الإحالة الخاص بك مع أصدقائك واحصل على <span className="text-purple-400 font-bold">3% عمولة</span> من
                أرباح تعدين كل صديق يسجل باستخدام كودك. العمولة تُضاف تلقائياً إلى رصيدك.
              </p>
              <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 text-center">
                <p className="text-gray-400 text-[10px] mb-1">كود الإحالة الخاص بك:</p>
                <p className="text-purple-400 font-bold text-lg">{user.referralCode}</p>
                <button onClick={() => { navigator.clipboard.writeText(user.referralCode); notify('تم نسخ كود الإحالة!'); }}
                  className="mt-2 px-4 py-1.5 bg-purple-500/10 text-purple-400 rounded-lg text-[11px] border border-purple-500/20 hover:bg-purple-500/20 transition-all">
                  📋 نسخ الكود
                </button>
              </div>
            </div>

            {/* الهدية الترحيبية */}
            <div className="glass-card rounded-2xl p-5 border border-yellow-500/10">
              <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                <Gift size={16} className="text-yellow-400" /> الهدية الترحيبية
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                عند التسجيل لأول مرة، تحصل على <span className="text-yellow-400 font-bold">جهاز تعدين مجاني</span> يعمل
                لمدة <span className="text-yellow-400 font-bold">24 ساعة</span> بربح
                <span className="text-yellow-400 font-bold"> 5 دولار</span>. هذه الهدية تُستخدم مرة واحدة فقط
                ولا يمكن إعادة تشغيلها.
              </p>
            </div>

            {/* التواصل */}
            <div className="glass-card rounded-2xl p-5 border border-sky-500/10">
              <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                <PhoneCall size={16} className="text-sky-400" /> تواصل معنا
              </h3>
              <div className="space-y-3">
                <button onClick={() => setShowChat(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10 transition-all">
                  <MessageCircle size={18} className="text-blue-400 shrink-0" />
                  <div className="text-right flex-1">
                    <p className="text-white text-sm font-medium">الدردشة المباشرة</p>
                    <p className="text-green-400 text-[10px]">● متصل الآن</p>
                  </div>
                </button>
                <a href="https://t.me/cryptminepro" target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-sky-500/5 border border-sky-500/10 hover:bg-sky-500/10 transition-all">
                  <Send size={18} className="text-sky-400 shrink-0" />
                  <div className="text-right flex-1">
                    <p className="text-white text-sm font-medium">تلغرام</p>
                    <p className="text-sky-400 text-[10px]">@cryptminepro</p>
                  </div>
                  <ExternalLink size={14} className="text-gray-600" />
                </a>
              </div>
            </div>

            <div className="text-center py-4">
              <p className="text-gray-600 text-[10px]">© 2025 CryptoMine Pro - جميع الحقوق محفوظة</p>
            </div>
          </div>
        )}

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
  const [tab, setTab] = useState<'transactions' | 'users' | 'chat'>('transactions');
  const [transactions, setTransactions] = useState(store.getTransactions());
  const [users, setUsers] = useState(store.getUsers());
  const [notification, setNotification] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => { const i = setInterval(() => { setTransactions(store.getTransactions()); setUsers(store.getUsers()); }, 2000); return () => clearInterval(i); }, []);

  const pendingTxs = transactions.filter(tx => tx.status === 'pending');
  const notify = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };
  const handleApprove = (txId: string) => { store.approveTransaction(txId); setTransactions(store.getTransactions()); notify('تم تأكيد المعاملة ✅'); };
  const handleReject = (txId: string) => { store.rejectTransaction(txId); setTransactions(store.getTransactions()); notify('تم رفض المعاملة ❌'); };

  const filteredTxs = transactions.filter(tx => {
    if (filterStatus !== 'all' && tx.status !== filterStatus) return false;
    if (searchTerm) {
      const u = users.find(u => u.id === tx.userId);
      if (!u?.username.toLowerCase().includes(searchTerm.toLowerCase()) && !u?.email.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  }).sort((a, b) => b.date - a.date);

  const totalBalance = users.filter(u => !u.isAdmin).reduce((s, u) => s + u.balance, 0);
  const totalDevices = users.filter(u => !u.isAdmin).reduce((s, u) => s + u.devices.length, 0);
  const unreadNotif = store.getUnreadNotifCount(user.id);

  return (
    <div className="min-h-screen">
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <div className="glass-card rounded-xl px-5 py-3 shadow-2xl text-white text-sm font-medium">{notification}</div>
        </div>
      )}

      <header className="sticky top-0 z-40 glass border-b border-gray-800/30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/20">
              <Shield size={18} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">لوحة التحكم</h1>
              <p className="text-[10px] text-gray-600">مرحباً Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingTxs.length > 0 && (
              <div className="bg-red-500/10 text-red-400 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 animate-pulse border border-red-500/20">
                <Bell size={14} /> {pendingTxs.length} معلقة
              </div>
            )}
            {unreadNotif > 0 && (
              <span className="bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded-lg text-xs border border-yellow-500/20">{unreadNotif} إشعارات</span>
            )}
            <button onClick={onLogout} className="p-2 text-gray-600 hover:text-white"><LogOut size={16} /></button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-5">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          {[
            { icon: <Users size={16} />, color: 'text-blue-400', label: 'المستخدمين', value: users.filter(u => !u.isAdmin).length },
            { icon: <Clock size={16} />, color: 'text-yellow-400', label: 'معلقة', value: pendingTxs.length },
            { icon: <DollarSign size={16} />, color: 'text-green-400', label: 'إجمالي الأرصدة', value: '$' + totalBalance.toFixed(0) },
            { icon: <HardDrive size={16} />, color: 'text-purple-400', label: 'الأجهزة النشطة', value: totalDevices },
            { icon: <Star size={16} />, color: 'text-orange-400', label: 'المعاملات', value: transactions.length },
          ].map((s, i) => (
            <div key={i} className="glass-card rounded-2xl p-3.5">
              <div className={`${s.color} mb-1`}>{s.icon}</div>
              <p className="text-gray-600 text-[10px]">{s.label}</p>
              <p className="text-white text-lg font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex glass-card rounded-xl p-1 mb-5">
          {[
            { id: 'transactions' as const, label: 'المعاملات', icon: CreditCard },
            { id: 'users' as const, label: 'المستخدمين', icon: Users },
            { id: 'chat' as const, label: 'الرسائل', icon: MessageCircle },
          ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${tab === item.id ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
              <item.icon size={14} /> {item.label}
            </button>
          ))}
        </div>

        {tab === 'transactions' && (
          <div className="space-y-4 animate-slide-up">
            {pendingTxs.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-yellow-400 mb-3 flex items-center gap-2"><Bell size={16} /> معاملات معلقة ({pendingTxs.length})</h3>
                <div className="space-y-2">
                  {pendingTxs.map(tx => {
                    const txUser = users.find(u => u.id === tx.userId);
                    return (
                      <div key={tx.id} className="glass-card rounded-xl p-4 border border-yellow-500/10 animate-slide-up">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tx.type === 'deposit' ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'}`}>
                              {tx.type === 'deposit' ? <Download size={16} /> : <Upload size={16} />}
                            </div>
                            <div>
                              <p className="text-white text-xs font-medium">{txUser?.username || '?'}</p>
                              <p className="text-gray-600 text-[10px]">{tx.type === 'deposit' ? 'إيداع' : 'سحب'} • {formatDate(tx.date)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold text-sm">${tx.amount.toFixed(2)}</span>
                            {tx.type === 'withdraw' && <span className="text-gray-600 text-[10px]">(رسوم: ${(tx.amount * 0.10).toFixed(2)})</span>}
                            <button onClick={() => handleApprove(tx.id)} className="p-1.5 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-all"><CheckCircle size={16} /></button>
                            <button onClick={() => handleReject(tx.id)} className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all"><XCircle size={16} /></button>
                          </div>
                        </div>
                        {tx.type === 'withdraw' && tx.walletAddress && (
                          <div className="mt-2 bg-gray-800/20 rounded-lg px-3 py-2 flex items-center gap-2">
                            <Wallet size={12} className="text-purple-400 shrink-0" />
                            <span className="text-gray-500 text-[10px] shrink-0">المحفظة:</span>
                            <span className="text-purple-300 text-[10px] font-mono break-all" dir="ltr">{tx.walletAddress}</span>
                            <span className="text-purple-600 text-[10px] shrink-0">(ERC20)</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="flex-1 bg-gray-800/20 border border-gray-700/20 rounded-xl px-4 py-2 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-blue-500/30"
                placeholder="بحث بالاسم أو البريد..." />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
                className="bg-gray-800/30 border border-gray-700/20 rounded-xl px-3 py-2 text-white text-xs focus:outline-none cursor-pointer">
                <option value="all">الكل</option>
                <option value="pending">معلقة</option>
                <option value="approved">مؤكدة</option>
                <option value="rejected">مرفوضة</option>
              </select>
            </div>

            <div className="glass-card rounded-2xl overflow-hidden">
              {filteredTxs.slice(0, 25).map((tx, i) => {
                const txUser = users.find(u => u.id === tx.userId);
                return (
                  <div key={tx.id} className={`p-3 flex items-center justify-between ${i < 24 ? 'border-b border-gray-800/20' : ''}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${tx.type === 'deposit' ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'}`}>
                        {tx.type === 'deposit' ? <Download size={12} /> : <Upload size={12} />}
                      </div>
                      <div>
                        <p className="text-white text-[11px]">{txUser?.username}</p>
                        <p className="text-gray-700 text-[9px]">{formatDate(tx.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-xs">${tx.amount.toFixed(2)}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${tx.status === 'approved' ? 'bg-green-500/10 text-green-400' : tx.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                        {tx.status === 'approved' ? 'مؤكد' : tx.status === 'rejected' ? 'مرفوض' : 'معلق'}
                      </span>
                    </div>
                  </div>
                );
              })}
              {filteredTxs.length === 0 && <p className="text-gray-600 text-center py-8 text-xs">لا توجد نتائج</p>}
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="space-y-3 animate-slide-up">
            {users.filter(u => !u.isAdmin).map(u => (
              <div key={u.id} className="glass-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center text-blue-400 font-bold text-sm border border-gray-700/20">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{u.username}</p>
                      <p className="text-gray-600 text-[10px]">{u.email}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-green-400 font-bold text-sm">${u.balance.toFixed(2)}</p>
                    <p className="text-gray-600 text-[10px]">{u.devices.length} أجهزة</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  <div className="bg-gray-800/20 rounded-lg p-2 text-center">
                    <p className="text-gray-600 text-[8px]">إيداعات</p>
                    <p className="text-blue-400 text-xs font-bold">${u.totalDeposits.toFixed(0)}</p>
                  </div>
                  <div className="bg-gray-800/20 rounded-lg p-2 text-center">
                    <p className="text-gray-600 text-[8px]">سحوبات</p>
                    <p className="text-orange-400 text-xs font-bold">${u.totalWithdrawals.toFixed(0)}</p>
                  </div>
                  <div className="bg-gray-800/20 rounded-lg p-2 text-center">
                    <p className="text-gray-600 text-[8px]">إحالات</p>
                    <p className="text-purple-400 text-xs font-bold">{store.getReferralCount(u.id)}</p>
                  </div>
                  <div className="bg-gray-800/20 rounded-lg p-2 text-center">
                    <p className="text-gray-600 text-[8px]">آخر دخول</p>
                    <p className="text-gray-400 text-[9px]">{new Date(u.lastLogin).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
              </div>
            ))}
            {users.filter(u => !u.isAdmin).length === 0 && <p className="text-gray-600 text-center py-12 text-sm">لا يوجد مستخدمين بعد</p>}
          </div>
        )}

        {tab === 'chat' && <AdminChat onClose={() => setTab('transactions')} />}
      </div>
    </div>
  );
}
