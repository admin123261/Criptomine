// مزامنة ثنائية الاتجاه مع Supabase - تحترم التعديلات من كلا الاتجاهين
import { supabase } from './supabaseClient';

const SB_URL = 'https://kxbmckzwpkmzokcvtrjd.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4Ym1ja3p3cGttem9rY3Z0cmpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDI0NDAsImV4cCI6MjA4ODM3ODQ0MH0.OHI-ByGg4bCjclLq7jHd4GImDJ_fjuZQgpdj8F3x7Cw';

const uploadHeaders = {
  'Content-Type': 'application/json',
  'apikey': SB_KEY,
  'Authorization': `Bearer ${SB_KEY}`,
  'Prefer': 'resolution=merge-duplicates'
};

const readHeaders = {
  'apikey': SB_KEY,
  'Authorization': `Bearer ${SB_KEY}`
};

// حفظ setItem الأصلي قبل الاعتراض
const originalSetItem = Object.getPrototypeOf(localStorage).setItem;

let connected = false;
let isLoadingFromSupabase = false;

// تتبع التغييرات المحلية - فقط عند تغيير محلي نرفع لـ Supabase
let localChanges: Set<string> = new Set();
// تتبع آخر وقت سحبنا فيه من Supabase
let lastPullTime = 0;

function hash(data: string): string {
  let h = 0;
  for (let i = 0; i < data.length; i++) {
    const ch = data.charCodeAt(i);
    h = ((h << 5) - h) + ch;
    h |= 0;
  }
  return h.toString();
}

const lastHash: Record<string, string> = {};

// ============================================================
// =================== تحميل من Supabase ======================
// ============================================================

