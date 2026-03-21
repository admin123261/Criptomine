// مراقبة الإشعارات الجديدة للمستخدم الحالي فقط
useEffect(() => {
  if (!user) return;
  
  let lastNotifCount = getUnreadNotificationsCount(user.id);
  let lastMessageTime = 0;
  
  const checkNewNotifications = () => {
    // التحقق من الإشعارات الجديدة للمستخدم الحالي فقط
    const currentNotifCount = getUnreadNotificationsCount(user.id);
    
    if (currentNotifCount > lastNotifCount) {
      const notifications = getUserNotifications(user.id);
      const newNotifs = notifications.filter(n => !n.read && n.date > Date.now() - 5000);
      
      if (newNotifs.length > 0) {
        const latestNotif = newNotifs[0];
        // عرض إشعار المتصفح للمستخدم الحالي فقط
        if (Notification.permission === 'granted') {
          new Notification(latestNotif.title, {
            body: latestNotif.message,
            icon: '/logo.png',
            vibrate: [200, 100, 200]
          });
        }
        
        // عرض توست داخل التطبيق
        setNotification(latestNotif.message);
        setTimeout(() => setNotification(null), 3000);
      }
      
      lastNotifCount = currentNotifCount;
    }
    
    // التحقق من الرسائل الجديدة للمستخدم الحالي فقط (الرسائل الواردة فقط)
    const messages = store.getChatMessages();
    const newMessages = messages.filter(m => 
      m.to === user.id && 
      !m.read && 
      m.date > lastMessageTime
    );
    
    if (newMessages.length > 0) {
      newMessages.forEach(msg => {
        const sender = msg.from === 'admin001' ? 'الدعم الفني' : 'مستخدم';
        if (Notification.permission === 'granted') {
          new Notification(`📨 رسالة جديدة من ${sender}`, {
            body: msg.message.length > 50 ? msg.message.substring(0, 50) + '...' : msg.message,
            icon: '/logo.png'
          });
        }
        setNotification(`رسالة جديدة من ${sender}`);
        setTimeout(() => setNotification(null), 3000);
        
        // تحديث وقت آخر رسالة
        if (msg.date > lastMessageTime) {
          lastMessageTime = msg.date;
        }
      });
    }
  };
  
  const interval = setInterval(checkNewNotifications, 3000);
  return () => clearInterval(interval);
}, [user]);

// طلب إذن الإشعارات عند تسجيل الدخول (مع تأخير)
useEffect(() => {
  if (user) {
    const timer = setTimeout(() => {
      requestNotificationPermission();
    }, 5000);
    
    return () => clearTimeout(timer);
  }
}, [user]);