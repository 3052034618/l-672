import { useState, useEffect } from 'react';
import { Bell, User, Clock, RefreshCw } from 'lucide-react';

function formatDateTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export default function Header() {
  const [now, setNow] = useState<Date>(new Date());
  const [updateTime, setUpdateTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    setUpdateTime(new Date());
  };

  return (
    <header className="h-16 bg-gradient-to-r from-slate-900/90 via-slate-950/90 to-slate-900/90 backdrop-blur-sm border-b border-slate-700/50 flex items-center justify-between px-6">
      <div className="flex items-center">
        <h1 className="text-lg font-bold text-white tracking-wide">
          <span className="text-gradient">城市应急物资储备与调拨管理平台</span>
        </h1>
      </div>

      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2 text-slate-300">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="font-mono text-sm tabular-nums">{formatDateTime(now)}</span>
        </div>

        <div className="flex items-center space-x-2 text-slate-400 text-xs">
          <RefreshCw
            className="w-4 h-4 text-slate-500 hover:text-cyan-400 cursor-pointer transition-colors"
            onClick={handleRefresh}
          />
          <span>更新时间: {formatDateTime(updateTime)}</span>
        </div>

        <div className="relative">
          <Bell className="w-5 h-5 text-slate-400 hover:text-white cursor-pointer transition-colors" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-medium">
            3
          </span>
        </div>

        <div className="flex items-center space-x-3 pl-4 border-l border-slate-700/50">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm text-white font-medium">管理员</div>
            <div className="text-xs text-slate-400">系统管理员</div>
          </div>
        </div>
      </div>
    </header>
  );
}
