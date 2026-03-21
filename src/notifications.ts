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
      icon: '/logo.png',
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