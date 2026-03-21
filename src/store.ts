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

// تعديل دالة sendMessage
export function sendMessage(from: string, to: string, message: string) {
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
  // التحقق من أن المستقبل ليس هو المرسل نفسه
  if (from !== to) {
    notifyNewMessage(to, senderName, message);
  }
  
  return { success: true };
}

// تعديل دالة approveTransaction
export function approveTransaction(txId: string) {
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
    
    // إشعار للمستخدم فقط
    notifyTransactionUpdate(user.id, tx.type, 'approved', tx.amount);
  } else if (user && tx.type === 'withdraw') {
    user.totalWithdrawals += tx.amount;
    updateUser(user);
    
    // إشعار للمستخدم فقط
    notifyTransactionUpdate(user.id, tx.type, 'approved', tx.amount);
  }
  
  localStorage.setItem('transactions', JSON.stringify(transactions));
  
  // إشعار للأدمن (اختياري) - نرسل فقط إذا كان هناك أدمن
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  if (currentUser.isAdmin) {
    sendNotificationToAdmins('✅ تمت الموافقة على معاملة', `${user?.username} - ${tx.type === 'deposit' ? 'إيداع' : 'سحب'} $${tx.amount}`, 'success');
  }
  
  return { success: true };
}

// تعديل دالة rejectTransaction
export function rejectTransaction(txId: string) {
  const transactions = getTransactions();
  const txIndex = transactions.findIndex(t => t.id === txId);
  if (txIndex === -1) return { success: false, error: 'Transaction not found' };
  
  const tx = transactions[txIndex];
  if (tx.status !== 'pending') return { success: false, error: 'Transaction already processed' };
  
  tx.status = 'rejected';
  localStorage.setItem('transactions', JSON.stringify(transactions));
  
  // إشعار للمستخدم فقط
  notifyTransactionUpdate(tx.userId, tx.type, 'rejected', tx.amount);
  
  return { success: true };
}

// تعديل دالة collectProfit
export function collectProfit(userId: string, deviceId: string) {
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
  
  // إشعار للمستخدم فقط
  const template = getDeviceTemplate(device.deviceId);
  notifyProfitCollected(userId, amount, device.isGift ? 'جهاز الهدية' : template.nameAr);
  
  return { success: true, profit: amount };
}

// تعديل دالة startMining
export function startMining(userId: string, deviceId: string, days: number) {
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
  
  // إشعار للمستخدم فقط
  const template = getDeviceTemplate(device.deviceId);
  notifyMiningStarted(userId, device.isGift ? 'جهاز الهدية' : template.nameAr, days);
  
  // جدولة إشعار عند الانتهاء
  const endTime = Date.now() + (days * 24 * 60 * 60 * 1000);
  scheduleCompletionNotification(userId, device.id, endTime);
  
  return { success: true };
}

// دالة مساعدة لجدولة إشعار الانتهاء
function scheduleCompletionNotification(userId: string, deviceId: string, endTime: number) {
  const timeout = endTime - Date.now();
  if (timeout > 0 && timeout < 30 * 24 * 60 * 60 * 1000) { // أقل من 30 يوم
    setTimeout(() => {
      const users = getUsers();
      const user = users.find(u => u.id === userId);
      if (user) {
        const device = user.devices.find(d => d.id === deviceId);
        if (device && device.isRunning) {
          const profit = calcProfit(device);
          const template = getDeviceTemplate(device.deviceId);
          notifyMiningCompleted(userId, device.isGift ? 'جهاز الهدية' : template.nameAr, profit.total);
        }
      }
    }, timeout);
  }
}

// دالة شراء جهاز مع إشعار
export function buyDevice(userId: string, deviceId: number) {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return { success: false, error: 'User not found' };
  
  const template = DEVICE_TEMPLATES.find(d => d.id === deviceId);
  if (!template) return { success: false, error: 'Device not found' };
  
  if (user.balance < template.price) return { success: false, error: 'Insufficient balance' };
  
  user.balance -= template.price;
  
  const newDevice: UserDevice = {
    id: Date.now().toString(),
    deviceId: template.id,
    isGift: false,
    isRunning: false,
    totalEarned: 0,
    startTime: undefined,
    duration: undefined
  };
  
  user.devices.push(newDevice);
  updateUser(user);
  
  // إشعار للمستخدم فقط
  notifyDevicePurchased(userId, template.nameAr, template.price);
  
  return { success: true, device: newDevice };
}

// دالة ترقية جهاز مع إشعار
export function upgradeDevice(userId: string, deviceId: string, newDeviceId: number) {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return { success: false, error: 'User not found' };
  
  const device = user.devices.find(d => d.id === deviceId);
  if (!device) return { success: false, error: 'Device not found' };
  
  const currentTemplate = getDeviceTemplate(device.deviceId);
  const newTemplate = DEVICE_TEMPLATES.find(d => d.id === newDeviceId);
  if (!newTemplate) return { success: false, error: 'New device not found' };
  
  const diff = newTemplate.price - currentTemplate.price;
  if (diff <= 0) return { success: false, error: 'Invalid upgrade' };
  if (user.balance < diff) return { success: false, error: 'Insufficient balance' };
  
  user.balance -= diff;
  const oldDeviceName = currentTemplate.nameAr;
  device.deviceId = newDeviceId;
  
  updateUser(user);
  
  // إشعار للمستخدم فقط
  notifyDeviceUpgraded(userId, oldDeviceName, newTemplate.nameAr);
  
  return { success: true };
}