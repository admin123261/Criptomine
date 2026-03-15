// نظام إشعارات المتصفح - CryptoMine Pro

let notifPermission: NotificationPermission = 'default';
export function getPermissionState() { return notifPermission; }

// تسجيل Service Worker
export async function registerServiceWorker() {
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[SW] ✅ Service Worker مسجل بنجاح');
      return registration;
    }
  } catch (error) {
    console.log('[SW] Service Worker غير مدعوم');
  }
  return null;
}

// طلب إذن الإشعارات
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (!('Notification' in window)) {
      console.log('[Notif] الإشعارات غير مدعومة في هذا المتصفح');
      return false;
    }

    if (Notification.permission === 'granted') {
      notifPermission = 'granted';
      return true;
    }

    if (Notification.permission === 'denied') {
      notifPermission = 'denied';
      return false;
    }

    const permission = await Notification.requestPermission();
    notifPermission = permission;
    return permission === 'granted';
  } catch (error) {
    console.log('[Notif] خطأ في طلب إذن الإشعارات');
    return false;
  }
}

// إرسال إشعار على الهاتف/المتصفح
export function sendBrowserNotification(title: string, body: string, tag?: string) {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    // إذا التطبيق في الخلفية أو التبويب غير نشط
    if (document.hidden || !document.hasFocus()) {
      // استخدام Service Worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            body: body,
            icon: '/icon-192.png',
            tag: tag || 'msg-' + Date.now(),
          });
        });
      } else {
        // Fallback: إشعار عادي
        new Notification(title, {
          body: body,
          icon: '/icon-192.png',
          tag: tag || 'msg-' + Date.now(),
        });
      }
    } else {
      // التطبيق مفتوح - إشعار عادي فقط
      new Notification(title, {
        body: body,
        icon: '/icon-192.png',
        tag: tag || 'msg-' + Date.now(),
      });
    }
  } catch (error) {
    console.log('[Notif] خطأ في إرسال الإشعار');
  }
}

// التحقق من حالة الإشعارات
export function getNotificationStatus(): string {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

// مراقبة الرسائل الجديدة
let lastMessageCount = 0;
let lastNotificationCount = 0;

export function checkForNewMessages(messages: any[], currentUserId: string, isAdmin: boolean) {
  const userMessages = messages.filter(m => {
    if (isAdmin) {
      return m.toUser === 'admin' && !m.isRead;
    } else {
      return m.toUser === currentUserId && !m.isRead;
    }
  });

  if (userMessages.length > lastMessageCount && lastMessageCount > 0) {
    const latestMsg = userMessages[userMessages.length - 1];
    const senderName = isAdmin ? 'مستخدم جديد' : 'الدعم الفني';
    sendBrowserNotification(
      `💬 رسالة جديدة من ${senderName}`,
      latestMsg.message.substring(0, 100),
      'chat-' + latestMsg.id
    );
  }
  lastMessageCount = userMessages.length;
}

export function checkForNewNotifications(notifications: any[], currentUserId: string) {
  const userNotifs = notifications.filter(n => n.userId === currentUserId && !n.isRead);

  if (userNotifs.length > lastNotificationCount && lastNotificationCount > 0) {
    const latestNotif = userNotifs[userNotifs.length - 1];
    sendBrowserNotification(
      `🔔 ${latestNotif.title}`,
      latestNotif.message.substring(0, 100),
      'notif-' + latestNotif.id
    );
  }
  lastNotificationCount = userNotifs.length;
}

// إعادة تعيين العدادات (عند تسجيل الدخول)
export function resetNotificationCounters() {
  lastMessageCount = 0;
  lastNotificationCount = 0;
}
