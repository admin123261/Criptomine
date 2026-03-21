// store.ts - أضف هذه الدوال في نهاية الملف

// الحصول على عدد الرسائل غير المقروءة
export function getUnreadCount(userId: string): number {
  try {
    const messages = getChatMessages();
    return messages.filter((m: any) => m.to === userId && !m.read).length;
  } catch (error) {
    return 0;
  }
}

// دالة لإرسال إشعار بسيط
function showSimpleNotification(title: string, message: string) {
  try {
    if (Notification.permission === 'granted') {
      new Notification(title, { body: message, icon: '/logo.png' });
    }
  } catch (error) {
    console.log('Notification error:', error);
  }
}

// تعديل دالة sendMessage
export function sendMessage(from: string, to: string, message: string) {
  try {
    const messages = getChatMessages();
    const newMessage = {
      id: Date.now().toString(),
      from,
      to,
      message,
      date: Date.now(),
      read: false
    };
    
    messages.push(newMessage);
    localStorage.setItem('chat_messages', JSON.stringify(messages));
    
    // إشعار للمستقبل فقط
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser && from !== to) {
      const user = JSON.parse(currentUser);
      if (user.id === to) {
        const senderName = from === 'admin001' ? 'الدعم الفني' : 'مستخدم';
        showSimpleNotification(`📨 رسالة من ${senderName}`, message.substring(0, 50));
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Send message error:', error);
    return { success: false, error: 'حدث خطأ' };
  }
}

// تعديل دالة approveTransaction
export function approveTransaction(txId: string) {
  try {
    const transactions = getTransactions();
    const txIndex = transactions.findIndex(t => t.id === txId);
    if (txIndex === -1) return { success: false };
    
    const tx = transactions[txIndex];
    if (tx.status !== 'pending') return { success: false };
    
    tx.status = 'approved';
    
    const users = getUsers();
    const user = users.find(u => u.id === tx.userId);
    
    if (user && tx.type === 'deposit') {
      user.balance += tx.amount;
      user.totalDeposits += tx.amount;
      updateUser(user);
      showSimpleNotification('💰 إيداع مؤكد', `تم إيداع $${tx.amount.toFixed(2)} في حسابك`);
    } else if (user && tx.type === 'withdraw') {
      user.totalWithdrawals += tx.amount;
      updateUser(user);
      showSimpleNotification('💰 سحب مؤكد', `تم سحب $${tx.amount.toFixed(2)} من حسابك`);
    }
    
    localStorage.setItem('transactions', JSON.stringify(transactions));
    return { success: true };
  } catch (error) {
    console.error('Approve error:', error);
    return { success: false };
  }
}

// تعديل دالة rejectTransaction
export function rejectTransaction(txId: string) {
  try {
    const transactions = getTransactions();
    const txIndex = transactions.findIndex(t => t.id === txId);
    if (txIndex === -1) return { success: false };
    
    const tx = transactions[txIndex];
    if (tx.status !== 'pending') return { success: false };
    
    tx.status = 'rejected';
    localStorage.setItem('transactions', JSON.stringify(transactions));
    
    showSimpleNotification('❌ معاملة مرفوضة', `المعاملة بمبلغ $${tx.amount.toFixed(2)} تم رفضها`);
    
    return { success: true };
  } catch (error) {
    console.error('Reject error:', error);
    return { success: false };
  }
}

// تعديل دالة collectProfit
export function collectProfit(userId: string, deviceId: string) {
  try {
    const users = getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false };
    
    const device = user.devices.find(d => d.id === deviceId);
    if (!device) return { success: false };
    
    const profit = calcProfit(device);
    if (!profit.finished) return { success: false };
    
    const amount = profit.total;
    user.balance += amount;
    device.totalEarned += amount;
    device.isRunning = false;
    device.startTime = undefined;
    device.duration = undefined;
    
    updateUser(user);
    
    const template = getDeviceTemplate(device.deviceId);
    showSimpleNotification('💰 جمع الأرباح', `تم جمع $${amount.toFixed(2)} من جهاز ${device.isGift ? 'الهدية' : template.nameAr}`);
    
    return { success: true, profit: amount };
  } catch (error) {
    console.error('Collect profit error:', error);
    return { success: false };
  }
}

// تعديل دالة startMining
export function startMining(userId: string, deviceId: string, days: number) {
  try {
    const users = getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false };
    
    const device = user.devices.find(d => d.id === deviceId);
    if (!device) return { success: false };
    
    if (device.isRunning) return { success: false };
    if (device.isGift && device.totalEarned > 0) return { success: false };
    
    device.isRunning = true;
    device.startTime = Date.now();
    device.duration = days;
    
    updateUser(user);
    
    const template = getDeviceTemplate(device.deviceId);
    showSimpleNotification('⛏️ بدء التعدين', `تم تشغيل جهاز ${device.isGift ? 'الهدية' : template.nameAr} لمدة ${days} أيام`);
    
    return { success: true };
  } catch (error) {
    console.error('Start mining error:', error);
    return { success: false };
  }
}