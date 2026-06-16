export const formatNumber = (num: number, digits = 0): string => {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(num);
};

export const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
  }).format(num);
};

export const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatTime = (iso: string): string => {
  const date = new Date(iso);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const formatCountdown = (iso: string): string => {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return '已超时';
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}小时${minutes % 60}分钟`;
  }
  return `${minutes}分${seconds}秒`;
};

export const formatRelativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
};