export async function loadFromSupabase(): Promise<void> {
  isLoadingFromSupabase = true;
  try {
    // تحميل المستخدمين
    const usersRes = await fetch(`${SB_URL}/rest/v1/mining_users?select=*`, { headers: readHeaders });
    if (!usersRes.ok) {
      console.log('[Supabase] ⚠️ تعذر تحميل المستخدمين:', usersRes.status);
      return;
    }
    const sbUsers = await usersRes.json();
    if (!Array.isArray(sbUsers) || sbUsers.length === 0) {
      console.log('[Supabase] ℹ️ لا توجد بيانات في Supabase بعد');
      return;
    }

    // تحميل الأجهزة
    const devicesRes = await fetch(`${SB_URL}/rest/v1/mining_devices?select=*`, { headers: readHeaders });
    const sbDevices = devicesRes.ok ? await devicesRes.json() : [];

    // تحميل المعاملات
    const txRes = await fetch(`${SB_URL}/rest/v1/mining_transactions?select=*`, { headers: readHeaders });
    const sbTx = txRes.ok ? await txRes.json() : [];

    // تحميل الرسائل
    const msgRes = await fetch(`${SB_URL}/rest/v1/mining_messages?select=*`, { headers: readHeaders });
    const sbMsg = msgRes.ok ? await msgRes.json() : [];

    // تحميل الإشعارات
    const notifRes = await fetch(`${SB_URL}/rest/v1/mining_notifications?select=*`, { headers: readHeaders });
    const sbNotif = notifRes.ok ? await notifRes.json() : [];

    // بيانات localStorage الحالية للدمج
    const localUsers = JSON.parse(localStorage.getItem('cm_users') || '[]');

    // تحويل المستخدمين من تنسيق Supabase إلى تنسيق التطبيق
    const appUsers = sbUsers.map((u: Record<string, unknown>) => {
      const localUser = localUsers.find((lu: Record<string, unknown>) => lu.email === u.email || lu.id === u.id);
      const userDevices = (Array.isArray(sbDevices) ? sbDevices : [])
        .filter((d: Record<string, unknown>) => d.user_id === u.id)
        .map((d: Record<string, unknown>) => ({
          id: d.id,
          deviceId: d.device_id,
          isRunning: d.is_running || false,
          startTime: d.start_time || null,
          duration: d.duration || null,
          totalEarned: Number(d.total_earned) || 0,
          isGift: d.is_gift || false,
        }));

      return {
        id: u.id,
        username: u.username,
        email: u.email,
        password: u.password || (localUser as Record<string, unknown>)?.password || '',
        balance: Number(u.balance) || 0,
        devices: userDevices.length > 0 ? userDevices : ((localUser as Record<string, unknown>)?.devices || []),
        isAdmin: u.is_admin || false,
        isNew: false,
        createdAt: u.created_at || Date.now(),
        referralCode: u.referral_code || '',
        referredBy: u.referred_by || undefined,
        referralEarnings: Number(u.referral_earnings) || 0,
        totalDeposits: Number(u.total_deposits) || 0,
        totalWithdrawals: Number(u.total_withdrawals) || 0,
        lastLogin: u.last_login || Date.now(),
      };
    });

    // إضافة المستخدمين المحليين الغير موجودين في Supabase
    for (const lu of localUsers) {
      const exists = appUsers.find((u: Record<string, unknown>) => u.id === lu.id || u.email === lu.email);
      if (!exists) {
        appUsers.push(lu);
      }
    }

    // حفظ المستخدمين (بدون تحفيز المزامنة العكسية)
    originalSetItem.call(localStorage, 'cm_users', JSON.stringify(appUsers));

    // تحويل المعاملات
    if (Array.isArray(sbTx) && sbTx.length > 0) {
      const localTx = JSON.parse(localStorage.getItem('cm_transactions') || '[]');
      const appTx = sbTx.map((t: Record<string, unknown>) => ({
        id: t.id,
        userId: t.user_id,
        type: t.type,
        amount: Number(t.amount),
        status: t.status || 'pending',
        date: t.created_at || Date.now(),
        walletAddress: t.wallet_address || undefined,
      }));
      for (const lt of localTx) {
        if (!appTx.find((t: Record<string, unknown>) => t.id === lt.id)) appTx.push(lt);
      }
      originalSetItem.call(localStorage, 'cm_transactions', JSON.stringify(appTx));
    }

    // تحويل الرسائل
    if (Array.isArray(sbMsg) && sbMsg.length > 0) {
      const localMsg = JSON.parse(localStorage.getItem('cm_chat') || '[]');
      const appMsg = sbMsg.map((m: Record<string, unknown>) => ({
        id: m.id,
        from: m.from_user,
        to: m.to_user,
        message: m.message,
        date: m.created_at || Date.now(),
        read: m.is_read || false,
      }));
      for (const lm of localMsg) {
        if (!appMsg.find((m: Record<string, unknown>) => m.id === lm.id)) appMsg.push(lm);
      }
      originalSetItem.call(localStorage, 'cm_chat', JSON.stringify(appMsg));
    }

    // تحويل الإشعارات
    if (Array.isArray(sbNotif) && sbNotif.length > 0) {
      const localNotif = JSON.parse(localStorage.getItem('cm_notifications') || '[]');
      const appNotif = sbNotif.map((n: Record<string, unknown>) => ({
        id: n.id,
        userId: n.user_id,
        title: n.title,
        message: n.message,
        type: n.type || 'info',
        date: n.created_at || Date.now(),
        read: n.is_read || false,
      }));
      for (const ln of localNotif) {
        if (!appNotif.find((n: Record<string, unknown>) => n.id === ln.id)) appNotif.push(ln);
      }
      originalSetItem.call(localStorage, 'cm_notifications', JSON.stringify(appNotif));
    }

    // استعادة الجلسة من Supabase Auth
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.email) {
        const currentSession = localStorage.getItem('cm_session');
        if (!currentSession) {
          const users = JSON.parse(localStorage.getItem('cm_users') || '[]');
          const user = users.find((u: Record<string, unknown>) => u.email === data.session!.user.email);
          if (user) {
            originalSetItem.call(localStorage, 'cm_session', user.id);
            console.log('[Supabase] ✅ تم استعادة الجلسة تلقائياً:', user.username);
          }
        }
      }
    } catch { /* صامت */ }

    lastPullTime = Date.now();
    console.log('[Supabase] ✅ تم تحميل البيانات بنجاح (' + appUsers.length + ' مستخدم)');
  } catch (e) {
    console.log('[Supabase] ⚠️ تعذر تحميل البيانات:', e);
  } finally {
    isLoadingFromSupabase = false;
  }
}

