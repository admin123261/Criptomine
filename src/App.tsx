import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Cpu, DollarSign, Download, Upload, Gift, MessageCircle, LogOut, Shield, Users,
  CheckCircle, XCircle, Clock, Zap, TrendingUp, ArrowUpCircle,
  Send, X, Eye, EyeOff, Play, Home, ShoppingCart,
  HardDrive, Bell, RefreshCw, CreditCard, Copy, Wallet, Check,
  User as UserIcon, Lock, Share2, ChevronLeft, Award, Star, AlertTriangle
} from 'lucide-react';
import { User, UserDevice, DEVICE_TEMPLATES, GIFT_DEVICE, DeviceTemplate } from './types';
import * as store from './store';
import { loginViaSupabase } from './supabaseSync';

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
  const [language, setLanguage] = useState('ar');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);

    await new Promise(resolve => setTimeout(resolve, 800));

    if (isRegister) {
      if (!username || !email || !password) { setError('جميع الحقول مطلوبة'); setLoading(false); return; }
      if (password.length < 6) { setError('كلمة المرور 6 أحرف على الأقل'); setLoading(false); return; }
      const res = store.register(username, email, password, referralCode || undefined);
      if (res.success && res.user) onLogin(res.user);
      else setError(res.error || 'خطأ');
    } else {
      // محاولة تسجيل الدخول محلياً أولاً
      let res = store.login(email, password);
      if (!res.success) {
        // Fallback: تسجيل الدخول مباشرة من Supabase
        const sbUser = await loginViaSupabase(email, password);
        if (sbUser) {
          // البيانات محفوظة في localStorage بواسطة loginViaSupabase
          // نعيد محاولة الدخول المحلي
          res = store.login(email, password);
          if (!res.success) {
            // إذا فشل مرة أخرى، نستخدم بيانات Supabase مباشرة
            const currentUser = store.getCurrentUser();
            if (currentUser) {
              res = { success: true, user: currentUser };
            }
          }
        }
      }
      if (res.success && res.user) onLogin(res.user);
      else setError(res.error || 'بيانات الدخول غير صحيحة. تأكد من البريد وكلمة المرور.');
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
          <p className="text-gray-500 mt-2 text-sm">منصة التعدين الذكي بالذكاء الاصطناعي</p>
        </div>

        <div className="glass-card rounded-3xl p-8 shadow-2xl">
          <div className="flex bg-gray-800/30 rounded-xl p-1 mb-6">
            <button onClick={() => { setIsRegister(false); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${!isRegister ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
              تسجيل الدخول
            </button>
            <button onClick={() => { setIsRegister(true); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${isRegister ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
              حساب جديد
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
                    placeholder="أدخل اسم المستخدم" />
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
            {isRegister && (
              <div className="animate-slide-up">
                <label className="block text-xs text-gray-500 mb-1.5">اللغة المفضلة</label>
                <div className="relative">
                  <span className="absolute right-3 top-2.5 text-base">🌐</span>
                  <select value={language} onChange={e => setLanguage(e.target.value)}
                    className="w-full bg-gray-800/30 border border-gray-700/50 rounded-xl py-2.5 pr-10 pl-4 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all appearance-none cursor-pointer">
                    <option value="ar" className="bg-gray-900 text-white">🇸🇦 العربية</option>
                    <option value="en" className="bg-gray-900 text-white">🇬🇧 English</option>
                    <option value="fr" className="bg-gray-900 text-white">🇫🇷 Français</option>
                    <option value="es" className="bg-gray-900 text-white">🇪🇸 Español</option>
                    <option value="tr" className="bg-gray-900 text-white">🇹🇷 Türkçe</option>
                    <option value="de" className="bg-gray-900 text-white">🇩🇪 Deutsch</option>
                    <option value="zh" className="bg-gray-900 text-white">🇨🇳 中文</option>
                    <option value="ru" className="bg-gray-900 text-white">🇷🇺 Русский</option>
                  </select>
                  <ChevronLeft size={14} className="absolute left-3 top-3 text-gray-600 rotate-[-90deg] pointer-events-none" />
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
              {isRegister ? 'إنشاء حساب' : 'دخول'}
            </button>
          </form>

          {isRegister && (
            <div className="mt-4 bg-gradient-to-r from-yellow-500/5 to-amber-500/5 border border-yellow-500/20 rounded-xl p-3 flex items-center gap-3 animate-slide-up">
              <Gift size={22} className="text-yellow-400 shrink-0" />
              <p className="text-xs text-yellow-300/80">سجل الآن واحصل على جهاز تعدين مجاني هدية! أرباح تصل إلى $5</p>
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
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-3xl animate-float shadow-lg shadow-yellow-500/30">
            🎁
          </div>
        </div>
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white mb-2">مرحباً بك! 🎉</h2>
          <p className="text-gray-400 text-sm mb-4">تهانينا على انضمامك لمنصة CryptoMine Pro</p>

          {/* Gift Details */}
          <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-2xl p-5 mb-4">
            <Gift size={36} className="text-yellow-400 mx-auto mb-3" />
            <p className="text-yellow-300 font-bold text-lg mb-1">هدية ترحيبية!</p>
            <p className="text-gray-300 text-sm">حصلت على جهاز تعدين مجاني</p>
            <p className="text-gray-300 text-sm">يعمل لمدة <span className="text-yellow-400 font-bold">24 ساعة</span></p>
            <p className="text-green-400 font-bold text-2xl mt-3 mining-profit-counter">$5.00</p>
            <p className="text-gray-500 text-xs mt-1">سيتم إضافة الربح تلقائياً</p>
          </div>

          {/* Notification Steps */}
          <div className="space-y-2 mb-5">
            {step >= 1 && (
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2 animate-slide-up">
                <CheckCircle size={16} className="text-green-400 shrink-0" />
                <p className="text-green-300 text-xs text-right">✅ تم إنشاء حسابك بنجاح</p>
              </div>
            )}
            {step >= 2 && (
              <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2 animate-slide-up">
                <Gift size={16} className="text-yellow-400 shrink-0" />
                <p className="text-yellow-300 text-xs text-right">🎁 تم استلام جهاز الهدية المجاني</p>
              </div>
            )}
            {step >= 3 && (
              <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2 animate-slide-up">
                <Zap size={16} className="text-blue-400 shrink-0" />
                <p className="text-blue-300 text-xs text-right">⛏️ جهاز الهدية يعمل الآن! تابع أرباحك</p>
              </div>
            )}
          </div>

          <button onClick={onClose}
            className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-bold py-3 rounded-xl transition-all shadow-lg shadow-yellow-500/20">
            ابدأ التعدين الآن! ⚡
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
                <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{n.message}</p>
                <p className="text-gray-600 text-[10px] mt-1.5">{formatDate(n.date)}</p>
              </div>
              {!n.read && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shrink-0 mt-1.5 animate-pulse" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== Device Store Card =====
function DeviceStoreCard({ device, onBuy, owned }: { device: DeviceTemplate; onBuy: () => void; owned: boolean }) {
  return (
    <div className={`glass-card rounded-2xl p-5 hover:border-gray-600/30 transition-all duration-300 hover:scale-[1.02] animate-slide-up group relative overflow-hidden`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${device.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-3">
          <span className="text-4xl group-hover:animate-float">{device.icon}</span>
          {owned && <span className="bg-green-500/15 text-green-400 text-[10px] px-2.5 py-1 rounded-full border border-green-500/20 flex items-center gap-1"><Check size={10} /> مملوك</span>}
        </div>
        <h3 className="text-lg font-bold text-white mb-0.5">{device.nameAr}</h3>
        <p className="text-gray-600 text-xs mb-3">{device.name}</p>
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">قوة التعدين</span>
            <span className="text-white font-medium">{device.hashRate}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">ربح 3 أيام (2%)</span>
            <span className="text-green-400 font-medium">${(device.price * 0.02 * 3).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">ربح 7 أيام (2.5%)</span>
            <span className="text-green-400 font-medium">${(device.price * 0.025 * 7).toFixed(2)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-gray-800/30">
          <span className={`text-2xl font-bold bg-gradient-to-r ${device.color} bg-clip-text text-transparent`}>${device.price}</span>
          <button onClick={onBuy}
            className={`bg-gradient-to-r ${device.color} text-white px-5 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-all shadow-lg flex items-center gap-1.5`}>
            <ShoppingCart size={14} /> شراء
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== My Device Card =====
function MyDeviceCard({ ud, onStart, onCollect, onUpgrade }: {
  ud: UserDevice; onStart: (d: number) => void; onCollect: () => void; onUpgrade: () => void;
}) {
  const template = getDeviceTemplate(ud.deviceId);
  const [info, setInfo] = useState(calcProfit(ud));
  const [showDuration, setShowDuration] = useState(false);

  useEffect(() => {
    if (!ud.isRunning) return;
    const interval = setInterval(() => setInfo(calcProfit(ud)), 100);
    return () => clearInterval(interval);
  }, [ud]);

  return (
    <div className={`glass-card rounded-2xl p-5 transition-all animate-slide-up relative overflow-hidden ${ud.isRunning && !info.finished ? 'animate-border-glow mining-active-card' : ''}`}>
      {/* Mining active visual effects */}
      {ud.isRunning && !info.finished && <div className="absolute inset-0 animate-shimmer pointer-events-none" />}
      {ud.isRunning && !info.finished && (
        <>
          {/* Multiple particle groups */}
          <div className="absolute top-4 left-4 pointer-events-none">
            <div className="w-2 h-2 bg-green-400 rounded-full particle-1" />
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full particle-2" />
            <div className="w-1 h-1 bg-purple-400 rounded-full particle-3" />
          </div>
          <div className="absolute top-8 right-8 pointer-events-none">
            <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full particle-4" />
            <div className="w-1 h-1 bg-cyan-400 rounded-full particle-5" />
          </div>
          {/* Scanning line effect */}
          <div className="absolute inset-0 pointer-events-none mining-scan-line" />
          {/* Corner glow */}
          <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${template.color} opacity-10 blur-xl animate-pulse pointer-events-none`} />
          <div className={`absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-gradient-to-br ${template.color} opacity-10 blur-xl animate-pulse pointer-events-none`} style={{ animationDelay: '1s' }} />
        </>
      )}
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${template.color} bg-opacity-20 flex items-center justify-center relative ${ud.isRunning && !info.finished ? 'mining-device-icon' : ''}`}>
              <span className={`text-3xl ${ud.isRunning && !info.finished ? 'animate-float' : ''}`}>{template.icon}</span>
              {ud.isRunning && !info.finished && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/50">
                  <Zap size={8} className="text-white" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{template.nameAr}</h3>
              <p className="text-gray-600 text-xs">{template.hashRate}</p>
              {!ud.isGift && <p className={`text-xs font-medium bg-gradient-to-r ${template.color} bg-clip-text text-transparent`}>${getDeviceTemplate(ud.deviceId).price}</p>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {ud.isGift && <span className="bg-yellow-500/10 text-yellow-400 text-[10px] px-2 py-0.5 rounded-full border border-yellow-500/20 flex items-center gap-1"><Gift size={10} /> هدية</span>}
            {ud.isRunning && !info.finished && (
              <span className="bg-green-500/10 text-green-400 text-[10px] px-2 py-0.5 rounded-full border border-green-500/20 flex items-center gap-1 animate-pulse">
                <Zap size={10} /> يعمل
              </span>
            )}
            {info.finished && (
              <span className="bg-yellow-500/10 text-yellow-400 text-[10px] px-2 py-0.5 rounded-full border border-yellow-500/20 flex items-center gap-1">
                <CheckCircle size={10} /> انتهى
              </span>
            )}
          </div>
        </div>

        {ud.isRunning && (
          <div className="space-y-3 mt-4">
            {/* Timer & Progress */}
            <div className="bg-black/20 rounded-xl p-3 border border-gray-800/30">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-500">الوقت المتبقي</span>
                <span className="text-white font-mono font-bold text-base">
                  {info.finished ? '✅ انتهى' : formatTime(info.remaining)}
                </span>
              </div>
              <div className="w-full bg-gray-800/50 rounded-full h-2.5 overflow-hidden">
                <div className={`h-full rounded-full bg-gradient-to-r ${template.color} transition-all duration-300 shadow-sm relative overflow-hidden`}
                  style={{ width: `${info.progress * 100}%`, boxShadow: `0 0 10px rgba(59, 130, 246, 0.3)` }}>
                  {!info.finished && <div className="absolute inset-0 animate-shimmer" />}
                </div>
              </div>
              <p className="text-gray-600 text-[10px] mt-1 text-center">{(info.progress * 100).toFixed(2)}%</p>
            </div>

            {/* Live Profit Display */}
            <div className="bg-black/20 rounded-xl p-3 border border-gray-800/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${info.finished ? 'bg-yellow-400' : 'bg-green-400 animate-pulse'}`} />
                  <span className="text-gray-500 text-[10px]">الربح المباشر</span>
                </div>
                {!info.finished && (
                  <span className="text-green-400/60 text-[9px] font-mono mining-live-text">● LIVE</span>
                )}
              </div>
              <p className="text-green-400 font-bold text-2xl text-center font-mono mining-profit-counter">
                ${info.current.toFixed(6)}
              </p>
            </div>

            {/* Per-second earnings grid */}
            {!info.finished && (
              <div className="grid grid-cols-3 gap-2 animate-slide-up">
                <div className="bg-black/20 rounded-xl p-2 text-center border border-green-500/10">
                  <p className="text-gray-600 text-[8px] mb-0.5">💰 بالثانية</p>
                  <p className="text-green-400 font-bold text-[11px] font-mono">${info.perSecond.toFixed(6)}</p>
                </div>
                <div className="bg-black/20 rounded-xl p-2 text-center border border-blue-500/10">
                  <p className="text-gray-600 text-[8px] mb-0.5">⏱️ بالدقيقة</p>
                  <p className="text-blue-400 font-bold text-[11px] font-mono">${info.perMinute.toFixed(5)}</p>
                </div>
                <div className="bg-black/20 rounded-xl p-2 text-center border border-purple-500/10">
                  <p className="text-gray-600 text-[8px] mb-0.5">🕐 بالساعة</p>
                  <p className="text-purple-400 font-bold text-[11px] font-mono">${info.perHour.toFixed(4)}</p>
                </div>
              </div>
            )}

            {/* Total profit */}
            <div className="bg-black/20 rounded-xl p-3 text-center border border-gray-800/30">
              <p className="text-gray-600 text-[10px] mb-0.5">الربح الإجمالي عند الانتهاء</p>
              <p className="text-blue-400 font-bold text-lg">${info.total.toFixed(2)}</p>
            </div>

            {info.finished && (
              <button onClick={onCollect}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 animate-pulse-glow">
                <Download size={18} /> جمع الأرباح ${info.total.toFixed(2)}
              </button>
            )}
          </div>
        )}

        {!ud.isRunning && !ud.isGift && (
          <div className="mt-4 space-y-3">
            {!showDuration ? (
              <div className="flex gap-2">
                <button onClick={() => setShowDuration(true)}
                  className={`flex-1 bg-gradient-to-r ${template.color} text-white font-medium py-3 rounded-xl hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2`}>
                  <Play size={16} /> تشغيل
                </button>
                <button onClick={onUpgrade}
                  className="flex-1 bg-gray-800/30 hover:bg-gray-800/50 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 border border-gray-700/30">
                  <ArrowUpCircle size={16} /> ترقية
                </button>
              </div>
            ) : (
              <div className="space-y-2 animate-slide-up">
                <p className="text-gray-500 text-xs text-center">اختر مدة التعدين</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { onStart(3); setShowDuration(false); }}
                    className="bg-blue-500/5 border border-blue-500/20 hover:border-blue-500/50 text-white p-3 rounded-xl transition-all text-center group">
                    <p className="font-bold text-sm">3 أيام</p>
                    <p className="text-blue-400 text-xs">ربح 2%/يوم</p>
                    <p className="text-green-400 font-bold mt-1">${(template.price * 0.02 * 3).toFixed(2)}</p>
                  </button>
                  <button onClick={() => { onStart(7); setShowDuration(false); }}
                    className="bg-purple-500/5 border border-purple-500/20 hover:border-purple-500/50 text-white p-3 rounded-xl transition-all text-center group">
                    <p className="font-bold text-sm">7 أيام</p>
                    <p className="text-purple-400 text-xs">ربح 2.5%/يوم</p>
                    <p className="text-green-400 font-bold mt-1">${(template.price * 0.025 * 7).toFixed(2)}</p>
                  </button>
                </div>
                <button onClick={() => setShowDuration(false)} className="w-full text-gray-600 text-xs py-1 hover:text-gray-400">إلغاء</button>
              </div>
            )}
            {ud.totalEarned > 0 && (
              <div className="text-center text-gray-600 text-[10px] flex items-center justify-center gap-1">
                <TrendingUp size={10} /> إجمالي الأرباح السابقة: ${ud.totalEarned.toFixed(2)}
              </div>
            )}
          </div>
        )}
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
    const interval = setInterval(() => {
      setMessages(store.getUserMessages(user.id));
      store.markMessagesRead(user.isAdmin ? '' : 'admin001', user.id);
    }, 1000);
    return () => clearInterval(interval);
  }, [user.id, user.isAdmin]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  const handleSend = () => {
    if (!msg.trim()) return;
    store.sendMessage(user.id, 'admin001', msg.trim());
    setMsg('');
    setMessages(store.getUserMessages(user.id));
  };
  return (
    <div className="fixed bottom-20 left-4 z-50 w-80 sm:w-96 animate-scale-in" style={{ direction: 'rtl' }}>
      <div className="glass-card-solid rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} />
            <span className="font-bold text-sm">الدردشة مع الدعم</span>
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-lg transition-all"><X size={16} /></button>
        </div>
        <div className="h-64 overflow-y-auto p-3 space-y-2 hide-scrollbar" style={{ background: 'rgba(5, 10, 20, 0.95)' }}>
          {messages.length === 0 && <div className="text-center text-gray-500 text-xs mt-8">ابدأ المحادثة مع فريق الدعم 💬</div>}
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.from === user.id ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${m.from === user.id ? 'bg-blue-600/25 text-blue-50 rounded-br-sm border border-blue-500/15' : 'bg-gray-700/40 text-gray-100 rounded-bl-sm border border-gray-600/15'}`}>
                {m.message}
                <div className="text-[9px] text-gray-500 mt-1">{new Date(m.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="p-3 border-t border-gray-700/40 flex gap-2" style={{ background: 'rgba(10, 15, 30, 0.95)' }}>
          <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-gray-800/50 border border-gray-600/30 rounded-xl px-3 py-2.5 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
            placeholder="اكتب رسالتك..." />
          <button onClick={handleSend} className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-2.5 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-blue-500/20">
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Admin Chat =====
function AdminChat({ onClose }: { onClose: () => void }) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [allMsgs, setAllMsgs] = useState(store.getAdminMessages());
  const [users, setUsers] = useState(store.getUsers());
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const i = setInterval(() => { setAllMsgs(store.getAdminMessages()); setUsers(store.getUsers()); }, 1000); return () => clearInterval(i); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [allMsgs, selectedUser]);
  
  // المستخدمين الذين لديهم محادثات
  const chatUserIds = [...new Set(allMsgs.filter(m => m.from !== 'admin001' || m.to !== 'admin001').map(m => m.from === 'admin001' ? m.to : m.from))];
  
  // كل المستخدمين غير الأدمين (للبحث وبدء محادثة جديدة)
  const allNonAdminUsers = users.filter(u => !u.isAdmin);
  const filteredSearchUsers = allNonAdminUsers.filter(u => 
    !chatUserIds.includes(u.id) && 
    (u.username.toLowerCase().includes(searchUser.toLowerCase()) || u.email.toLowerCase().includes(searchUser.toLowerCase()))
  );
  
  const filteredMsgs = selectedUser ? allMsgs.filter(m => m.from === selectedUser || m.to === selectedUser) : [];
  const handleSend = () => {
    if (!msg.trim() || !selectedUser) return;
    store.sendMessage('admin001', selectedUser, msg.trim());
    setMsg(''); setAllMsgs(store.getAdminMessages());
  };

  const selectUser = (uid: string) => {
    setSelectedUser(uid);
    setShowAllUsers(false);
    setSearchUser('');
    store.markMessagesRead(uid, 'admin001');
  };

  return (
    <div className="glass-card-solid rounded-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex items-center justify-between">
        <span className="font-bold flex items-center gap-2 text-sm"><MessageCircle size={18} /> رسائل المستخدمين</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAllUsers(!showAllUsers)} 
            className={`p-1.5 rounded-lg transition-all text-xs flex items-center gap-1 ${showAllUsers ? 'bg-white/20 text-white' : 'hover:bg-white/20 text-white/70'}`}>
            <Users size={14} /> رسالة جديدة
          </button>
          <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-lg"><X size={16} /></button>
        </div>
      </div>
      <div className="flex h-96">
        <div className="w-1/3 border-l border-gray-700/40 overflow-y-auto hide-scrollbar flex flex-col" style={{ background: 'rgba(8, 12, 25, 0.95)' }}>
          {/* زر إرسال رسالة لمستخدم جديد */}
          {showAllUsers && (
            <div className="p-2 border-b border-gray-700/30 animate-slide-down">
              <input value={searchUser} onChange={e => setSearchUser(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-600/30 rounded-lg px-2 py-1.5 text-white text-[10px] placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                placeholder="🔍 ابحث عن مستخدم..." />
              <div className="mt-1 max-h-32 overflow-y-auto hide-scrollbar">
                {filteredSearchUsers.length === 0 && (
                  <p className="text-gray-600 text-[9px] text-center py-2">لا يوجد مستخدمين جدد</p>
                )}
                {filteredSearchUsers.map(u => (
                  <button key={u.id} onClick={() => selectUser(u.id)}
                    className="w-full p-2 text-right hover:bg-blue-500/10 transition-all rounded-lg flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center text-green-400 text-[10px] font-bold shrink-0">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-[10px] font-medium truncate">{u.username}</p>
                      <p className="text-gray-600 text-[8px] truncate">{u.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* قائمة المحادثات الموجودة */}
          {chatUserIds.length === 0 && !showAllUsers && (
            <div className="text-center py-6 px-2">
              <MessageCircle size={20} className="text-gray-700 mx-auto mb-2" />
              <p className="text-gray-600 text-[10px] mb-2">لا توجد محادثات بعد</p>
              <button onClick={() => setShowAllUsers(true)} className="text-blue-400 text-[10px] hover:text-blue-300 transition-all">
                + إرسال رسالة جديدة
              </button>
            </div>
          )}
          {chatUserIds.map(uid => {
            const u = users.find(u => u.id === uid);
            const unread = allMsgs.filter(m => m.from === uid && m.to === 'admin001' && !m.read).length;
            const lastMsg = allMsgs.filter(m => m.from === uid || m.to === uid).sort((a, b) => b.date - a.date)[0];
            return (
              <button key={uid} onClick={() => selectUser(uid)}
                className={`w-full p-3 text-right hover:bg-gray-700/30 transition-all border-b border-gray-700/30 ${selectedUser === uid ? 'bg-blue-900/30 border-r-2 border-r-blue-500' : ''}`}>
                <div className="flex items-center justify-between">
                  <p className="text-white text-xs font-medium">{u?.username || uid}</p>
                  {unread > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unread}</span>}
                </div>
                {lastMsg && <p className="text-gray-600 text-[9px] mt-0.5 truncate">{lastMsg.message.substring(0, 30)}</p>}
              </button>
            );
          })}
          
          {/* كل المستخدمين بدون محادثات (للبدء معهم) */}
          {!showAllUsers && allNonAdminUsers.filter(u => !chatUserIds.includes(u.id)).length > 0 && (
            <>
              <div className="px-3 py-2 border-b border-gray-700/30">
                <p className="text-gray-600 text-[9px]">مستخدمين آخرين</p>
              </div>
              {allNonAdminUsers.filter(u => !chatUserIds.includes(u.id)).map(u => (
                <button key={u.id} onClick={() => selectUser(u.id)}
                  className={`w-full p-2.5 text-right hover:bg-gray-700/30 transition-all border-b border-gray-700/30 opacity-60 hover:opacity-100 ${selectedUser === u.id ? 'bg-blue-900/30 border-r-2 border-r-blue-500 opacity-100' : ''}`}>
                  <p className="text-white text-[11px]">{u.username}</p>
                  <p className="text-gray-700 text-[8px]">{u.email}</p>
                </button>
              ))}
            </>
          )}
        </div>
        <div className="flex-1 flex flex-col" style={{ background: 'rgba(5, 10, 20, 0.95)' }}>
          {/* Header المحادثة */}
          {selectedUser && (
            <div className="p-3 border-b border-gray-700/40 flex items-center gap-2" style={{ background: 'rgba(10, 15, 30, 0.95)' }}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                {users.find(u => u.id === selectedUser)?.username?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-white text-xs font-medium">{users.find(u => u.id === selectedUser)?.username || 'مستخدم'}</p>
                <p className="text-gray-600 text-[9px]">{users.find(u => u.id === selectedUser)?.email}</p>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 hide-scrollbar">
            {!selectedUser && (
              <div className="text-center mt-12">
                <MessageCircle size={32} className="text-gray-800 mx-auto mb-2" />
                <p className="text-gray-600 text-xs">اختر مستخدم لبدء المحادثة</p>
                <p className="text-gray-700 text-[10px] mt-1">أو اضغط "رسالة جديدة" لمراسلة أي مستخدم</p>
              </div>
            )}
            {selectedUser && filteredMsgs.length === 0 && (
              <div className="text-center mt-8">
                <Send size={24} className="text-gray-800 mx-auto mb-2" />
                <p className="text-gray-600 text-[10px]">ابدأ المحادثة بإرسال رسالة</p>
              </div>
            )}
            {filteredMsgs.map(m => (
              <div key={m.id} className={`flex ${m.from === 'admin001' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${m.from === 'admin001' ? 'bg-blue-600/25 text-blue-50 rounded-br-sm border border-blue-500/15' : 'bg-gray-700/40 text-gray-100 rounded-bl-sm border border-gray-600/15'}`}>
                  {m.message}
                  <div className="text-[9px] text-gray-500 mt-1">{new Date(m.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          {selectedUser && (
            <div className="p-3 border-t border-gray-700/40 flex gap-2" style={{ background: 'rgba(10, 15, 30, 0.95)' }}>
              <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
                className="flex-1 bg-gray-800/50 border border-gray-600/30 rounded-xl px-3 py-2.5 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-blue-500/50" placeholder="اكتب رسالتك..." />
              <button onClick={handleSend} className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-2.5 rounded-xl shadow-lg shadow-blue-500/20"><Send size={14} /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Upgrade Modal =====
function UpgradeModal({ currentDeviceId, onUpgrade, onClose, balance }: {
  currentDeviceId: number; onUpgrade: (n: number) => void; onClose: () => void; balance: number;
}) {
  const current = getDeviceTemplate(currentDeviceId);
  const upgrades = DEVICE_TEMPLATES.filter(d => d.price > current.price);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative glass-card-solid rounded-3xl p-6 max-w-lg w-full animate-scale-in max-h-[80vh] overflow-y-auto hide-scrollbar" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><ArrowUpCircle size={20} className="text-blue-400" /> ترقية الجهاز</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="flex items-center justify-between text-xs mb-4 bg-gray-800/20 rounded-xl p-3">
          <span className="text-gray-400">الجهاز الحالي: <span className="text-white font-bold">{current.nameAr}</span></span>
          <span className="text-gray-400">رصيدك: <span className="text-green-400 font-bold">${balance.toFixed(2)}</span></span>
        </div>
        {upgrades.length === 0 && <p className="text-gray-600 text-center py-8 text-sm">لديك أقوى جهاز بالفعل! 👑</p>}
        <div className="space-y-3">
          {upgrades.map(d => {
            const diff = d.price - current.price;
            const canAfford = balance >= diff;
            return (
              <div key={d.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{d.icon}</span>
                  <div>
                    <p className="text-white font-bold text-sm">{d.nameAr}</p>
                    <p className="text-gray-500 text-xs">{d.hashRate}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-gray-500 text-[10px]">فرق السعر</p>
                  <p className="text-white font-bold text-sm">${diff}</p>
                  <button onClick={() => canAfford && onUpgrade(d.id)} disabled={!canAfford}
                    className={`mt-1 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${canAfford ? `bg-gradient-to-r ${d.color} text-white hover:opacity-90` : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}>
                    {canAfford ? 'ترقية' : 'رصيد غير كافي'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===== Profile Page =====
function ProfilePage({ user, onBack, onNotify }: { user: User; onBack: () => void; onNotify: (m: string) => void }) {
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [copied, setCopied] = useState(false);
  const referralCount = store.getReferralCount(user.id);

  const copyCode = () => {
    navigator.clipboard.writeText(user.referralCode).catch(() => {
      const el = document.createElement('textarea'); el.value = user.referralCode;
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    });
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleChangePass = () => {
    if (!oldPass || !newPass) { onNotify('يرجى ملء جميع الحقول'); return; }
    const res = store.changePassword(user.id, oldPass, newPass);
    if (res.success) { onNotify('تم تغيير كلمة المرور بنجاح ✅'); setOldPass(''); setNewPass(''); }
    else onNotify(res.error || 'خطأ');
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-white text-sm transition-all">
        <ChevronLeft size={16} /> رجوع
      </button>

      {/* Profile Info */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user.username}</h2>
            <p className="text-gray-500 text-sm">{user.email}</p>
            <p className="text-gray-700 text-xs mt-0.5">عضو منذ {formatDate(user.createdAt)}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-800/20 rounded-xl p-3 text-center">
            <p className="text-gray-600 text-[10px]">الرصيد</p>
            <p className="text-green-400 font-bold">${user.balance.toFixed(2)}</p>
          </div>
          <div className="bg-gray-800/20 rounded-xl p-3 text-center">
            <p className="text-gray-600 text-[10px]">إجمالي الإيداعات</p>
            <p className="text-blue-400 font-bold">${user.totalDeposits.toFixed(0)}</p>
          </div>
          <div className="bg-gray-800/20 rounded-xl p-3 text-center">
            <p className="text-gray-600 text-[10px]">إجمالي السحوبات</p>
            <p className="text-orange-400 font-bold">${user.totalWithdrawals.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* Referral */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-bold text-white mb-3 flex items-center gap-2"><Share2 size={18} className="text-purple-400" /> نظام الإحالة</h3>
        <p className="text-gray-500 text-xs mb-3">شارك كود الإحالة الخاص بك واحصل على <span className="text-green-400 font-bold">3%</span> عمولة من أرباح تعدين أصدقائك!</p>
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-xl p-3 flex items-center justify-between mb-3">
          <span className="text-white font-mono font-bold text-lg tracking-wider" dir="ltr">{user.referralCode}</span>
          <button onClick={copyCode} className={`p-2 rounded-lg transition-all ${copied ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25'}`}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
        {copied && <p className="text-green-400 text-xs text-center mb-3 animate-slide-up">✅ تم نسخ الكود!</p>}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 text-center">
            <Users size={20} className="text-purple-400 mx-auto mb-1" />
            <p className="text-gray-500 text-[10px]">عدد الإحالات</p>
            <p className="text-white font-bold text-lg">{referralCount}</p>
          </div>
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 text-center">
            <DollarSign size={20} className="text-green-400 mx-auto mb-1" />
            <p className="text-gray-500 text-[10px]">أرباح الإحالات</p>
            <p className="text-green-400 font-bold text-lg">${user.referralEarnings.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-bold text-white mb-3 flex items-center gap-2"><Lock size={18} className="text-orange-400" /> تغيير كلمة المرور</h3>
        <div className="space-y-3">
          <input type="password" value={oldPass} onChange={e => setOldPass(e.target.value)}
            className="w-full bg-gray-800/30 border border-gray-700/30 rounded-xl py-2.5 px-4 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
            placeholder="كلمة المرور الحالية" dir="ltr" />
          <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
            className="w-full bg-gray-800/30 border border-gray-700/30 rounded-xl py-2.5 px-4 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
            placeholder="كلمة المرور الجديدة (6 أحرف+)" dir="ltr" />
          <button onClick={handleChangePass}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium py-2.5 rounded-xl hover:opacity-90 transition-all text-sm">
            تغيير كلمة المرور
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Transaction List =====
function TransactionList({ userId, typeFilter }: { userId: string; typeFilter?: 'deposit' | 'withdraw' }) {
  const txs = store.getTransactions().filter(t => t.userId === userId && (!typeFilter || t.type === typeFilter)).sort((a, b) => b.date - a.date).slice(0, 15);
  if (txs.length === 0) return (
    <div className="glass-card rounded-2xl p-8 text-center">
      <Clock size={32} className="text-gray-800 mx-auto mb-2" />
      <p className="text-gray-700 text-sm">لا توجد معاملات</p>
    </div>
  );
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {txs.map((tx, i) => (
        <div key={tx.id} className={`p-3.5 flex items-center justify-between ${i < txs.length - 1 ? 'border-b border-gray-800/20' : ''}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tx.type === 'deposit' ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'}`}>
              {tx.type === 'deposit' ? <Download size={16} /> : <Upload size={16} />}
            </div>
            <div>
              <p className="text-white text-xs font-medium">{tx.type === 'deposit' ? 'إيداع' : 'سحب'}</p>
              <p className="text-gray-700 text-[10px]">{formatDate(tx.date)}</p>
            </div>
          </div>
          <div className="text-left">
            <p className={`font-bold text-sm ${tx.type === 'deposit' ? 'text-green-400' : 'text-orange-400'}`}>
              {tx.type === 'deposit' ? '+' : '-'}${tx.amount.toFixed(2)}
            </p>
            <p className={`text-[10px] ${tx.status === 'approved' ? 'text-green-500' : tx.status === 'rejected' ? 'text-red-500' : 'text-yellow-500'}`}>
              {tx.status === 'approved' ? '✅ مؤكد' : tx.status === 'rejected' ? '❌ مرفوض' : '⏳ معلق'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== Mini Mining Card =====
function MiniMiningCard({ ud }: { ud: UserDevice }) {
  const template = getDeviceTemplate(ud.deviceId);
  const [info, setInfo] = useState(calcProfit(ud));
  useEffect(() => { const i = setInterval(() => setInfo(calcProfit(ud)), 100); return () => clearInterval(i); }, [ud]);
  return (
    <div className="glass-card rounded-xl p-3 flex items-center gap-3 relative overflow-hidden">
      {!info.finished && <div className="absolute inset-0 animate-shimmer pointer-events-none opacity-50" />}
      <div className={`relative w-10 h-10 rounded-lg bg-gradient-to-br ${template.color} bg-opacity-20 flex items-center justify-center`}>
        <span className="text-xl animate-float">{template.icon}</span>
        {!info.finished && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center"><Zap size={6} className="text-white" /></div>}
      </div>
      <div className="flex-1 min-w-0 relative z-10">
        <div className="flex items-center justify-between">
          <p className="text-white font-medium text-xs">{template.nameAr}</p>
          {!info.finished && <span className="text-green-400/70 text-[8px] font-mono">+${info.perSecond.toFixed(6)}/ث</span>}
        </div>
        <div className="w-full bg-gray-800/30 rounded-full h-1.5 mt-1.5 overflow-hidden">
          <div className={`h-full rounded-full bg-gradient-to-r ${template.color} transition-all duration-300 relative overflow-hidden`} style={{ width: `${info.progress * 100}%` }}>
            {!info.finished && <div className="absolute inset-0 animate-shimmer" />}
          </div>
        </div>
      </div>
      <div className="text-left shrink-0 relative z-10">
        <p className="text-green-400 font-bold text-xs font-mono">${info.current.toFixed(4)}</p>
        <p className="text-gray-600 text-[9px] font-mono">{info.finished ? '✅ انتهى' : formatTime(info.remaining)}</p>
      </div>
    </div>
  );
}

// ===== MAIN APP =====
type Page = 'dashboard' | 'store' | 'my-devices' | 'deposit' | 'withdraw' | 'admin' | 'profile';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>('dashboard');
  const [showWelcome, setShowWelcome] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [upgradeTarget, setUpgradeTarget] = useState<UserDevice | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [copied, setCopied] = useState(false);

  const refreshUser = useCallback(() => { const u = store.getCurrentUser(); if (u) setUser(u); }, []);

  useEffect(() => { const u = store.getCurrentUser(); if (u) setUser(u); }, []);
  useEffect(() => { if (!user) return; const i = setInterval(refreshUser, 2000); return () => clearInterval(i); }, [user, refreshUser]);

  const notify = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };

  const copyWallet = () => {
    navigator.clipboard.writeText(PLATFORM_WALLET).catch(() => {
      const el = document.createElement('textarea'); el.value = PLATFORM_WALLET;
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    });
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleLogin = (u: User) => {
    setUser(u);
    if (u.isNew) { setShowWelcome(true); u.isNew = false; store.updateUser(u); }
    if (u.isAdmin) setPage('admin');
  };

  const handleLogout = () => { store.logout(); setUser(null); setPage('dashboard'); setShowChat(false); };

  const handleBuyDevice = (deviceId: number) => {
    if (!user) return;
    const t = DEVICE_TEMPLATES.find(d => d.id === deviceId);
    if (!t) return;
    if (user.balance < t.price) { notify('رصيدك غير كافي! قم بالإيداع أولاً ❌'); return; }
    const res = store.buyDevice(user.id, deviceId);
    if (res.success) { notify(`تم شراء ${t.nameAr} بنجاح! 🎉`); refreshUser(); setPage('my-devices'); }
    else notify(res.error || 'خطأ');
  };

  const handleStartMining = (udId: string, duration: number) => {
    if (!user) return;
    const res = store.startMining(user.id, udId, duration);
    if (res.success) { notify(`بدأ التعدين لمدة ${duration} أيام ⛏️`); refreshUser(); }
    else notify(res.error || 'خطأ');
  };

  const handleCollect = (udId: string) => {
    if (!user) return;
    const res = store.collectProfit(user.id, udId);
    if (res.success) { notify(`تم جمع الأرباح: $${res.profit?.toFixed(2)} 💰`); refreshUser(); }
    else notify(res.error || 'خطأ');
  };

  const handleUpgrade = (udId: string, newDeviceId: number) => {
    if (!user) return;
    const res = store.upgradeDevice(user.id, udId, newDeviceId);
    if (res.success) { notify('تم ترقية الجهاز بنجاح! 🚀'); setUpgradeTarget(null); refreshUser(); }
    else notify(res.error || 'خطأ');
  };

  const handleDeposit = () => {
    if (!user) return;
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount < 10) { notify('الحد الأدنى للإيداع 10 دولار'); return; }
    const res = store.createTransaction(user.id, 'deposit', amount);
    if (res.success) { notify('تم إرسال طلب الإيداع! ⏳'); setDepositAmount(''); refreshUser(); }
    else notify(res.error || 'خطأ');
  };

  const handleWithdraw = () => {
    if (!user) return;
    if (!walletAddress.trim() || !walletAddress.startsWith('0x') || walletAddress.length < 10) { notify('عنوان محفظة غير صالح ❌'); return; }
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 10) { notify('الحد الأدنى 10 دولار'); return; }
    if (user.balance < amount) { notify('رصيدك غير كافي'); return; }
    const res = store.createTransaction(user.id, 'withdraw', amount, walletAddress.trim());
    if (res.success) { notify(`تم إرسال طلب السحب! رسوم ${(amount * 0.10).toFixed(2)}$ ⏳`); setWithdrawAmount(''); setWalletAddress(''); refreshUser(); }
    else notify(res.error || 'خطأ');
  };

  if (!user) return <AuthScreen onLogin={handleLogin} />;
  if (user.isAdmin && page === 'admin') return <AdminPanel user={user} onLogout={handleLogout} />;

  const unreadChat = store.getUnreadCount(user.id);
  const unreadNotif = store.getUnreadNotifCount(user.id);

  return (
    <div className="min-h-screen pb-24">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] animate-slide-down">
          <div className="glass-card rounded-xl px-5 py-3 shadow-2xl text-white text-sm font-medium border border-gray-700/30">
            {notification}
          </div>
        </div>
      )}

      {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
      {showNotifs && <NotificationCenter userId={user.id} onClose={() => setShowNotifs(false)} />}
      {upgradeTarget && (
        <UpgradeModal currentDeviceId={upgradeTarget.deviceId} balance={user.balance}
          onUpgrade={(n) => handleUpgrade(upgradeTarget.id, n)} onClose={() => setUpgradeTarget(null)} />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-gray-800/30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Cpu size={18} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gradient">CryptoMine Pro</h1>
              <p className="text-[10px] text-gray-600">مرحباً {user.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-gray-800/20 rounded-xl px-3 py-1.5 border border-gray-700/20">
              <p className="text-[9px] text-gray-500">الرصيد</p>
              <p className="text-green-400 font-bold text-sm">${user.balance.toFixed(2)}</p>
            </div>
            <button onClick={() => setShowNotifs(true)} className="relative p-2 text-gray-500 hover:text-white transition-all">
              <Bell size={18} />
              {unreadNotif > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center animate-bounce-in">{unreadNotif}</span>}
            </button>
            <button onClick={() => setPage('profile')} className="p-2 text-gray-500 hover:text-white transition-all">
              <UserIcon size={18} />
            </button>
            {user.isAdmin && (
              <button onClick={() => setPage('admin')} className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all">
                <Shield size={16} />
              </button>
            )}
            <button onClick={handleLogout} className="p-2 text-gray-600 hover:text-white transition-all">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-5">
        {/* Dashboard */}
        {page === 'dashboard' && (
          <div className="space-y-5 animate-slide-up">
            {/* Balance Card */}
            <div className="relative glass-card rounded-3xl p-6 overflow-hidden">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet size={16} className="text-gray-500" />
                  <p className="text-gray-500 text-xs">إجمالي الرصيد</p>
                </div>
                <h2 className="text-4xl font-bold text-white mb-5">${user.balance.toFixed(2)}</h2>
                <div className="flex gap-3">
                  <button onClick={() => setPage('deposit')}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-green-500/15 text-sm">
                    <Download size={16} /> إيداع
                  </button>
                  <button onClick={() => setPage('withdraw')}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-orange-500/15 text-sm">
                    <Upload size={16} /> سحب
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: <HardDrive size={18} />, color: 'text-blue-400', label: 'أجهزتي', value: user.devices.length },
                { icon: <Zap size={18} />, color: 'text-green-400', label: 'تعمل', value: user.devices.filter(d => d.isRunning).length },
                { icon: <TrendingUp size={18} />, color: 'text-yellow-400', label: 'الأرباح', value: '$' + user.devices.reduce((s, d) => s + d.totalEarned, 0).toFixed(0) },
                { icon: <Share2 size={18} />, color: 'text-purple-400', label: 'إحالات', value: store.getReferralCount(user.id) },
              ].map((s, i) => (
                <div key={i} className="glass-card rounded-2xl p-3.5">
                  <div className={`${s.color} mb-1.5`}>{s.icon}</div>
                  <p className="text-gray-600 text-[10px]">{s.label}</p>
                  <p className="text-white text-lg font-bold">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Referral Banner */}
            {store.getReferralCount(user.id) === 0 && (
              <div className="glass-card rounded-2xl p-4 flex items-center gap-3 border border-purple-500/10">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                  <Award size={24} className="text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-bold">ادعُ أصدقاءك واربح 3%</p>
                  <p className="text-gray-500 text-xs">شارك كود الإحالة <span className="text-purple-400 font-mono font-bold">{user.referralCode}</span> واحصل على عمولة</p>
                </div>
                <button onClick={() => setPage('profile')} className="bg-purple-500/15 text-purple-400 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-purple-500/25 transition-all shrink-0">
                  التفاصيل
                </button>
              </div>
            )}

            {/* Active Mining */}
            {user.devices.some(d => d.isRunning) && (
              <div>
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Zap size={16} className="text-green-400" /> تعدين نشط</h3>
                <div className="space-y-2">
                  {user.devices.filter(d => d.isRunning).map(ud => <MiniMiningCard key={ud.id} ud={ud} />)}
                </div>
              </div>
            )}

            {/* Contact Admin Card */}
            <div className="glass-card rounded-2xl p-4 flex items-center gap-4 border border-blue-500/10 hover:border-blue-500/30 transition-all cursor-pointer group" onClick={() => setShowChat(true)}>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-all">
                <MessageCircle size={22} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-bold">تواصل مع الدعم الفني 💬</p>
                <p className="text-gray-500 text-xs">فريق الدعم متاح على مدار الساعة للمساعدة</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400 text-xs font-medium">متصل</span>
              </div>
            </div>

            {/* Recent Transactions */}
            <div>
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Clock size={16} className="text-blue-400" /> آخر المعاملات</h3>
              <TransactionList userId={user.id} />
            </div>
          </div>
        )}

        {/* Store */}
        {page === 'store' && (
          <div className="space-y-5 animate-slide-up">
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-1">متجر أجهزة التعدين ⛏️</h2>
              <p className="text-gray-500 text-sm">اختر الجهاز المناسب لميزانيتك</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {DEVICE_TEMPLATES.map((d, i) => (
                <div key={d.id} style={{ animationDelay: `${i * 0.08}s` }}>
                  <DeviceStoreCard device={d} owned={user.devices.some(ud => ud.deviceId === d.id)} onBuy={() => handleBuyDevice(d.id)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Devices */}
        {page === 'my-devices' && (
          <div className="space-y-5 animate-slide-up">
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-1">أجهزتي 🖥️</h2>
              <p className="text-gray-500 text-sm">إدارة وتشغيل أجهزة التعدين</p>
            </div>
            {user.devices.length === 0 ? (
              <div className="text-center py-16">
                <HardDrive size={48} className="text-gray-800 mx-auto mb-3" />
                <p className="text-gray-600 text-sm mb-4">لا تملك أي أجهزة بعد</p>
                <button onClick={() => setPage('store')}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-all">
                  تصفح المتجر
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {user.devices.map(ud => (
                  <MyDeviceCard key={ud.id} ud={ud}
                    onStart={(d) => handleStartMining(ud.id, d)}
                    onCollect={() => handleCollect(ud.id)}
                    onUpgrade={() => setUpgradeTarget(ud)} />
                ))}
              </div>
            )}
            {user.devices.length > 0 && (
              <div className="text-center">
                <button onClick={() => setPage('store')} className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 mx-auto">
                  <ShoppingCart size={14} /> شراء جهاز جديد
                </button>
              </div>
            )}
          </div>
        )}

        {/* Deposit */}
        {page === 'deposit' && (
          <div className="max-w-md mx-auto space-y-5 animate-slide-up">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-green-500/20">
                <Download size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">إيداع أموال</h2>
              <p className="text-gray-500 text-xs">الحد الأدنى: $10</p>
            </div>

            {/* Platform Wallet */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Wallet size={16} className="text-green-400" />
                <label className="text-xs font-bold text-white">عنوان محفظة المنصة</label>
              </div>
              <div className="bg-gray-800/20 border border-gray-700/30 rounded-xl p-3 mb-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-gray-300 text-[10px] font-mono break-all leading-relaxed" dir="ltr">{PLATFORM_WALLET}</p>
                  <button onClick={copyWallet}
                    className={`shrink-0 p-2 rounded-lg transition-all ${copied ? 'bg-green-500/15 text-green-400' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'}`}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
              {copied && <p className="text-green-400 text-xs text-center mb-3 animate-slide-up">✅ تم نسخ العنوان بنجاح!</p>}
              <div className="flex items-center gap-2 bg-purple-500/5 border border-purple-500/15 rounded-xl px-3 py-2">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span className="text-purple-300 text-xs font-bold">الشبكة: ERC20 (Ethereum)</span>
              </div>
              <p className="text-yellow-500/70 text-[10px] mt-2 flex items-start gap-1">
                <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                <span>يرجى الإرسال عبر شبكة ERC20 فقط. الإرسال عبر شبكة أخرى قد يؤدي إلى فقدان الأموال.</span>
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5">
              <label className="block text-xs text-gray-500 mb-2">المبلغ (USD)</label>
              <div className="relative mb-3">
                <DollarSign size={16} className="absolute right-3 top-3 text-gray-600" />
                <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
                  className="w-full bg-gray-800/20 border border-gray-700/30 rounded-xl py-3 pr-9 pl-4 text-white text-lg font-bold placeholder-gray-700 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20"
                  placeholder="0.00" min="10" dir="ltr" />
              </div>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[10, 50, 100, 500].map(v => (
                  <button key={v} onClick={() => setDepositAmount(String(v))}
                    className="bg-gray-800/20 border border-gray-700/20 rounded-xl py-2 text-white text-xs hover:border-green-500/30 transition-all">
                    ${v}
                  </button>
                ))}
              </div>
              <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-3 mb-4 text-xs text-blue-300/70">
                💡 قم بإرسال المبلغ إلى عنوان المحفظة أعلاه ثم أدخل المبلغ وأكد الإيداع.
              </div>
              <button onClick={handleDeposit}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-green-500/15 text-sm">
                تأكيد الإيداع
              </button>
            </div>
            <TransactionList userId={user.id} typeFilter="deposit" />
          </div>
        )}

        {/* Withdraw */}
        {page === 'withdraw' && (
          <div className="max-w-md mx-auto space-y-5 animate-slide-up">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-orange-500/20">
                <Upload size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">سحب أموال</h2>
              <p className="text-gray-500 text-xs">الحد الأدنى: $10 | رسوم: 10%</p>
            </div>
            <div className="glass-card rounded-2xl p-5">
              <div className="bg-gray-800/20 rounded-xl p-3 mb-4 flex justify-between items-center">
                <span className="text-gray-500 text-xs">رصيدك المتاح</span>
                <span className="text-green-400 font-bold">${user.balance.toFixed(2)}</span>
              </div>

              {/* Wallet Address */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Wallet size={14} className="text-orange-400" />
                  <label className="text-xs text-gray-500">عنوان محفظتك (ERC20)</label>
                </div>
                <input type="text" value={walletAddress} onChange={e => setWalletAddress(e.target.value)}
                  className="w-full bg-gray-800/20 border border-gray-700/30 rounded-xl py-2.5 px-4 text-white text-xs font-mono placeholder-gray-700 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20"
                  placeholder="0x..." dir="ltr" />
              </div>

              <div className="flex items-center gap-2 bg-purple-500/5 border border-purple-500/15 rounded-xl px-3 py-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span className="text-purple-300 text-xs font-bold">شبكة السحب: ERC20 (Ethereum)</span>
              </div>

              <label className="block text-xs text-gray-500 mb-1.5">المبلغ (USD)</label>
              <div className="relative mb-3">
                <DollarSign size={16} className="absolute right-3 top-3 text-gray-600" />
                <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                  className="w-full bg-gray-800/20 border border-gray-700/30 rounded-xl py-3 pr-9 pl-4 text-white text-lg font-bold placeholder-gray-700 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20"
                  placeholder="0.00" min="10" dir="ltr" />
              </div>
              {withdrawAmount && parseFloat(withdrawAmount) >= 10 && (
                <div className="bg-gray-800/20 rounded-xl p-3 mb-4 space-y-1 animate-slide-up text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">المبلغ</span><span className="text-white">${parseFloat(withdrawAmount).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">رسوم 10%</span><span className="text-red-400">-${(parseFloat(withdrawAmount) * 0.10).toFixed(2)}</span></div>
                  <div className="border-t border-gray-800/30 pt-1 flex justify-between"><span className="text-gray-500">ستستلم</span><span className="text-green-400 font-bold">${(parseFloat(withdrawAmount) * 0.90).toFixed(2)}</span></div>
                </div>
              )}
              <p className="text-yellow-500/70 text-[10px] mb-3 flex items-start gap-1">
                <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                <span>تأكد من صحة عنوان المحفظة. سيتم التحويل عبر شبكة ERC20 فقط.</span>
              </p>

              {/* قانون السحب */}
              <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4 mb-4">
                <h4 className="text-blue-300 text-xs font-bold mb-2 flex items-center gap-1.5">
                  <Shield size={14} /> قوانين وشروط السحب
                </h4>
                <ul className="space-y-1.5 text-[10px] text-gray-400 leading-relaxed">
                  <li className="flex items-start gap-1.5">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>الحد الأدنى للسحب هو <span className="text-white font-bold">$10</span></span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>رسوم السحب <span className="text-red-400 font-bold">10%</span> من المبلغ المطلوب</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>يتم مراجعة طلبات السحب خلال <span className="text-yellow-400 font-bold">24 إلى 48 ساعة</span> عمل</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>يتم التحويل حصرياً عبر شبكة <span className="text-purple-400 font-bold">ERC20 (Ethereum)</span></span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>تأكد من صحة عنوان المحفظة. الإدارة غير مسؤولة عن أي خطأ في العنوان</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-orange-400 mt-0.5">⚠️</span>
                    <span>طلبات السحب <span className="text-orange-400 font-bold">غير قابلة للإلغاء</span> بعد الإرسال</span>
                  </li>
                </ul>
              </div>

              {/* تحذير الرصيد غير كافي */}
              {user.balance < 10 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-3 flex items-center gap-2 animate-slide-up">
                  <AlertTriangle size={16} className="text-red-400 shrink-0" />
                  <p className="text-red-400 text-xs">رصيدك الحالي <span className="font-bold">${user.balance.toFixed(2)}</span> غير كافٍ. الحد الأدنى للسحب هو <span className="font-bold">$10</span></p>
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

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-gray-800/30">
        <div className="max-w-4xl mx-auto flex items-center justify-around py-1.5 px-2">
          {[
            { id: 'dashboard' as Page, icon: Home, label: 'الرئيسية' },
            { id: 'store' as Page, icon: ShoppingCart, label: 'المتجر' },
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

      {/* Chat FAB - Contact Admin */}
      {!showChat && (
        <button onClick={() => setShowChat(true)}
          className="fixed bottom-20 left-4 z-50 group">
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

  const pendingTxs = transactions.filter(t => t.status === 'pending');
  const notify = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };
  const handleApprove = (txId: string) => { store.approveTransaction(txId); setTransactions(store.getTransactions()); notify('تم تأكيد المعاملة ✅'); };
  const handleReject = (txId: string) => { store.rejectTransaction(txId); setTransactions(store.getTransactions()); notify('تم رفض المعاملة ❌'); };

  const filteredTxs = transactions.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (searchTerm) {
      const u = users.find(u => u.id === t.userId);
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
              <span className="bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded-lg text-xs border border-yellow-500/20">{unreadNotif} إشعار</span>
            )}
            <button onClick={onLogout} className="p-2 text-gray-600 hover:text-white"><LogOut size={16} /></button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          {[
            { icon: <Users size={16} />, color: 'text-blue-400', label: 'المستخدمين', value: users.filter(u => !u.isAdmin).length },
            { icon: <Clock size={16} />, color: 'text-yellow-400', label: 'معلقة', value: pendingTxs.length },
            { icon: <DollarSign size={16} />, color: 'text-green-400', label: 'إجمالي الأرصدة', value: '$' + totalBalance.toFixed(0) },
            { icon: <HardDrive size={16} />, color: 'text-purple-400', label: 'الأجهزة', value: totalDevices },
            { icon: <Star size={16} />, color: 'text-orange-400', label: 'المعاملات', value: transactions.length },
          ].map((s, i) => (
            <div key={i} className="glass-card rounded-2xl p-3.5">
              <div className={`${s.color} mb-1`}>{s.icon}</div>
              <p className="text-gray-600 text-[10px]">{s.label}</p>
              <p className="text-white text-lg font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex glass-card rounded-xl p-1 mb-5">
          {[
            { id: 'transactions' as const, label: 'المعاملات', icon: CreditCard },
            { id: 'users' as const, label: 'المستخدمين', icon: Users },
            { id: 'chat' as const, label: 'الرسائل', icon: MessageCircle },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${tab === t.id ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* Transactions Tab */}
        {tab === 'transactions' && (
          <div className="space-y-4 animate-slide-up">
            {/* Pending */}
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

            {/* Search & Filter */}
            <div className="flex gap-2">
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="flex-1 bg-gray-800/20 border border-gray-700/20 rounded-xl px-4 py-2 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-blue-500/30"
                placeholder="🔍 بحث بالاسم أو البريد..." />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
                className="bg-gray-800/30 border border-gray-700/20 rounded-xl px-3 py-2 text-white text-xs focus:outline-none cursor-pointer">
                <option value="all">الكل</option>
                <option value="pending">معلقة</option>
                <option value="approved">مؤكدة</option>
                <option value="rejected">مرفوضة</option>
              </select>
            </div>

            {/* All Transactions */}
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

        {/* Users Tab */}
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
                    <p className="text-gray-400 text-[9px]">{new Date(u.lastLogin).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
              </div>
            ))}
            {users.filter(u => !u.isAdmin).length === 0 && <p className="text-gray-600 text-center py-12 text-sm">لا يوجد مستخدمين بعد</p>}
          </div>
        )}

        {/* Chat Tab */}
        {tab === 'chat' && <AdminChat onClose={() => setTab('transactions')} />}
      </div>
    </div>
  );
}
