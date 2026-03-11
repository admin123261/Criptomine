import { User, Transaction, ChatMessage, Notification, UserDevice, DEVICE_TEMPLATES, GIFT_DEVICE } from './types';
import { supabase } from './supabaseClient';
import { immediateUserSync, immediateDataSync } from './supabaseSync';

// تسجيل المستخدم في Supabase Auth (في الخلفية - صامت)
async function supabaseSignUp(email: string, password: string, username: string) {
  try {
    await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });
  } catch { /* صامت */ }
}

// تسجيل دخول في Supabase Auth (في الخلفية - صامت)
async function supabaseSignIn(email: string, password: string) {
  try {
    await supabase.auth.signInWithPassword({ email, password });
  } catch { /* صامت */ }
}

const USERS_KEY = 'cm_users';
const TX_KEY = 'cm_transactions';
const CHAT_KEY = 'cm_chat';
const SESSION_KEY = 'cm_session';
const NOTIF_KEY = 'cm_notifications';

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function genReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'CM-';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

function initAdmin() {
  const users = getUsers();
  if (!users.find(u => u.isAdmin)) {
    const admin: User = {
      id: 'admin001',
      username: 'Admin',
      email: 'admin@cryptomine.com',
      password: 'admin123',
      balance: 0,
      devices: [],
      isAdmin: true,
      isNew: false,
      createdAt: Date.now(),
      referralCode: 'ADMIN',
      referralEarnings: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      lastLogin: Date.now(),
    };
    users.push(admin);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
}

export function getUsers(): User[] {
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getTransactions(): Transaction[] {
  const data = localStorage.getItem(TX_KEY);
  return data ? JSON.parse(data) : [];
}

function saveTransactions(txs: Transaction[]) {
  localStorage.setItem(TX_KEY, JSON.stringify(txs));
}

export function getChatMessages(): ChatMessage[] {
  const data = localStorage.getItem(CHAT_KEY);
  return data ? JSON.parse(data) : [];
}

function saveChatMessages(msgs: ChatMessage[]) {
  localStorage.setItem(CHAT_KEY, JSON.stringify(msgs));
}

export function getNotifications(userId: string): Notification[] {
  const data = localStorage.getItem(NOTIF_KEY);
  const all: Notification[] = data ? JSON.parse(data) : [];
  return all.filter(n => n.userId === userId).sort((a, b) => b.date - a.date);
}

function saveNotification(notif: Notification) {
  const data = localStorage.getItem(NOTIF_KEY);
  const all: Notification[] = data ? JSON.parse(data) : [];
  all.push(notif);
  localStorage.setItem(NOTIF_KEY, JSON.stringify(all));
}

export function addNotification(userId: string, title: string, message: string, type: 'success' | 'warning' | 'info' | 'error' = 'info') {
  saveNotification({
    id: genId(),
    userId,
    title,
    message,
    type,
    date: Date.now(),
    read: false,
  });
}

export function markNotificationsRead(userId: string) {
  const data = localStorage.getItem(NOTIF_KEY);
  const all: Notification[] = data ? JSON.parse(data) : [];
  all.forEach(n => { if (n.userId === userId) n.read = true; });
  localStorage.setItem(NOTIF_KEY, JSON.stringify(all));
}

export function getUnreadNotifCount(userId: string): number {
  return getNotifications(userId).filter(n => !n.read).length;
}

export function register(username: string, email: string, password: string, referralCode?: string): { success: boolean; error?: string; user?: User } {
  initAdmin();
  const users = getUsers();
  if (users.find(u => u.email === email)) return { success: false, error: 'البريد الإلكتروني مسجل بالفعل' };
  if (users.find(u => u.username === username)) return { success: false, error: 'اسم المستخدم مسجل بالفعل' };

  let referrerId: string | undefined;
  if (referralCode && referralCode.trim()) {
    const referrer = users.find(u => u.referralCode === referralCode.trim().toUpperCase());
    if (referrer) {
      referrerId = referrer.id;
      addNotification(referrer.id, 'إحالة جديدة! 🎉', `انضم ${username} عبر رابط الإحالة الخاص بك`, 'success');
    }
  }

  const giftDevice: UserDevice = {
    id: genId(),
    deviceId: 0,
    isRunning: true,
    startTime: Date.now(),
    duration: 1,
    totalEarned: 0,
    isGift: true,
  };

  const user: User = {
    id: genId(),
    username,
    email,
    password,
    balance: 0,
    devices: [giftDevice],
    isAdmin: false,
    isNew: true,
    createdAt: Date.now(),
    referralCode: genReferralCode(),
    referredBy: referrerId,
    referralEarnings: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    lastLogin: Date.now(),
  };
  users.push(user);
  saveUsers(users);
  localStorage.setItem(SESSION_KEY, user.id);
  addNotification(user.id, 'مرحباً بك! 🎉', 'تم إنشاء حسابك بنجاح. استمتع بجهاز الهدية المجاني!', 'success');
  addNotification(user.id, 'هدية ترحيبية! 🎁', 'تهانينا! حصلت على جهاز تعدين مجاني كهدية ترحيبية. الجهاز يعمل الآن لمدة 24 ساعة وسيحقق لك ربح $5.00!', 'success');
  addNotification(user.id, 'جهاز الهدية يعمل! ⛏️', 'تم تشغيل جهاز الهدية تلقائياً. يمكنك متابعة الأرباح في صفحة أجهزتي.', 'info');
  addNotification('admin001', 'مستخدم جديد! 👤', `انضم ${username} (${email}) إلى المنصة`, 'success');
  // تسجيل المستخدم في Supabase Auth + حفظ فوري في قاعدة البيانات
  supabaseSignUp(email, password, username);
  immediateUserSync(user as unknown as Record<string, unknown>);
  return { success: true, user };
}

export function login(email: string, password: string): { success: boolean; error?: string; user?: User } {
  initAdmin();
  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return { success: false, error: 'بيانات الدخول غير صحيحة' };
  user.lastLogin = Date.now();
  updateUser(user);
  localStorage.setItem(SESSION_KEY, user.id);
  if (!user.isAdmin) {
    addNotification(user.id, 'تسجيل دخول ✅', `مرحباً بعودتك ${user.username}! آخر دخول: ${new Date().toLocaleString('ar-EG')}`, 'info');
  }
  // تسجيل الدخول في Supabase Auth
  supabaseSignIn(email, password);
  return { success: true, user };
}

export function logout() { localStorage.removeItem(SESSION_KEY); }

export function getCurrentUser(): User | null {
  initAdmin();
  const userId = localStorage.getItem(SESSION_KEY);
  if (!userId) return null;
  return getUsers().find(u => u.id === userId) || null;
}

export function updateUser(user: User) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx !== -1) { users[idx] = user; saveUsers(users); }
}

