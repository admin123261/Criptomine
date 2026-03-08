// مزامنة ثنائية الاتجاه مع Supabase
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
const lastHash: Record<string, string> = {};

function hash(data: string): string {
  let h = 0;
  for (let i = 0; i < data.length; i++) {
    const ch = data.charCodeAt(i);
    h = ((h << 5) - h) + ch;
    h |= 0;
  }
  return h.toString();
}

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

    // إضافة مستخدمين محليين غير موجودين في Supabase
    for (const lu of localUsers) {
      if (!appUsers.find((u: Record<string, unknown>) => u.id === lu.id || u.email === lu.email)) {
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

    console.log('[Supabase] ✅ تم تحميل البيانات بنجاح (' + appUsers.length + ' مستخدم)');
  } catch (e) {
    console.log('[Supabase] ⚠️ تعذر تحميل البيانات:', e);
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

async function syncAll() {
  if (!connected || isLoadingFromSupabase) return;
  await syncUsers();
  await syncTransactions();
  await syncMessages();
  await syncNotifications();
}

// اعتراض localStorage.setItem لمزامنة فورية
Object.getPrototypeOf(localStorage).setItem = function(key: string, value: string) {
  originalSetItem.call(this, key, value);
  if (connected && !isLoadingFromSupabase) {
    if (key === 'cm_users') syncUsers();
    if (key === 'cm_transactions') syncTransactions();
    if (key === 'cm_chat') syncMessages();
    if (key === 'cm_notifications') syncNotifications();
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

// بدء الاتصال والمزامنة الدورية
(async () => {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/mining_users?select=id&limit=1`, { headers: readHeaders });
    if (res.ok || res.status === 200 || res.status === 406) {
      connected = true;
      console.log('[Supabase] ✅ متصل بنجاح!');
      await syncAll();
      setInterval(syncAll, 5000);
    } else {
      connected = true;
      await syncAll();
      setInterval(syncAll, 10000);
    }
  } catch {
    console.log('[Supabase] ⚠️ يعمل بدون اتصال');
  }
})();
