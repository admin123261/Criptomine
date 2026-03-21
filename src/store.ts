// store.ts - أضف هذه الدوال البسيطة في البداية

// دالة بسيطة لإرسال إشعار (تجنب الأخطاء)
function safeNotify(title: string, message: string) {
  try {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser && Notification.permission === 'granted') {
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
    
    // إرسال إشعار للمستقبل فقط
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (from !== to && to === currentUser.id) {
      const users = getUsers();
      const sender = users.find(u => u.id === from);
      const senderName = sender ? sender.username : (from === 'admin001' ? 'الدعم الفني' : 'مستخدم');
      safeNotify(`📨 رسالة جديدة من ${senderName}`, message.substring(0, 50));
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error: 'حدث خطأ' };
  }
}

// تعديل دالة approveTransaction
export function approveTransaction(txId: string) {
  try {
    const transactions = getTransactions();
    const txIndex = transactions.findIndex(t => t.id === txId);
    if (txIndex === -1) return { success: false, error: 'Transaction not found' };
    
    const tx = transactions[txIndex];
    if (tx.status !== 'pending') return { success: false, error: 'Transaction already processed' };
    
    tx.status = 'approved';
    
    const users = getUsers();
    const user = users.find(u => u.id === tx.userId);
    
    if (user && tx.type === 'deposit') {
      user.balance += tx.amount;
      user.totalDeposits += tx.amount;
      updateUser(user);
      safeNotify(`💰 تم تأكيد الإيداع`, `تم إيداع $${tx.amount.toFixed(2)} في حسابك`);
    } else if (user && tx.type === 'withdraw') {
      user.totalWithdrawals += tx.amount;
      updateUser(user);
      safeNotify(`💰 تم تأكيد السحب`, `تم سحب $${tx.amount.toFixed(2)} من حسابك`);
    }
    
    localStorage.setItem('transactions', JSON.stringify(transactions));
    
    return { success: true };
  } catch (error) {
    console.error('Error approving transaction:', error);
    return { success: false, error: 'حدث خطأ' };
  }
}

// تعديل دالة rejectTransaction
export function rejectTransaction(txId: string) {
  try {
    const transactions = getTransactions();
    const txIndex = transactions.findIndex(t => t.id === txId);
    if (txIndex === -1) return { success: false, error: 'Transaction not found' };
    
    const tx = transactions[txIndex];
    if (tx.status !== 'pending') return { success: false, error: 'Transaction already processed' };
    
    tx.status = 'rejected';
    localStorage.setItem('transactions', JSON.stringify(transactions));
    
    safeNotify(`❌ تم رفض المعاملة`, `المعاملة بمبلغ $${tx.amount.toFixed(2)} تم رفضها`);
    
    return { success: true };
  } catch (error) {
    console.error('Error rejecting transaction:', error);
    return { success: false, error: 'حدث خطأ' };
  }
}

// تعديل دالة collectProfit
export function collectProfit(userId: string, deviceId: string) {
  try {
    const users = getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'User not found' };
    
    const device = user.devices.find(d => d.id === deviceId);
    if (!device) return { success: false, error: 'Device not found' };
    
    const profit = calcProfit(device);
    if (!profit.finished) return { success: false, error: 'Mining not finished yet' };
    
    const amount = profit.total;
    user.balance += amount;
    device.totalEarned += amount;
    device.isRunning = false;
    device.startTime = undefined;
    device.duration = undefined;
    
    updateUser(user);
    
    const template = getDeviceTemplate(device.deviceId);
    safeNotify(`💰 تم جمع الأرباح!`, `تم جمع $${amount.toFixed(2)} من جهاز ${device.isGift ? 'الهدية' : template.nameAr}`);
    
    return { success: true, profit: amount };
  } catch (error) {
    console.error('Error collecting profit:', error);
    return { success: false, error: 'حدث خطأ' };
  }
}

// تعديل دالة startMining
export function startMining(userId: string, deviceId: string, days: number) {
  try {
    const users = getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'User not found' };
    
    const device = user.devices.find(d => d.id === deviceId);
    if (!device) return { success: false, error: 'Device not found' };
    
    if (device.isRunning) return { success: false, error: 'Device already running' };
    if (device.isGift && device.totalEarned > 0) return { success: false, error: 'Gift device already used' };
    
    device.isRunning = true;
    device.startTime = Date.now();
    device.duration = days;
    
    updateUser(user);
    
    const template = getDeviceTemplate(device.deviceId);
    safeNotify(`⛏️ بدء التعدين`, `تم تشغيل جهاز ${device.isGift ? 'الهدية' : template.nameAr} لمدة ${days} أيام`);
    
    return { success: true };
  } catch (error) {
    console.error('Error starting mining:', error);
    return { success: false, error: 'حدث خطأ' };
  }
}