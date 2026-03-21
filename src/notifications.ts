// نظام إشعارات CryptoMine Pro - إشعارات داخلية + صوت + متصفح

let notifPermission: NotificationPermission = 'default';
export function getPermissionState() { return notifPermission; }

// ===== صوت التنبيه =====
function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // النغمة الأولى
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc1.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 0.3);

    // النغمة الثانية (أعلى)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.frequency.setValueAtTime(1174, audioCtx.currentTime + 0.15); // D6
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0, audioCtx.currentTime);
    gain2.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    osc2.start(audioCtx.currentTime + 0.15);
    osc2.stop(audioCtx.currentTime + 0.5);

    // النغمة الثالثة (أعلى)
    const osc3 = audioCtx.createOscillator();
    const gain3 = audioCtx.createGain();
    osc3.connect(gain3);
    gain3.connect(audioCtx.destination);
    osc3.frequency.setValueAtTime(1318, audioCtx.currentTime + 0.3); // E6
    osc3.type = 'sine';
    gain3.gain.setValueAtTime(0, audioCtx.currentTime);
    gain3.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.3);
    gain3.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.7);
    osc3.start(audioCtx.currentTime + 0.3);
    osc3.stop(audioCtx.currentTime + 0.7);

    // تنظيف بعد ثانية
    setTimeout(() => audioCtx.close(), 1000);
  } catch (e) {
    console.log('[Sound] لا يمكن تشغيل الصوت');
  }
}

// ===== إشعار منبثق داخل التطبيق =====
let activePopups: HTMLDivElement[] = [];

function showInAppNotification(title: string, body: string, type: 'message' | 'notification' = 'message') {
  // تشغيل الصوت
  playNotificationSound();

  // اهتزاز الهاتف (إذا مدعوم)
  try {
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  } catch (e) { /* ignore */ }

  // إنشاء النافذة المنبثقة
  const popup = document.createElement('div');
  popup.className = 'notif-popup';
  
  const icon = type === 'message' ? '💬' : '🔔';
  const gradient = type === 'message' 
    ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' 
    : 'linear-gradient(135deg, #f59e0b, #ef4444)';

  popup.innerHTML = `
    <div style="
      position: fixed;
      top: ${20 + activePopups.length * 90}px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99999;
      width: 90%;
      max-width: 380px;
      animation: notifSlideIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
    ">
      <div style="
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98));
        border: 1px solid rgba(99, 102, 241, 0.4);
        border-radius: 16px;
        padding: 16px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(99, 102, 241, 0.2);
        backdrop-filter: blur(20px);
      ">
        <div style="
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: ${gradient};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
          animation: notifPulse 1s ease-in-out infinite;
        ">${icon}</div>
        <div style="flex: 1; min-width: 0;">
          <div style="
            color: white;
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 4px;
            direction: rtl;
          ">${title}</div>
          <div style="
            color: rgba(203, 213, 225, 0.9);
            font-size: 12px;
            line-height: 1.5;
            direction: rtl;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          ">${body}</div>
        </div>
        <button onclick="this.closest('.notif-popup').remove()" style="
          background: rgba(255,255,255,0.1);
          border: none;
          color: rgba(255,255,255,0.6);
          width: 28px;
          height: 28px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        ">✕</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);
  activePopups.push(popup);

  // إزالة تلقائية بعد 6 ثوانٍ
  setTimeout(() => {
    popup.style.transition = 'opacity 0.5s, transform 0.5s';
    popup.style.opacity = '0';
    popup.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      popup.remove();
      activePopups = activePopups.filter(p => p !== popup);
    }, 500);
  }, 6000);
}

// ===== تسجيل Service Worker =====
export async function registerServiceWorker() {
  try {
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.register('/sw.js');
      console.log('[SW] ✅ Service Worker مسجل');
    }
  } catch (error) {
    console.log('[SW] Service Worker غير مدعوم');
  }
  return null;
}

// ===== طلب إذن الإشعارات =====
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') { notifPermission = 'granted'; return true; }
    if (Notification.permission === 'denied') { notifPermission = 'denied'; return false; }
    const permission = await Notification.requestPermission();
    notifPermission = permission;
    return permission === 'granted';
  } catch (error) {
    return false;
  }
}

// ===== إرسال إشعار (داخلي + متصفح) =====
export function sendBrowserNotification(title: string, body: string, tag?: string) {
  // 1. إشعار داخلي دائماً (مع صوت)
  const type = title.includes('💬') || title.includes('رسالة') ? 'message' : 'notification';
  showInAppNotification(title, body, type);

  // 2. إشعار المتصفح (إذا مسموح)
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body, icon: '/icon-192.png', tag: tag || 'msg-' + Date.now(),
        });
      });
    } else {
      new Notification(title, { body, icon: '/icon-192.png', tag: tag || 'msg-' + Date.now() });
    }
  } catch (error) { /* صامت */ }
}

// ===== مراقبة الرسائل الجديدة =====
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
    const senderName = isAdmin ? 'مستخدم' : 'الدعم الفني';
    sendBrowserNotification(
      `💬 رسالة جديدة من ${senderName}`,
      latestMsg.message.substring(0, 100),
      'chat-' + latestMsg.id
    );
  }
  lastMessageCount = userMessages.length;
}

export function checkForNewNotifications(notifications: any[], currentUserId: string) {
  const userNotifs = notifications.filter((n: any) => n.userId === currentUserId && !n.isRead);

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

// ===== إعادة تعيين العدادات =====
export function resetNotificationCounters() {
  lastMessageCount = 0;
  lastNotificationCount = 0;
}
