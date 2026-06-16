import { useEffect, useState, useMemo } from 'react';
import {
  ClipboardList,
  Thermometer,
  Droplets,
  RefreshCw,
  Filter,
  AlertTriangle,
  Building2,
  Loader2,
  Package,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { api } from '@/services/api';
import { formatNumber, formatRelativeTime } from '@/utils/format';
import { cn } from '@/lib/utils';
import { CATEGORY_LABELS } from '../../shared/types';
import type { InventoryItem, MaterialCategory, Warehouse } from '../../shared/types';

const CATEGORY_COLORS: Record<MaterialCategory, string> = {
  medical: 'bg-red-500/20 text-red-400 border-red-500/30',
  food: 'bg-green-500/20 text-green-400 border-green-500/30',
  shelter: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  equipment: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  communication: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  other: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

function EnvWidget({ warehouses }: { warehouses: Warehouse[] }) {
  const getTempStatus = (temp: number) => {
    if (temp < 10 || temp > 28) return 'text-red-400';
    if (temp < 15 || temp > 25) return 'text-warning-amber';
    return 'text-success-green';
  };

  const getHumidityStatus = (hum: number) => {
    if (hum < 30 || hum > 80) return 'text-red-400';
    if (hum < 40 || hum > 70) return 'text-warning-amber';
    return 'text-success-green';
  };

  return (
    <div className="card-glass rounded-xl p-5">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
        <Thermometer className="w-5 h-5 text-info-cyan" />
        温湿度监控
      </h3>
      <div className="space-y-3">
        {warehouses.map((w) => (
          <div
            key={w.id}
            className="p-3 rounded-lg bg-surface-light/50 border border-border-dark/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-white truncate max-w-[180px]">{w.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Thermometer className={cn('w-4 h-4', getTempStatus(w.temperature))} />
                <span className={cn('font-mono text-sm', getTempStatus(w.temperature))}>
                  {w.temperature.toFixed(1)}°C
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Droplets className={cn('w-4 h-4', getHumidityStatus(w.humidity))} />
                <span className={cn('font-mono text-sm', getHumidityStatus(w.humidity))}>
                  {w.humidity}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InventoryMonitor() {
  const { warehouses, inventory, setWarehouses, setInventory } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [onlyWarning, setOnlyWarning] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [warehouseData, inventoryData] = await Promise.all([
        api.getWarehouses(),
        api.getInventory(),
      ]);
      setWarehouses(warehouseData);
      setInventory(inventoryData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      if (selectedWarehouse && item.warehouseId !== selectedWarehouse) return false;
      if (selectedCategory && item.category !== selectedCategory) return false;
      if (onlyWarning && item.availableQuantity >= item.threshold) return false;
      return true;
    });
  }, [inventory, selectedWarehouse, selectedCategory, onlyWarning]);

  const warningCount = useMemo(() => {
    return inventory.filter((i) => i.availableQuantity < i.threshold).length;
  }, [inventory]);

  const criticalCount = useMemo(() => {
    return inventory.filter((i) => i.availableQuantity < i.threshold * 0.5).length;
  }, [inventory]);

  const getItemStatus = (item: InventoryItem) => {
    if (item.availableQuantity < item.threshold * 0.5) return 'critical';
    if (item.availableQuantity < item.threshold) return 'warning';
    return 'normal';
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <ClipboardList className="w-7 h-7 text-info-cyan" />
              库存监控
            </h1>
            <p className="text-slate-400 mt-1">实时监控各仓库物资库存及预警状态</p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-border-dark hover:border-alarm-blue/50 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            <span>刷新</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-5">
          <div className="lg:col-span-1">
            <EnvWidget warehouses={warehouses} />
          </div>

          <div className="lg:col-span-3">
            <div className="card-glass rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-info-cyan" />
                <h3 className="text-lg font-semibold text-white">筛选条件</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">按仓库</label>
                  <select
                    value={selectedWarehouse}
                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border-dark text-white text-sm focus:outline-none focus:border-alarm-blue/50 transition-colors"
                  >
                    <option value="">全部仓库</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">按物资类别</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border-dark text-white text-sm focus:outline-none focus:border-alarm-blue/50 transition-colors"
                  >
                    <option value="">全部类别</option>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">预警状态</label>
                  <button
                    onClick={() => setOnlyWarning(!onlyWarning)}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-colors',
                      onlyWarning
                        ? 'bg-warning-amber/20 border-warning-amber/50 text-warning-amber'
                        : 'bg-surface border-border-dark text-slate-300 hover:border-warning-amber/50',
                    )}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    {onlyWarning ? '只显示预警' : '显示全部'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">统计信息</label>
                  <div className="flex items-center gap-3 h-[38px]">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-300">
                        总数: <span className="font-mono text-white">{filteredInventory.length}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-warning-amber" />
                      <span className="text-sm text-slate-300">
                        预警: <span className="font-mono text-warning-amber">{warningCount}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-slate-300">
                        不足: <span className="font-mono text-red-400">{criticalCount}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card-glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-light/50">
                <tr>
                  <th className="text-left py-3.5 px-5 font-medium text-slate-400">物资名称</th>
                  <th className="text-left py-3.5 px-5 font-medium text-slate-400">所属仓库</th>
                  <th className="text-left py-3.5 px-5 font-medium text-slate-400">类别</th>
                  <th className="text-right py-3.5 px-5 font-medium text-slate-400">总库存</th>
                  <th className="text-right py-3.5 px-5 font-medium text-slate-400">锁定库存</th>
                  <th className="text-right py-3.5 px-5 font-medium text-slate-400">可用库存</th>
                  <th className="text-right py-3.5 px-5 font-medium text-slate-400">阈值</th>
                  <th className="text-center py-3.5 px-5 font-medium text-slate-400">状态</th>
                  <th className="text-right py-3.5 px-5 font-medium text-slate-400">更新时间</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <Loader2 className="w-8 h-8 text-info-cyan animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-500">
                      暂无匹配的库存数据
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => {
                    const status = getItemStatus(item);
                    return (
                      <tr
                        key={item.id}
                        className={cn(
                          'border-t border-border-dark/30 transition-colors hover:bg-surface-light/30',
                          status === 'critical' && 'bg-red-500/10 hover:bg-red-500/15',
                          status === 'warning' && 'bg-warning-amber/10 hover:bg-warning-amber/15',
                        )}
                      >
                        <td className="py-3.5 px-5">
                          <span className="text-white font-medium">{item.materialName}</span>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="text-slate-300">{item.warehouseName}</span>
                        </td>
                        <td className="py-3.5 px-5">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-xs border',
                              CATEGORY_COLORS[item.category],
                            )}
                          >
                            {CATEGORY_LABELS[item.category]}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono text-white">
                          {formatNumber(item.quantity)} {item.unit}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono text-warning-amber">
                          {formatNumber(item.lockedQuantity)} {item.unit}
                        </td>
                        <td
                          className={cn(
                            'py-3.5 px-5 text-right font-mono font-medium',
                            status === 'critical' && 'text-red-400',
                            status === 'warning' && 'text-warning-amber',
                            status === 'normal' && 'text-success-green',
                          )}
                        >
                          {formatNumber(item.availableQuantity)} {item.unit}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono text-slate-400">
                          {formatNumber(item.threshold)} {item.unit}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          {status === 'critical' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              不足
                            </span>
                          ) : status === 'warning' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-warning-amber/20 text-warning-amber text-xs font-medium border border-warning-amber/30">
                              <AlertTriangle className="w-3 h-3" />
                              预警
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-success-green/20 text-success-green text-xs font-medium border border-success-green/30">
                              正常
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right text-slate-500 text-xs">
                          {formatRelativeTime(item.lastUpdated)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
