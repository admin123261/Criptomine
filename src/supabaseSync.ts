// مزامنة صامتة - ترسل البيانات لجداول منفصلة في Supabase
const SB_URL = 'https://kxbmckzwpkmzokcvtrjd.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4Ym1ja3p3cGttem9rY3Z0cmpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDI0NDAsImV4cCI6MjA4ODM3ODQ0MH0.OHI-ByGg4bCjclLq7jHd4GImDJ_fjuZQgpdj8F3x7Cw';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SB_KEY,
  'Authorization': `Bearer ${SB_KEY}`,
  'Prefer': 'resolution=merge-duplicates'
};

let connected = false;
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

// إرسال بيانات لجدول معين
async function upsertToTable(table: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  try {
    await fetch(`${SB_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(rows)
    });
  } catch { /* صامت */ }
}

// مزامنة المستخدمين
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

    // استخراج الأجهزة من المستخدمين
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

// مزامنة المعاملات
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

// مزامنة الرسائل
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

// مزامنة الإشعارات
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

// المزامنة الشاملة
async function syncAll() {
  if (!connected) return;
  await syncUsers();
  await syncTransactions();
  await syncMessages();
  await syncNotifications();
}

// اعتراض localStorage.setItem لمزامنة فورية
const originalSetItem = Object.getPrototypeOf(localStorage).setItem;
Object.getPrototypeOf(localStorage).setItem = function(key: string, value: string) {
  originalSetItem.call(this, key, value);
  if (connected) {
    if (key === 'cm_users') syncUsers();
    if (key === 'cm_transactions') syncTransactions();
    if (key === 'cm_chat') syncMessages();
    if (key === 'cm_notifications') syncNotifications();
  }
};

// بدء الاتصال
(async () => {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/mining_users?select=id&limit=1`, {
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
    });
    if (res.ok || res.status === 200 || res.status === 406) {
      connected = true;
      console.log('[Supabase] ✅ متصل بنجاح!');
      await syncAll();
      setInterval(syncAll, 5000);
    } else {
      console.log('[Supabase] ⚠️ Status:', res.status);
      // نحاول على أي حال
      connected = true;
      await syncAll();
      setInterval(syncAll, 10000);
    }
  } catch {
    console.log('[Supabase] ⚠️ يعمل بدون اتصال');
  }
})();