export function changePassword(userId: string, oldPass: string, newPass: string): { success: boolean; error?: string } {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return { success: false, error: 'مستخدم غير موجود' };
  if (user.password !== oldPass) return { success: false, error: 'كلمة المرور الحالية غير صحيحة' };
  if (newPass.length < 6) return { success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
  user.password = newPass;
  updateUser(user);
  addNotification(userId, 'تم تغيير كلمة المرور 🔒', 'تم تغيير كلمة المرور بنجاح. إذا لم تقم بذلك، تواصل مع الدعم فوراً.', 'warning');
  immediateDataSync();
  return { success: true };
}

export function buyDevice(userId: string, deviceId: number): { success: boolean; error?: string } {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return { success: false, error: 'مستخدم غير موجود' };
  const device = DEVICE_TEMPLATES.find(d => d.id === deviceId);
  if (!device) return { success: false, error: 'جهاز غير موجود' };
  if (user.balance < device.price) return { success: false, error: 'رصيدك غير كافي' };

  user.balance -= device.price;
  const newDevice: UserDevice = { id: genId(), deviceId: device.id, isRunning: false, startTime: null, duration: null, totalEarned: 0 };
  user.devices.push(newDevice);
  updateUser(user);
  addNotification(userId, 'تم شراء جهاز جديد! 🎉', `تم شراء ${device.nameAr} بنجاح. انتقل إلى أجهزتي لبدء التعدين.`, 'success');
  addNotification('admin001', 'عملية شراء 🛒', `${user.username} اشترى ${device.nameAr} بسعر $${device.price}`, 'info');
  immediateDataSync();
  return { success: true };
}

export function upgradeDevice(userId: string, userDeviceId: string, newDeviceId: number): { success: boolean; error?: string } {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return { success: false, error: 'مستخدم غير موجود' };
  const userDevice = user.devices.find(d => d.id === userDeviceId);
  if (!userDevice) return { success: false, error: 'الجهاز غير موجود' };
  if (userDevice.isRunning) return { success: false, error: 'لا يمكن ترقية جهاز يعمل حالياً' };
  const currentTemplate = DEVICE_TEMPLATES.find(d => d.id === userDevice.deviceId);
  const newTemplate = DEVICE_TEMPLATES.find(d => d.id === newDeviceId);
  if (!newTemplate) return { success: false, error: 'جهاز غير موجود' };
  const currentPrice = currentTemplate ? currentTemplate.price : 0;
  const diff = newTemplate.price - currentPrice;
  if (diff <= 0) return { success: false, error: 'لا يمكن الترقية لجهاز أقل' };
  if (user.balance < diff) return { success: false, error: `رصيدك غير كافي. تحتاج $${diff}` };

  user.balance -= diff;
  userDevice.deviceId = newDeviceId;
  userDevice.totalEarned = 0;
  updateUser(user);
  addNotification(userId, 'تم ترقية الجهاز! 🚀', `تم ترقية جهازك إلى ${newTemplate.nameAr}`, 'success');
  addNotification('admin001', 'ترقية جهاز 🔄', `${user.username} قام بترقية جهازه إلى ${newTemplate.nameAr} (فرق: $${diff})`, 'info');
  immediateDataSync();
  return { success: true };
}

export function startMining(userId: string, userDeviceId: string, duration: number): { success: boolean; error?: string } {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return { success: false, error: 'مستخدم غير موجود' };
  const device = user.devices.find(d => d.id === userDeviceId);
  if (!device) return { success: false, error: 'الجهاز غير موجود' };
  if (device.isRunning) return { success: false, error: 'الجهاز يعمل بالفعل' };
  device.isRunning = true;
  device.startTime = Date.now();
  device.duration = duration;
  device.totalEarned = 0;
  updateUser(user);
  const template = DEVICE_TEMPLATES.find(d => d.id === device.deviceId);
  const deviceName = template ? template.nameAr : 'الجهاز';
  const rate = duration === 3 ? '2%' : '2.5%';
  const expectedProfit = template ? (template.price * (duration === 3 ? 0.02 : 0.025) * duration).toFixed(2) : '0';
  addNotification(userId, 'بدأ التعدين! ⛏️', `تم تشغيل ${deviceName} لمدة ${duration} أيام بنسبة ${rate}/يوم. الربح المتوقع: $${expectedProfit}`, 'success');
  addNotification('admin001', 'تعدين جديد 🔔', `${user.username} بدأ تشغيل ${deviceName} لمدة ${duration} أيام`, 'info');
  immediateDataSync();
  return { success: true };
}

export function collectProfit(userId: string, userDeviceId: string): { success: boolean; profit?: number; error?: string } {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return { success: false, error: 'مستخدم غير موجود' };
  const device = user.devices.find(d => d.id === userDeviceId);
  if (!device) return { success: false, error: 'الجهاز غير موجود' };
  const template = device.deviceId === 0 ? GIFT_DEVICE : DEVICE_TEMPLATES.find(d => d.id === device.deviceId);
  if (!template) return { success: false, error: 'خطأ' };
  if (!device.startTime || !device.duration) return { success: false, error: 'الجهاز لم يبدأ بعد' };
  const elapsed = Date.now() - device.startTime;
  const totalDuration = device.duration * 24 * 60 * 60 * 1000;
  if (elapsed < totalDuration) return { success: false, error: 'لم ينتهي وقت التعدين بعد' };

  let profit = 0;
  if (device.isGift) {
    profit = 5;
  } else {
    const rate = device.duration === 3 ? 0.02 : 0.025;
    profit = template.price * rate * device.duration;
  }

  user.balance += profit;
  device.isRunning = false;
  device.startTime = null;
  device.totalEarned += profit;
  device.duration = null;
  updateUser(user);

  // Referral commission
  if (user.referredBy && !device.isGift) {
    const referrer = users.find(u => u.id === user.referredBy);
    if (referrer) {
      const commission = profit * 0.03;
      referrer.referralEarnings += commission;
      referrer.balance += commission;
      updateUser(referrer);
      addNotification(referrer.id, 'عمولة إحالة! 💰', `حصلت على $${commission.toFixed(2)} عمولة من تعدين ${user.username}`, 'success');
    }
  }

  addNotification(userId, 'تم جمع الأرباح! 💰', `تم إضافة $${profit.toFixed(2)} إلى رصيدك`, 'success');
  addNotification('admin001', 'جمع أرباح 💰', `${user.username} جمع أرباح بقيمة $${profit.toFixed(2)}`, 'info');
  immediateDataSync();
  return { success: true, profit };
}

export function createTransaction(userId: string, type: 'deposit' | 'withdraw', amount: number, walletAddress?: string): { success: boolean; error?: string } {
  if (amount < 10) return { success: false, error: 'الحد الأدنى 10 دولار' };
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return { success: false, error: 'مستخدم غير موجود' };
  if (type === 'withdraw' && user.balance < amount) return { success: false, error: 'رصيدك غير كافي' };

  const txs = getTransactions();
  const tx: Transaction = { id: genId(), userId, type, amount, status: 'pending', date: Date.now(), walletAddress: walletAddress || undefined };
  txs.push(tx);
  saveTransactions(txs);

  addNotification(userId, type === 'deposit' ? 'طلب إيداع 📥' : 'طلب سحب 📤',
    `تم إرسال طلب ${type === 'deposit' ? 'إيداع' : 'سحب'} بمبلغ $${amount.toFixed(2)}. بانتظار التأكيد.`, 'info');
  addNotification('admin001', 'طلب جديد! 🔔',
    `${user.username} طلب ${type === 'deposit' ? 'إيداع' : 'سحب'} بمبلغ $${amount.toFixed(2)}`, 'warning');
  immediateDataSync();
  return { success: true };
}

export function approveTransaction(txId: string): { success: boolean } {
  const txs = getTransactions();
  const tx = txs.find(t => t.id === txId);
  if (!tx) return { success: false };
  tx.status = 'approved';
  saveTransactions(txs);

  const users = getUsers();
  const user = users.find(u => u.id === tx.userId);
  if (!user) return { success: false };

  if (tx.type === 'deposit') {
    user.balance += tx.amount;
    user.totalDeposits += tx.amount;
  } else if (tx.type === 'withdraw') {
    if (user.balance >= tx.amount) {
      user.balance -= tx.amount;
      user.totalWithdrawals += tx.amount;
    }
  }
  updateUser(user);
  const userName = user.username;
  addNotification(tx.userId, tx.type === 'deposit' ? 'إيداع مؤكد ✅' : 'سحب مؤكد ✅',
    `تم تأكيد ${tx.type === 'deposit' ? 'الإيداع' : 'السحب'} بمبلغ $${tx.amount.toFixed(2)}`, 'success');
  addNotification('admin001', 'تم تأكيد المعاملة ✅',
    `تم تأكيد ${tx.type === 'deposit' ? 'إيداع' : 'سحب'} ${userName} بمبلغ $${tx.amount.toFixed(2)}`, 'success');
  // مزامنة فورية مع Supabase لحفظ الرصيد الجديد
  immediateDataSync();
  return { success: true };
}

export function rejectTransaction(txId: string): { success: boolean } {
  const txs = getTransactions();
  const tx = txs.find(t => t.id === txId);
  if (!tx) return { success: false };
  tx.status = 'rejected';
  saveTransactions(txs);
  const rejUsers = getUsers();
  const rejUser = rejUsers.find(u => u.id === tx.userId);
  addNotification(tx.userId, tx.type === 'deposit' ? 'إيداع مرفوض ❌' : 'سحب مرفوض ❌',
    `تم رفض طلب ${tx.type === 'deposit' ? 'الإيداع' : 'السحب'} بمبلغ $${tx.amount.toFixed(2)}`, 'error');
  addNotification('admin001', 'تم رفض المعاملة ❌',
    `تم رفض ${tx.type === 'deposit' ? 'إيداع' : 'سحب'} ${rejUser?.username || ''} بمبلغ $${tx.amount.toFixed(2)}`, 'info');
  // مزامنة فورية مع Supabase
  immediateDataSync();
  return { success: true };
}

export function sendMessage(from: string, to: string, message: string) {
  const msgs = getChatMessages();
  msgs.push({ id: genId(), from, to, message, date: Date.now(), read: false });
  saveChatMessages(msgs);
  const users = getUsers();
  const sender = users.find(u => u.id === from);
  const senderName = sender?.username || (from === 'admin001' ? 'الدعم الفني' : 'مستخدم');
  if (to === 'admin001') {
    addNotification('admin001', 'رسالة جديدة 💬', `${senderName}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`, 'info');
  } else {
    addNotification(to, 'رسالة من الدعم 💬', `${senderName}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`, 'info');
  }
}

export function getUserMessages(userId: string): ChatMessage[] {
  return getChatMessages().filter(m => m.from === userId || m.to === userId).sort((a, b) => a.date - b.date);
}

export function getAdminMessages(): ChatMessage[] {
  return getChatMessages().sort((a, b) => a.date - b.date);
}

export function markMessagesRead(userId: string, readBy: string) {
  const msgs = getChatMessages();
  msgs.forEach(m => { if (m.to === readBy && m.from === userId) m.read = true; });
  saveChatMessages(msgs);
}

export function getUnreadCount(userId: string): number {
  return getChatMessages().filter(m => m.to === userId && !m.read).length;
}

export function getReferralCount(userId: string): number {
  return getUsers().filter(u => u.referredBy === userId).length;
}

export function getReferredUsers(userId: string): User[] {
  return getUsers().filter(u => u.referredBy === userId);
}

// Language management
const LANG_KEY = 'cm_language';

export function getLanguage(): string {
  return localStorage.getItem(LANG_KEY) || 'ar';
}

export function setLanguage(lang: string) {
  localStorage.setItem(LANG_KEY, lang);
}
