// notifications.ts
import { supabase } from "./supabaseClient";

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
  try {
    // الحصول على المستخدم الحالي
    const currentUserStr = localStorage.getItem('currentUser');
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : {};
    
    // حفظ الإشعار في localStorage للمستخدم المحدد فقط
    const existingNotifsStr = localStorage.getItem(`notifications_${userId}`);
    const existingNotifs = existingNotifsStr ? JSON.parse(existingNotifsStr) : [];
    
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
    if (currentUser && currentUser.id === userId && Notification.permission === 'granted') {
      showBrowserNotification(title, body, type);
    }

    // إرسال إلى Supabase إذا كان متاحاً
    if (supabase && supabase.from) {
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
  } catch (error) {
    console.error('Error in sendNotificationToUser:', error);
  }
}

// إظهار إشعار المتصفح
function showBrowserNotification(title: string, body: string, type: string) {
  if (Notification.permission !== 'granted') return;

  try {
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
  } catch (error) {
    console.error('Error showing notification:', error);
  }
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

// إرسال إشعار للمشرفين (مع التحقق من وجود المشرفين)
export async function sendNotificationToAdmins(title: string, body: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
  try {
    const usersStr = localStorage.getItem('users');
    if (!usersStr) return;
    
    const users = JSON.parse(usersStr);
    const admins = users.filter((u: any) => u.isAdmin === true);
    
    for (const admin of admins) {
      await sendNotificationToUser(admin.id, title, body, type);
    }
  } catch (error) {
    console.error('Error sending notification to admins:', error);
  }
}

// إرسال إشعار عند استلام رسالة جديدة
export function notifyNewMessage(recipientId: string, senderName: string, message: string) {
  try {
    // لا نرسل إشعار إذا كان المرسل هو نفسه المستقبل
    const currentUserStr = localStorage.getItem('currentUser');
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : {};
    
    if (currentUser && currentUser.id === recipientId) {
      return;
    }
    
    sendNotificationToUser(
      recipientId,
      `📨 رسالة جديدة من ${senderName}`,
      message.length > 50 ? message.substring(0, 50) + '...' : message,
      'info'
    );
  } catch (error) {
    console.error('Error in notifyNewMessage:', error);
  }
}

// إرسال إشعار عند تحديث المعاملة
export function notifyTransactionUpdate(userId: string, type: 'deposit' | 'withdraw', status: string, amount: number) {
  try {
    const statusText = status === 'approved' ? 'تمت الموافقة' : status === 'rejected' ? 'تم الرفض' : 'قيد المراجعة';
    const typeText = type === 'deposit' ? 'إيداع' : 'سحب';
    
    sendNotificationToUser(
      userId,
      `💰 تحديث المعاملة`,
      `${typeText} بمبلغ $${amount.toFixed(2)} - الحالة: ${statusText}`,
      status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'info'
    );
  } catch (error) {
    console.error('Error in notifyTransactionUpdate:', error);
  }
}

// إرسال إشعار عند جمع الأرباح
export function notifyProfitCollected(userId: string, amount: number, deviceName: string) {
  try {
    sendNotificationToUser(
      userId,
      `💰 تم جمع الأرباح!`,
      `تم جمع $${amount.toFixed(2)} من جهاز ${deviceName}`,
      'success'
    );
  } catch (error) {
    console.error('Error in notifyProfitCollected:', error);
  }
}

// إرسال إشعار عند بدء التعدين
export function notifyMiningStarted(userId: string, deviceName: string, duration: number) {
  try {
    sendNotificationToUser(
      userId,
      `⛏️ بدء التعدين`,
      `تم تشغيل جهاز ${deviceName} لمدة ${duration} أيام`,
      'success'
    );
  } catch (error) {
    console.error('Error in notifyMiningStarted:', error);
  }
}

// إرسال إشعار عند انتهاء التعدين
export function notifyMiningCompleted(userId: string, deviceName: string, profit: number) {
  try {
    sendNotificationToUser(
      userId,
      `✅ انتهاء التعدين`,
      `جهاز ${deviceName} انتهى من التعدين. الربح: $${profit.toFixed(2)}`,
      'warning'
    );
  } catch (error) {
    console.error('Error in notifyMiningCompleted:', error);
  }
}

// إرسال إشعار عند شراء جهاز
export function notifyDevicePurchased(userId: string, deviceName: string, price: number) {
  try {
    sendNotificationToUser(
      userId,
      `🛒 شراء جهاز جديد`,
      `تم شراء جهاز ${deviceName} بمبلغ $${price}`,
      'success'
    );
  } catch (error) {
    console.error('Error in notifyDevicePurchased:', error);
  }
}

// إرسال إشعار عند ترقية جهاز
export function notifyDeviceUpgraded(userId: string, oldDevice: string, newDevice: string) {
  try {
    sendNotificationToUser(
      userId,
      `⬆️ ترقية الجهاز`,
      `تمت ترقية الجهاز من ${oldDevice} إلى ${newDevice}`,
      'success'
    );
  } catch (error) {
    console.error('Error in notifyDeviceUpgraded:', error);
  }
}

// إرسال إشعار عند استلام إحالة جديدة
export function notifyNewReferral(userId: string, referrerName: string) {
  try {
    sendNotificationToUser(
      userId,
      `👥 إحالة جديدة`,
      `${referrerName} سجل باستخدام كود الإحالة الخاص بك!`,
      'success'
    );
  } catch (error) {
    console.error('Error in notifyNewReferral:', error);
  }
}

// إعادة تعيين عدادات الإشعارات
export function resetNotificationCounters() {
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'RESET_COUNTERS'
      });
    }
  } catch (error) {
    console.error('Error resetting counters:', error);
  }
}

// الحصول على إشعارات المستخدم
export function getUserNotifications(userId: string): any[] {
  try {
    const notificationsStr = localStorage.getItem(`notifications_${userId}`);
    return notificationsStr ? JSON.parse(notificationsStr) : [];
  } catch (error) {
    console.error('Error getting user notifications:', error);
    return [];
  }
}

// تحديث حالة قراءة الإشعارات
export function markNotificationsAsRead(userId: string) {
  try {
    const notificationsStr = localStorage.getItem(`notifications_${userId}`);
    if (!notificationsStr) return;
    
    const notifications = JSON.parse(notificationsStr);
    const updated = notifications.map((n: any) => ({ ...n, read: true }));
    localStorage.setItem(`notifications_${userId}`, JSON.stringify(updated));
  } catch (error) {
    console.error('Error marking notifications as read:', error);
  }
}

// الحصول على عدد الإشعارات غير المقروءة
export function getUnreadNotificationsCount(userId: string): number {
  try {
    const notificationsStr = localStorage.getItem(`notifications_${userId}`);
    if (!notificationsStr) return 0;
    
    const notifications = JSON.parse(notificationsStr);
    return notifications.filter((n: any) => !n.read).length;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}