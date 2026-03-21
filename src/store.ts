// أضف هذه الاستيرادات في بداية ملف store.ts
import { 
  sendNotificationToUser, 
  sendNotificationToAdmins,
  notifyNewMessage,
  notifyTransactionUpdate,
  notifyProfitCollected,
  notifyMiningStarted,
  notifyMiningCompleted,
  notifyDevicePurchased,
  notifyDeviceUpgraded,
  notifyNewReferral
} from './notifications';

// تعديل دالة sendMessage (مع التحقق من الأمان)
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
    
    // الحصول على اسم المرسل
    const users = getUsers();
    const sender = users.find(u => u.id === from);
    const senderName = sender ? sender.username : (from === 'admin001' ? 'الدعم الفني' : 'مستخدم');
    
    // إرسال إشعار للمستقبل فقط (وليس للمرسل)
    if (from !== to) {
      notifyNewMessage(to, senderName, message);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error: 'حدث خطأ في إرسال الرسالة' };
  }
}

// تعديل دالة approveTransaction (مع التحقق من الأمان)
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
      
      notifyTransactionUpdate(user.id, tx.type, 'approved', tx.amount);
    } else if (user && tx.type === 'withdraw') {
      user.totalWithdrawals += tx.amount;
      updateUser(user);
      
      notifyTransactionUpdate(user.id, tx.type, 'approved', tx.amount);
    }
    
    localStorage.setItem('transactions', JSON.stringify(transactions));
    
    return { success: true };
  } catch (error) {
    console.error('Error approving transaction:', error);
    return { success: false, error: 'حدث خطأ في تأكيد المعاملة' };
  }
}

// تعديل دالة rejectTransaction (مع التحقق من الأمان)
export function rejectTransaction(txId: string) {
  try {
    const transactions = getTransactions();
    const txIndex = transactions.findIndex(t => t.id === txId);
    if (txIndex === -1) return { success: false, error: 'Transaction not found' };
    
    const tx = transactions[txIndex];
    if (tx.status !== 'pending') return { success: false, error: 'Transaction already processed' };
    
    tx.status = 'rejected';
    localStorage.setItem('transactions', JSON.stringify(transactions));
    
    notifyTransactionUpdate(tx.userId, tx.type, 'rejected', tx.amount);
    
    return { success: true };
  } catch (error) {
    console.error('Error rejecting transaction:', error);
    return { success: false, error: 'حدث خطأ في رفض المعاملة' };
  }
}

// تعديل دالة collectProfit (مع التحقق من الأمان)
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
    notifyProfitCollected(userId, amount, device.isGift ? 'جهاز الهدية' : template.nameAr);
    
    return { success: true, profit: amount };
  } catch (error) {
    console.error('Error collecting profit:', error);
    return { success: false, error: 'حدث خطأ في جمع الأرباح' };
  }
}

// تعديل دالة startMining (مع التحقق من الأمان)
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
    notifyMiningStarted(userId, device.isGift ? 'جهاز الهدية' : template.nameAr, days);
    
    return { success: true };
  } catch (error) {
    console.error('Error starting mining:', error);
    return { success: false, error: 'حدث خطأ في تشغيل التعدين' };
  }
}