// ============================================================
// ========= سحب التحديثات من Supabase (دوري) =================
// ============================================================

async function pullFromSupabase() {
  if (isLoadingFromSupabase) return;
  isLoadingFromSupabase = true;
  
  try {
    // سحب المستخدمين المحدثين بعد آخر سحب
    const usersRes = await fetch(`${SB_URL}/rest/v1/mining_users?select=*`, { headers: readHeaders });
    if (!usersRes.ok) return;
    const sbUsers = await usersRes.json();
    if (!Array.isArray(sbUsers) || sbUsers.length === 0) return;

    // سحب الأجهزة
    const devicesRes = await fetch(`${SB_URL}/rest/v1/mining_devices?select=*`, { headers: readHeaders });
    const sbDevices = devicesRes.ok ? await devicesRes.json() : [];

    // سحب المعاملات
    const txRes = await fetch(`${SB_URL}/rest/v1/mining_transactions?select=*`, { headers: readHeaders });
    const sbTx = txRes.ok ? await txRes.json() : [];

    const localUsers = JSON.parse(localStorage.getItem('cm_users') || '[]');
    let changed = false;

    // تحديث كل مستخدم من Supabase
    for (const sbU of sbUsers) {
      const sbUpdated = new Date(sbU.updated_at || 0).getTime();
      const localIdx = localUsers.findIndex((lu: Record<string, unknown>) => lu.id === sbU.id || lu.email === sbU.email);
      
      if (localIdx >= 0) {
        const localU = localUsers[localIdx];
        // إذا Supabase محدث بعد آخر سحب → خذ بيانات Supabase
        if (sbUpdated > lastPullTime) {
          // تحديث الرصيد والبيانات من Supabase
          localU.balance = Number(sbU.balance) || 0;
          localU.username = sbU.username || localU.username;
          localU.totalDeposits = Number(sbU.total_deposits) || 0;
          localU.totalWithdrawals = Number(sbU.total_withdrawals) || 0;
          localU.referralEarnings = Number(sbU.referral_earnings) || 0;
          if (sbU.password) localU.password = sbU.password;
          
          // تحديث الأجهزة من Supabase
          if (Array.isArray(sbDevices)) {
            const userDevices = sbDevices
              .filter((d: Record<string, unknown>) => d.user_id === sbU.id)
              .map((d: Record<string, unknown>) => ({
                id: d.id,
                deviceId: d.device_id,
                isRunning: d.is_running || false,
                startTime: d.start_time || null,
                duration: d.duration || null,
                totalEarned: Number(d.total_earned) || 0,
                isGift: d.is_gift || false,
              }));
            if (userDevices.length > 0) {
              localU.devices = userDevices;
            }
          }
          
          localUsers[localIdx] = localU;
          changed = true;
        }
      } else {
        // مستخدم جديد من Supabase غير موجود محلياً
        const userDevices = (Array.isArray(sbDevices) ? sbDevices : [])
          .filter((d: Record<string, unknown>) => d.user_id === sbU.id)
          .map((d: Record<string, unknown>) => ({
            id: d.id,
            deviceId: d.device_id,
            isRunning: d.is_running || false,
            startTime: d.start_time || null,
            duration: d.duration || null,
            totalEarned: Number(d.total_earned) || 0,
            isGift: d.is_gift || false,
          }));

        localUsers.push({
          id: sbU.id,
          username: sbU.username,
          email: sbU.email,
          password: sbU.password || '',
          balance: Number(sbU.balance) || 0,
          devices: userDevices,
          isAdmin: sbU.is_admin || false,
          isNew: false,
          createdAt: sbU.created_at || Date.now(),
          referralCode: sbU.referral_code || '',
          referredBy: sbU.referred_by || undefined,
          referralEarnings: Number(sbU.referral_earnings) || 0,
          totalDeposits: Number(sbU.total_deposits) || 0,
          totalWithdrawals: Number(sbU.total_withdrawals) || 0,
          lastLogin: sbU.last_login || Date.now(),
        });
        changed = true;
      }
    }

    if (changed) {
      originalSetItem.call(localStorage, 'cm_users', JSON.stringify(localUsers));
      // تحديث hash حتى لا يُعاد رفعها فوراً
      lastHash['users'] = hash(JSON.stringify(localUsers));
    }

    // تحديث المعاملات من Supabase
    if (Array.isArray(sbTx) && sbTx.length > 0) {
      const localTx = JSON.parse(localStorage.getItem('cm_transactions') || '[]');
      let txChanged = false;
      for (const sbT of sbTx) {
        const sbTxUpdated = new Date(sbT.updated_at || 0).getTime();
        const localTxIdx = localTx.findIndex((t: Record<string, unknown>) => t.id === sbT.id);
        if (localTxIdx >= 0) {
          if (sbTxUpdated > lastPullTime) {
            localTx[localTxIdx].status = sbT.status;
            localTx[localTxIdx].amount = Number(sbT.amount);
            txChanged = true;
          }
        } else {
          localTx.push({
            id: sbT.id, userId: sbT.user_id, type: sbT.type,
            amount: Number(sbT.amount), status: sbT.status || 'pending',
            date: sbT.created_at || Date.now(), walletAddress: sbT.wallet_address || undefined,
          });
          txChanged = true;
        }
      }
      if (txChanged) {
        originalSetItem.call(localStorage, 'cm_transactions', JSON.stringify(localTx));
        lastHash['transactions'] = hash(JSON.stringify(localTx));
      }
    }

    // سحب الرسائل الجديدة
    const msgRes = await fetch(`${SB_URL}/rest/v1/mining_messages?select=*`, { headers: readHeaders });
    if (msgRes.ok) {
      const sbMsg = await msgRes.json();
      if (Array.isArray(sbMsg) && sbMsg.length > 0) {
        const localMsg = JSON.parse(localStorage.getItem('cm_chat') || '[]');
        let msgChanged = false;
        for (const sm of sbMsg) {
          if (!localMsg.find((m: Record<string, unknown>) => m.id === sm.id)) {
            localMsg.push({
              id: sm.id, from: sm.from_user, to: sm.to_user,
              message: sm.message, date: sm.created_at || Date.now(), read: sm.is_read || false,
            });
            msgChanged = true;
          }
        }
        if (msgChanged) {
          originalSetItem.call(localStorage, 'cm_chat', JSON.stringify(localMsg));
          lastHash['messages'] = hash(JSON.stringify(localMsg));
        }
      }
    }

    // سحب الإشعارات الجديدة
    const notifRes = await fetch(`${SB_URL}/rest/v1/mining_notifications?select=*`, { headers: readHeaders });
    if (notifRes.ok) {
      const sbNotif = await notifRes.json();
      if (Array.isArray(sbNotif) && sbNotif.length > 0) {
        const localNotif = JSON.parse(localStorage.getItem('cm_notifications') || '[]');
        let notifChanged = false;
        for (const sn of sbNotif) {
          if (!localNotif.find((n: Record<string, unknown>) => n.id === sn.id)) {
            localNotif.push({
              id: sn.id, userId: sn.user_id, title: sn.title, message: sn.message,
              type: sn.type || 'info', date: sn.created_at || Date.now(), read: sn.is_read || false,
            });
            notifChanged = true;
          }
        }
        if (notifChanged) {
          originalSetItem.call(localStorage, 'cm_notifications', JSON.stringify(localNotif));
          lastHash['notifications'] = hash(JSON.stringify(localNotif));
        }
      }
    }

    lastPullTime = Date.now();
  } catch (e) {
    console.log('[Supabase] ⚠️ خطأ في السحب:', e);
  } finally {
    isLoadingFromSupabase = false;
  }
}

