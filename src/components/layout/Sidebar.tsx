import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Warehouse,
  Boxes,
  AlertTriangle,
  FileCheck,
  Truck,
  ShoppingCart,
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { path: '/', label: '首页大屏', icon: LayoutDashboard },
  { path: '/warehouses', label: '仓库管理', icon: Warehouse },
  { path: '/inventory', label: '库存监控', icon: Boxes },
  { path: '/emergency', label: '应急调拨', icon: AlertTriangle },
  { path: '/approvals', label: '审批中心', icon: FileCheck },
  { path: '/transport', label: '运输监控', icon: Truck },
  { path: '/replenish', label: '补货管理', icon: ShoppingCart },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-950 border-r border-slate-700/50 flex flex-col h-screen">
      <div className="h-16 flex items-center px-6 border-b border-slate-700/50">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mr-3 shadow-lg shadow-cyan-500/30">
          <Warehouse className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="text-white font-semibold text-sm leading-tight">应急物资</div>
          <div className="text-slate-400 text-xs">管理平台</div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              end={item.path === '/'}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-600/20 to-blue-600/20 text-cyan-400 border border-cyan-500/30 shadow-inner'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`
              }
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700/50">
        <div className="text-xs text-slate-500 text-center">
          <div>v1.0.0</div>
          <div className="mt-1">城市应急管理局</div>
        </div>
      </div>
    </aside>
  );
}
