// notifications.ts
import { supabase } from "./supabaseClient";

// تخزين الاشتراكات في localStorage مؤقتاً
interface PushSubscription {
  userId: string;
  subscription: any;
  endpoint: string;
}

let subscriptions: PushSubscription[] = [];

// تسجيل Service Worker
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully');
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
  return null;
}

// طلب إذن الإشعارات
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('هذا المتصفح لا يدعم الإشعارات');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// إرسال إشعار لمستخدم محدد
export async function sendNotificationToUser(
  userId: string, 
  title: string, 
  body: string, 
  type: 'success' | 'error' | 'info' | 'warning' = 'info'
): Promise<void> {
  // الحصول على المستخدم الحالي
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  
  // حفظ الإشعار في localStorage للمستخدم المحدد فقط
  const existingNotifs = JSON.parse(localStorage.getItem(`notifications_${userId}`) || '[]');
  const notification = {
    id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
    userId,
    title,
    message: body,
    type,
    date: Date.now(),
    read: false
  };
  
  existingNotifs.unshift(notification);
  const trimmedNotifs = existingNotifs.slice(0, 100);
  localStorage.setItem(`notifications_${userId}`, JSON.stringify(trimmedNotifs));

  // عرض الإشعار فقط إذا كان المستخدم الحالي هو المستهدف
  if (currentUser.id === userId && Notification.permission === 'granted') {
    showBrowserNotification(title, body, type);
  }

  // إرسال إلى Supabase إذا كان متاحاً (مع تصفية حسب user_id)
  try {
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message: body,
        type,
        read: false,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error saving notification to Supabase:', error);
  }
}

// إظهار إشعار المتصفح
function showBrowserNotification(title: string, body: string, type: string) {
  if (Notification.permission !== 'granted') return;

  const notification = new Notification(title, {
    body: body,
    icon: getIconForType(type),
    badge: '/badge.png',
    vibrate: [200, 100, 200],
    silent: false,
    tag: 'cryptomine_' + Date.now()
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  playNotificationSound();
}

// تشغيل صوت الإشعار
function playNotificationSound() {
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => console.log('Audio play failed:', e));
  } catch (error) {
    console.log('Audio not supported');
  }
}

// الحصول على أيقونة حسب نوع الإشعار
function getIconForType(type: string): string {
  switch(type) {
    case 'success': return '/success-icon.png';
    case 'error': return '/error-icon.png';
    case 'warning': return '/warning-icon.png';
    default: return '/logo.png';
  }
}

// إرسال إشعار للمشرفين (للمشرفين فقط)
export async function sendNotificationToAdmins(title: string, body: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const admins = users.filter((u: any) => u.isAdmin === true);
  
  for (const admin of admins) {
    await sendNotificationToUser(admin.id, title, body, type);
  }
}

// إرسال إشعار عند استلام رسالة جديدة (للمستقبل فقط)
export function notifyNewMessage(recipientId: string, senderName: string, message: string) {
  // لا نرسل إشعار إذا كان المرسل هو نفسه المستقبل
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  if (currentUser.id === recipientId) {
    // لا نرسل إشعار للمستخدم عن رسالته الخاصة
    return;
  }
  
  sendNotificationToUser(
    recipientId,
    `📨 رسالة جديدة من ${senderName}`,
    message.length > 50 ? message.substring(0, 50) + '...' : message,
    'info'
  );
}

// إرسال إشعار عند تحديث المعاملة (للمستخدم فقط)
export function notifyTransactionUpdate(userId: string, type: 'deposit' | 'withdraw', status: string, amount: number) {
  const statusText = status === 'approved' ? 'تمت الموافقة' : status === 'rejected' ? 'تم الرفض' : 'قيد المراجعة';
  const typeText = type === 'deposit' ? 'إيداع' : 'سحب';
  
  sendNotificationToUser(
    userId,
    `💰 تحديث المعاملة`,
    `${typeText} بمبلغ $${amount.toFixed(2)} - الحالة: ${statusText}`,
    status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'info'
  );
}

// إرسال إشعار عند جمع الأرباح (للمستخدم فقط)
export function notifyProfitCollected(userId: string, amount: number, deviceName: string) {
  sendNotificationToUser(
    userId,
    `💰 تم جمع الأرباح!`,
    `تم جمع $${amount.toFixed(2)} من جهاز ${deviceName}`,
    'success'
  );
}

// إرسال إشعار عند بدء التعدين (للمستخدم فقط)
export function notifyMiningStarted(userId: string, deviceName: string, duration: number) {
  sendNotificationToUser(
    userId,
    `⛏️ بدء التعدين`,
    `تم تشغيل جهاز ${deviceName} لمدة ${duration} أيام`,
    'success'
  );
}

// إرسال إشعار عند انتهاء التعدين (للمستخدم فقط)
export function notifyMiningCompleted(userId: string, deviceName: string, profit: number) {
  sendNotificationToUser(
    userId,
    `✅ انتهاء التعدين`,
    `جهاز ${deviceName} انتهى من التعدين. الربح: $${profit.toFixed(2)}`,
    'warning'
  );
}

// إرسال إشعار عند شراء جهاز (للمستخدم فقط)
export function notifyDevicePurchased(userId: string, deviceName: string, price: number) {
  sendNotificationToUser(
    userId,
    `🛒 شراء جهاز جديد`,
    `تم شراء جهاز ${deviceName} بمبلغ $${price}`,
    'success'
  );
}

// إرسال إشعار عند ترقية جهاز (للمستخدم فقط)
export function notifyDeviceUpgraded(userId: string, oldDevice: string, newDevice: string) {
  sendNotificationToUser(
    userId,
    `⬆️ ترقية الجهاز`,
    `تمت ترقية الجهاز من ${oldDevice} إلى ${newDevice}`,
    'success'
  );
}

// إرسال إشعار عند استلام إحالة جديدة (للمستخدم فقط)
export function notifyNewReferral(userId: string, referrerName: string) {
  sendNotificationToUser(
    userId,
    `👥 إحالة جديدة`,
    `${referrerName} سجل باستخدام كود الإحالة الخاص بك!`,
    'success'
  );
}

// إعادة تعيين عدادات الإشعارات
export function resetNotificationCounters() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'RESET_COUNTERS'
    });
  }
}

// الحصول على إشعارات المستخدم
export function getUserNotifications(userId: string): any[] {
  const notifications = JSON.parse(localStorage.getItem(`notifications_${userId}`) || '[]');
  return notifications;
}

// تحديث حالة قراءة الإشعارات
export function markNotificationsAsRead(userId: string) {
  const notifications = JSON.parse(localStorage.getItem(`notifications_${userId}`) || '[]');
  const updated = notifications.map((n: any) => ({ ...n, read: true }));
  localStorage.setItem(`notifications_${userId}`, JSON.stringify(updated));
}

// الحصول على عدد الإشعارات غير المقروءة
export function getUnreadNotificationsCount(userId: string): number {
  const notifications = JSON.parse(localStorage.getItem(`notifications_${userId}`) || '[]');
  return notifications.filter((n: any) => !n.read).length;
}