// ============================================================
// =================== رفع إلى Supabase =======================
// ============================================================

async function upsertToTable(table: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  try {
    await fetch(`${SB_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: uploadHeaders,
      body: JSON.stringify(rows)
    });
  } catch { /* صامت */ }
}

async function syncUsers() {
  const data = localStorage.getItem('cm_users');
  if (!data) return;
  const h = hash(data);
  if (lastHash['users'] === h) return;

  try {
    const users = JSON.parse(data);
    if (!Array.isArray(users)) return;

    const rows = users.map((u: Record<string, unknown>) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      password: u.password || '',
      balance: u.balance || 0,
      is_admin: u.isAdmin || false,
      referral_code: u.referralCode || '',
      referred_by: u.referredBy || null,
      referral_earnings: u.referralEarnings || 0,
      total_deposits: u.totalDeposits || 0,
      total_withdrawals: u.totalWithdrawals || 0,
      created_at: u.createdAt || Date.now(),
      last_login: u.lastLogin || Date.now(),
      updated_at: new Date().toISOString()
    }));
    await upsertToTable('mining_users', rows);

    const devices: Record<string, unknown>[] = [];
    for (const u of users) {
      if (Array.isArray(u.devices)) {
        for (const d of u.devices) {
          devices.push({
            id: d.id,
            user_id: u.id,
            device_id: d.deviceId,
            is_running: d.isRunning || false,
            start_time: d.startTime || null,
            duration: d.duration || null,
            total_earned: d.totalEarned || 0,
            is_gift: d.isGift || false,
            updated_at: new Date().toISOString()
          });
        }
      }
    }
    if (devices.length > 0) {
      await upsertToTable('mining_devices', devices);
    }

    lastHash['users'] = h;
  } catch { /* صامت */ }
}

async function syncTransactions() {
  const data = localStorage.getItem('cm_transactions');
  if (!data) return;
  const h = hash(data);
  if (lastHash['transactions'] === h) return;

  try {
    const txs = JSON.parse(data);
    if (!Array.isArray(txs)) return;

    const rows = txs.map((t: Record<string, unknown>) => ({
      id: t.id,
      user_id: t.userId,
      type: t.type,
      amount: t.amount,
      status: t.status || 'pending',
      wallet_address: t.walletAddress || null,
      created_at: t.date || Date.now(),
      updated_at: new Date().toISOString()
    }));
    await upsertToTable('mining_transactions', rows);
    lastHash['transactions'] = h;
  } catch { /* صامت */ }
}

async function syncMessages() {
  const data = localStorage.getItem('cm_chat');
  if (!data) return;
  const h = hash(data);
  if (lastHash['messages'] === h) return;

  try {
    const msgs = JSON.parse(data);
    if (!Array.isArray(msgs)) return;

    const rows = msgs.map((m: Record<string, unknown>) => ({
      id: m.id,
      from_user: m.from,
      to_user: m.to,
      message: m.message,
      is_read: m.read || false,
      created_at: m.date || Date.now(),
      updated_at: new Date().toISOString()
    }));
    await upsertToTable('mining_messages', rows);
    lastHash['messages'] = h;
  } catch { /* صامت */ }
}

async function syncNotifications() {
  const data = localStorage.getItem('cm_notifications');
  if (!data) return;
  const h = hash(data);
  if (lastHash['notifications'] === h) return;

  try {
    const notifs = JSON.parse(data);
    if (!Array.isArray(notifs)) return;

    const rows = notifs.map((n: Record<string, unknown>) => ({
      id: n.id,
      user_id: n.userId,
      title: n.title,
      message: n.message,
      type: n.type || 'info',
      is_read: n.read || false,
      created_at: n.date || Date.now(),
      updated_at: new Date().toISOString()
    }));
    await upsertToTable('mining_notifications', rows);
    lastHash['notifications'] = h;
  } catch { /* صامت */ }
}

// رفع فقط البيانات التي تغيرت محلياً
async function pushLocalChanges() {
  if (!connected || isLoadingFromSupabase || localChanges.size === 0) return;
  
  const changes = new Set(localChanges);
  localChanges.clear();

  if (changes.has('cm_users')) await syncUsers();
  if (changes.has('cm_transactions')) await syncTransactions();
  if (changes.has('cm_chat')) await syncMessages();
  if (changes.has('cm_notifications')) await syncNotifications();
}

// اعتراض localStorage.setItem لتسجيل التغييرات المحلية فقط
Object.getPrototypeOf(localStorage).setItem = function(key: string, value: string) {
  originalSetItem.call(this, key, value);
  if (connected && !isLoadingFromSupabase) {
    // تسجيل أن هذا المفتاح تغير محلياً
    if (['cm_users', 'cm_transactions', 'cm_chat', 'cm_notifications'].includes(key)) {
      localChanges.add(key);
    }
  }
};

// ============================================================
// =========== تسجيل دخول مباشر من Supabase ===================
// ============================================================

export async function loginViaSupabase(email: string, password: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/mining_users?email=eq.${encodeURIComponent(email)}&select=*`,
      { headers: readHeaders }
    );
    if (!res.ok) return null;
    const users = await res.json();
    if (!Array.isArray(users) || users.length === 0) return null;
    const u = users[0];
    if (u.password !== password) return null;

    // تحميل أجهزة المستخدم
    let devices: Record<string, unknown>[] = [];
    try {
      const devRes = await fetch(
        `${SB_URL}/rest/v1/mining_devices?user_id=eq.${u.id}&select=*`,
        { headers: readHeaders }
      );
      if (devRes.ok) {
        const devs = await devRes.json();
        if (Array.isArray(devs)) {
          devices = devs.map((d: Record<string, unknown>) => ({
            id: d.id,
            deviceId: d.device_id,
            isRunning: d.is_running || false,
            startTime: d.start_time || null,
            duration: d.duration || null,
            totalEarned: Number(d.total_earned) || 0,
            isGift: d.is_gift || false,
          }));
        }
      }
    } catch { /* صامت */ }

    // تحميل المعاملات
    try {
      const txRes = await fetch(
        `${SB_URL}/rest/v1/mining_transactions?user_id=eq.${u.id}&select=*`,
        { headers: readHeaders }
      );
      if (txRes.ok) {
        const txs = await txRes.json();
        if (Array.isArray(txs) && txs.length > 0) {
          const localTx = JSON.parse(localStorage.getItem('cm_transactions') || '[]');
          const appTx = txs.map((t: Record<string, unknown>) => ({
            id: t.id, userId: t.user_id, type: t.type,
            amount: Number(t.amount), status: t.status || 'pending',
            date: t.created_at || Date.now(), walletAddress: t.wallet_address || undefined,
          }));
          for (const lt of localTx) {
            if (!appTx.find((t: Record<string, unknown>) => t.id === lt.id)) appTx.push(lt);
          }
          originalSetItem.call(localStorage, 'cm_transactions', JSON.stringify(appTx));
        }
      }
    } catch { /* صامت */ }

    // تحميل الإشعارات
    try {
      const notifRes = await fetch(
        `${SB_URL}/rest/v1/mining_notifications?user_id=eq.${u.id}&select=*`,
        { headers: readHeaders }
      );
      if (notifRes.ok) {
        const notifs = await notifRes.json();
        if (Array.isArray(notifs) && notifs.length > 0) {
          const localNotif = JSON.parse(localStorage.getItem('cm_notifications') || '[]');
          const appNotif = notifs.map((n: Record<string, unknown>) => ({
            id: n.id, userId: n.user_id, title: n.title, message: n.message,
            type: n.type || 'info', date: n.created_at || Date.now(), read: n.is_read || false,
          }));
          for (const ln of localNotif) {
            if (!appNotif.find((n: Record<string, unknown>) => n.id === ln.id)) appNotif.push(ln);
          }
          originalSetItem.call(localStorage, 'cm_notifications', JSON.stringify(appNotif));
        }
      }
    } catch { /* صامت */ }

    // تحميل الرسائل
    try {
      const msgRes = await fetch(
        `${SB_URL}/rest/v1/mining_messages?or=(from_user.eq.${u.id},to_user.eq.${u.id})&select=*`,
        { headers: readHeaders }
      );
      if (msgRes.ok) {
        const msgs = await msgRes.json();
        if (Array.isArray(msgs) && msgs.length > 0) {
          const localMsg = JSON.parse(localStorage.getItem('cm_chat') || '[]');
          const appMsg = msgs.map((m: Record<string, unknown>) => ({
            id: m.id, from: m.from_user, to: m.to_user, message: m.message,
            date: m.created_at || Date.now(), read: m.is_read || false,
          }));
          for (const lm of localMsg) {
            if (!appMsg.find((m: Record<string, unknown>) => m.id === lm.id)) appMsg.push(lm);
          }
          originalSetItem.call(localStorage, 'cm_chat', JSON.stringify(appMsg));
        }
      }
    } catch { /* صامت */ }

    // بناء كائن المستخدم
    const userObj: Record<string, unknown> = {
      id: u.id,
      username: u.username,
      email: u.email,
      password: u.password || password,
      balance: Number(u.balance) || 0,
      devices: devices,
      isAdmin: u.is_admin || false,
      isNew: false,
      createdAt: u.created_at || Date.now(),
      referralCode: u.referral_code || '',
      referredBy: u.referred_by || undefined,
      referralEarnings: Number(u.referral_earnings) || 0,
      totalDeposits: Number(u.total_deposits) || 0,
      totalWithdrawals: Number(u.total_withdrawals) || 0,
      lastLogin: Date.now(),
    };

    // حفظ في localStorage
    const localUsers = JSON.parse(localStorage.getItem('cm_users') || '[]');
    const existingIdx = localUsers.findIndex((lu: Record<string, unknown>) => lu.id === u.id || lu.email === u.email);
    if (existingIdx >= 0) localUsers[existingIdx] = userObj;
    else localUsers.push(userObj);
    originalSetItem.call(localStorage, 'cm_users', JSON.stringify(localUsers));
    originalSetItem.call(localStorage, 'cm_session', u.id as string);

    console.log('[Supabase] ✅ تسجيل دخول من Supabase:', u.username);
    return userObj;
  } catch (e) {
    console.log('[Supabase] ⚠️ فشل تسجيل الدخول من Supabase:', e);
    return null;
  }
}

