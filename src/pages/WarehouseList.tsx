import { useEffect, useState } from 'react';
import {
  Building2,
  MapPin,
  User,
  Phone,
  Thermometer,
  Droplets,
  Package,
  ChevronRight,
  X,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { api } from '@/services/api';
import { formatNumber } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { Warehouse, InventoryItem } from '../../shared/types';

const WAREHOUSE_STATUS_LABELS: Record<Warehouse['status'], string> = {
  active: '运营中',
  maintenance: '维护中',
  closed: '关闭',
};

const WAREHOUSE_STATUS_STYLES: Record<Warehouse['status'], string> = {
  active: 'bg-success-green/20 text-success-green border-success-green/30',
  maintenance: 'bg-warning-amber/20 text-warning-amber border-warning-amber/30',
  closed: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function WarehouseCard({
  warehouse,
  onClick,
}: {
  warehouse: Warehouse;
  onClick: () => void;
}) {
  const usageRate = (warehouse.usedCapacity / warehouse.capacity) * 100;
  const usageColor =
    usageRate >= 90
      ? 'bg-red-500'
      : usageRate >= 70
        ? 'bg-warning-amber'
        : 'bg-success-green';

  return (
    <div
      onClick={onClick}
      className="card-glass rounded-xl p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-glow group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-alarm-blue/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-info-cyan" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white group-hover:text-info-cyan transition-colors">
              {warehouse.name}
            </h3>
            <div className="flex items-center gap-1.5 text-sm text-slate-400 mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate max-w-[240px]">{warehouse.address}</span>
            </div>
          </div>
        </div>
        <span
          className={cn(
            'px-2.5 py-1 rounded-full text-xs font-medium border',
            WAREHOUSE_STATUS_STYLES[warehouse.status],
          )}
        >
          {WAREHOUSE_STATUS_LABELS[warehouse.status]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <User className="w-4 h-4 text-slate-500" />
          <span>{warehouse.manager}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Phone className="w-4 h-4 text-slate-500" />
          <span>{warehouse.phone}</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-sm text-slate-400">
            <Package className="w-4 h-4" />
            <span>容量使用率</span>
          </div>
          <span className="text-sm font-mono text-white">
            {formatNumber(warehouse.usedCapacity)} / {formatNumber(warehouse.capacity)}
            <span className="text-slate-500 ml-1">({usageRate.toFixed(1)}%)</span>
          </span>
        </div>
        <div className="h-2 bg-surface-light rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', usageColor)}
            style={{ width: `${usageRate}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border-dark">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <Thermometer className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-slate-300">
              <span className="font-mono text-white">{warehouse.temperature.toFixed(1)}</span>
              <span className="text-slate-500 ml-0.5">°C</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Droplets className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-slate-300">
              <span className="font-mono text-white">{warehouse.humidity}</span>
              <span className="text-slate-500 ml-0.5">%</span>
            </span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-info-cyan group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
}

function InventoryDetailModal({
  warehouse,
  onClose,
}: {
  warehouse: Warehouse;
  onClose: () => void;
}) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      setLoading(true);
      try {
        const data = await api.getWarehouseInventory(warehouse.id);
        setInventory(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, [warehouse.id]);

  const CATEGORY_COLORS: Record<string, string> = {
    medical: 'bg-red-500/20 text-red-400 border-red-500/30',
    food: 'bg-green-500/20 text-green-400 border-green-500/30',
    shelter: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    equipment: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    communication: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    other: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  const CATEGORY_LABELS: Record<string, string> = {
    medical: '医疗物资',
    food: '食品物资',
    shelter: '帐篷物资',
    equipment: '设备器材',
    communication: '通讯设备',
    other: '其他物资',
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card-glass rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col border-glow">
        <div className="flex items-center justify-between p-5 border-b border-border-dark">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-alarm-blue/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-info-cyan" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{warehouse.name}</h2>
              <p className="text-sm text-slate-400">{warehouse.address}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-surface-light hover:bg-border-dark flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-info-cyan animate-spin" />
            </div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-12 text-slate-500">暂无库存数据</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-dark">
                    <th className="text-left py-3 px-4 font-medium text-slate-400">物资名称</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-400">类别</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-400">总库存</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-400">锁定</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-400">可用</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-400">阈值</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-400">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => {
                    const isWarning = item.availableQuantity < item.threshold;
                    const isCritical = item.availableQuantity < item.threshold * 0.5;
                    return (
                      <tr
                        key={item.id}
                        className={cn(
                          'border-b border-border-dark/50 transition-colors',
                          isCritical && 'bg-red-500/10',
                          !isCritical && isWarning && 'bg-warning-amber/10',
                        )}
                      >
                        <td className="py-3 px-4 text-white">{item.materialName}</td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-xs border',
                              CATEGORY_COLORS[item.category],
                            )}
                          >
                            {CATEGORY_LABELS[item.category]}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-white">
                          {formatNumber(item.quantity)} {item.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-warning-amber">
                          {formatNumber(item.lockedQuantity)} {item.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-success-green">
                          {formatNumber(item.availableQuantity)} {item.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          {formatNumber(item.threshold)} {item.unit}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isCritical ? (
                            <span className="text-red-400 font-medium">不足</span>
                          ) : isWarning ? (
                            <span className="text-warning-amber font-medium">预警</span>
                          ) : (
                            <span className="text-success-green font-medium">正常</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WarehouseList() {
  const { warehouses, setWarehouses } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const data = await api.getWarehouses();
      setWarehouses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Building2 className="w-7 h-7 text-info-cyan" />
              仓库管理
            </h1>
            <p className="text-slate-400 mt-1">查看全市应急物资仓库分布及运行状态</p>
          </div>
          <button
            onClick={fetchWarehouses}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-border-dark hover:border-alarm-blue/50 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            <span>刷新</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-info-cyan animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {warehouses.map((warehouse) => (
              <WarehouseCard
                key={warehouse.id}
                warehouse={warehouse}
                onClick={() => setSelectedWarehouse(warehouse)}
              />
            ))}
          </div>
        )}

        {selectedWarehouse && (
          <InventoryDetailModal
            warehouse={selectedWarehouse}
            onClose={() => setSelectedWarehouse(null)}
          />
        )}
      </div>
    </div>
  );
}
