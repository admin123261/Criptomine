// notifications.ts - نسخة مبسطة وآمنة

// تسجيل Service Worker
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered');
    } catch (error) {
      console.error('Service Worker failed:', error);
    }
  }
}

// طلب إذن الإشعارات
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
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
export function sendNotificationToUser(userId: string, title: string, message: string, type: string = 'info') {
  try {
    // حفظ الإشعار في localStorage للمستخدم المحدد
    const key = `notifications_${userId}`;
    const existing = localStorage.getItem(key);
    const notifications = existing ? JSON.parse(existing) : [];
    
    const newNotification = {
      id: Date.now().toString(),
      userId,
      title,
      message,
      type,
      date: Date.now(),
      read: false
    };
    
    notifications.unshift(newNotification);
    localStorage.setItem(key, JSON.stringify(notifications.slice(0, 100)));
    
    // عرض الإشعار للمستخدم الحالي
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      const user = JSON.parse(currentUser);
      if (user.id === userId && Notification.permission === 'granted') {
        new Notification(title, { body: message, icon: '/logo.png' });
      }
    }
  } catch (error) {
    console.error('Notification error:', error);
  }
}

// الحصول على إشعارات المستخدم
export function getUserNotifications(userId: string) {
  try {
    const key = `notifications_${userId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
}

// الحصول على عدد الإشعارات غير المقروءة
export function getUnreadNotificationsCount(userId: string) {
  try {
    const notifications = getUserNotifications(userId);
    return notifications.filter((n: any) => !n.read).length;
  } catch (error) {
    return 0;
  }
}

// تحديد الإشعارات كمقروءة
export function markNotificationsAsRead(userId: string) {
  try {
    const notifications = getUserNotifications(userId);
    const updated = notifications.map((n: any) => ({ ...n, read: true }));
    localStorage.setItem(`notifications_${userId}`, JSON.stringify(updated));
  } catch (error) {
    console.error('Error marking read:', error);
  }
}

// إعادة تعيين العدادات
export function resetNotificationCounters() {
  // لا تفعل شيئاً
}