// ============================================================
// =========== حفظ فوري عند التسجيل ===========================
// ============================================================

export async function immediateUserSync(user: Record<string, unknown>) {
  try {
    // حفظ المستخدم فوراً
    const row = {
      id: user.id,
      username: user.username,
      email: user.email,
      password: user.password || '',
      balance: user.balance || 0,
      is_admin: user.isAdmin || false,
      referral_code: user.referralCode || '',
      referred_by: user.referredBy || null,
      referral_earnings: user.referralEarnings || 0,
      total_deposits: user.totalDeposits || 0,
      total_withdrawals: user.totalWithdrawals || 0,
      created_at: user.createdAt || Date.now(),
      last_login: user.lastLogin || Date.now(),
      updated_at: new Date().toISOString()
    };
    await fetch(`${SB_URL}/rest/v1/mining_users`, {
      method: 'POST',
      headers: uploadHeaders,
      body: JSON.stringify([row])
    });

    // حفظ الأجهزة فوراً (الهدية)
    if (Array.isArray(user.devices)) {
      const deviceRows = (user.devices as Record<string, unknown>[]).map((d: Record<string, unknown>) => ({
        id: d.id,
        user_id: user.id,
        device_id: d.deviceId,
        is_running: d.isRunning || false,
        start_time: d.startTime || null,
        duration: d.duration || null,
        total_earned: d.totalEarned || 0,
        is_gift: d.isGift || false,
        updated_at: new Date().toISOString()
      }));
      if (deviceRows.length > 0) {
        await fetch(`${SB_URL}/rest/v1/mining_devices`, {
          method: 'POST',
          headers: uploadHeaders,
          body: JSON.stringify(deviceRows)
        });
      }
    }

    console.log('[Supabase] ✅ تم حفظ المستخدم فوراً في قاعدة البيانات');
  } catch (e) {
    console.log('[Supabase] ⚠️ فشل الحفظ الفوري:', e);
  }
}

// حفظ فوري عند تحديث بيانات المستخدم (شراء، تعدين، إلخ)
export async function immediateDataSync() {
  // مسح الكاش لفرض إعادة الرفع
  lastHash['users'] = '';
  lastHash['transactions'] = '';
  lastHash['messages'] = '';
  lastHash['notifications'] = '';
  try {
    await syncUsers();
    await syncTransactions();
    await syncMessages();
    await syncNotifications();
    console.log('[Supabase] ✅ مزامنة فورية تمت بنجاح');
  } catch (e) {
    console.log('[Supabase] ⚠️ فشل المزامنة الفورية:', e);
    // إعادة المحاولة بعد ثانية
    setTimeout(async () => {
      try {
        lastHash['users'] = '';
        lastHash['transactions'] = '';
        await syncUsers();
        await syncTransactions();
        console.log('[Supabase] ✅ إعادة المزامنة نجحت');
      } catch { /* صامت */ }
    }, 1000);
  }
}

// ============================================================
// =========== استعادة الجلسة من Supabase Auth =================
// ============================================================

export async function restoreAuthSession(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user?.email) {
      const email = data.session.user.email;
      // تحقق إذا الجلسة موجودة محلياً
      const sessionId = localStorage.getItem('cm_session');
      if (sessionId) return true; // جلسة محلية موجودة

      // ابحث عن المستخدم في Supabase
      const res = await fetch(
        `${SB_URL}/rest/v1/mining_users?email=eq.${encodeURIComponent(email)}&select=*`,
        { headers: readHeaders }
      );
      if (res.ok) {
        const users = await res.json();
        if (Array.isArray(users) && users.length > 0) {
          const u = users[0];
          // حمّل بياناته الكاملة
          const fullUser = await loginViaSupabase(email, u.password);
          if (fullUser) {
            console.log('[Supabase] ✅ تم استعادة الجلسة تلقائياً:', u.username);
            return true;
          }
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

// ============================================================
// =========== بدء الاتصال والمزامنة ===========================
// ============================================================

(async () => {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/mining_users?select=id&limit=1`, { headers: readHeaders });
    if (res.ok || res.status === 200 || res.status === 406) {
      connected = true;
      console.log('[Supabase] ✅ متصل بنجاح!');
      
      // رفع البيانات المحلية الموجودة أولاً
      await pushLocalChanges();
      
      // دورة المزامنة: رفع التغييرات المحلية كل 5 ثوانٍ
      setInterval(pushLocalChanges, 5000);
      
      // سحب التحديثات من Supabase كل 10 ثوانٍ
      setInterval(pullFromSupabase, 10000);
    } else {
      connected = true;
      setInterval(pushLocalChanges, 10000);
      setInterval(pullFromSupabase, 15000);
    }
  } catch {
    console.log('[Supabase] ⚠️ يعمل بدون اتصال');
  }
})();
