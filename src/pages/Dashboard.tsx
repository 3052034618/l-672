import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  Package,
  Warehouse,
  Truck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Filter,
  Download,
  RefreshCw,
  Info,
  AlertCircle,
  AlertOctagon,
  Clock,
} from 'lucide-react';
import { useAppStore } from '../store';
import { api } from '../services/api';
import { formatNumber, formatDateTime, formatRelativeTime } from '../utils/format';
import type { MaterialCategory, Activity } from '../../shared/types';
import { CATEGORY_LABELS } from '../../shared/types';

const COLORS = ['#06b6d4', '#10b981', '#1e40af', '#f97316', '#8b5cf6', '#ec4899'];

const PIE_COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

const LEVEL_STYLES: Record<Activity['level'], { bg: string; border: string; text: string; icon: typeof Info }> = {
  info: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', icon: Info },
  warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: AlertCircle },
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: AlertOctagon },
};

function StatCard({
  title,
  value,
  unit,
  icon: Icon,
  color,
  trend,
  trendValue,
}: {
  title: string;
  value: number;
  unit: string;
  icon: typeof Package;
  color: string;
  trend: 'up' | 'down';
  trendValue: number;
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br ${color} p-5 backdrop-blur-sm`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white/70">{title}</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-white">{formatNumber(value)}</span>
            <span className="text-sm text-white/60">{unit}</span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-sm">
            {trend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-400" />
            )}
            <span className={trend === 'up' ? 'text-emerald-400' : 'text-red-400'}>
              {trendValue}%
            </span>
            <span className="text-white/50">较上周</span>
          </div>
        </div>
        <div className="rounded-lg bg-white/10 p-3">
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function MapVisualization() {
  const warehouses = useAppStore((s) => s.warehouses);
  const transports = useAppStore((s) => s.transportOrders);
  const events = useAppStore((s) => s.events);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const mapWidth = 600;
  const mapHeight = 400;
  const padding = 30;

  const bounds = useMemo(() => {
    const allCoords = [
      ...warehouses.map((w) => w.coordinates),
      ...transports.map((t) => t.currentPosition),
      ...events.map((e) => e.coordinates),
    ];
    if (allCoords.length === 0) {
      return { minLat: 0, maxLat: 100, minLng: 0, maxLng: 100 };
    }
    const lats = allCoords.map((c) => c.lat);
    const lngs = allCoords.map((c) => c.lng);
    return {
      minLat: Math.min(...lats) - 5,
      maxLat: Math.max(...lats) + 5,
      minLng: Math.min(...lngs) - 5,
      maxLng: Math.max(...lngs) + 5,
    };
  }, [warehouses, transports, events]);

  const toXY = (lat: number, lng: number) => {
    const x = padding + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * (mapWidth - padding * 2);
    const y = padding + ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * (mapHeight - padding * 2);
    return { x, y };
  };

  return (
    <div className="relative h-full w-full">
      <svg viewBox={`0 0 ${mapWidth} ${mapHeight}`} className="h-full w-full">
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(6, 182, 212, 0.1)" strokeWidth="0.5" />
          </pattern>
          <radialGradient id="eventGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="100%" height="100%" fill="url(#grid)" />

        <path
          d={`M ${padding} ${padding} L ${mapWidth - padding} ${padding} L ${mapWidth - padding} ${mapHeight - padding} L ${padding} ${mapHeight - padding} Z`}
          fill="none"
          stroke="rgba(6, 182, 212, 0.3)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {transports.map((t) => {
          const origin = toXY(t.origin.lat, t.origin.lng);
          const dest = toXY(t.destination.lat, t.destination.lng);
          return (
            <line
              key={`route-${t.id}`}
              x1={origin.x}
              y1={origin.y}
              x2={dest.x}
              y2={dest.y}
              stroke="rgba(59, 130, 246, 0.4)"
              strokeWidth="1.5"
              strokeDasharray="6 3"
            />
          );
        })}

        {warehouses.map((w) => {
          const { x, y } = toXY(w.coordinates.lat, w.coordinates.lng);
          return (
            <g key={`warehouse-${w.id}`}>
              <circle cx={x} cy={y} r="12" fill="rgba(16, 185, 129, 0.15)" />
              <circle cx={x} cy={y} r="7" fill="#10b981" />
              <text x={x} y={y + 22} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="10">
                {w.name}
              </text>
            </g>
          );
        })}

        {transports.map((t) => {
          const progress = ((tick % 100) / 100);
          const origin = toXY(t.origin.lat, t.origin.lng);
          const dest = toXY(t.destination.lat, t.destination.lng);
          const cx = origin.x + (dest.x - origin.x) * progress;
          const cy = origin.y + (dest.y - origin.y) * progress;
          return (
            <g key={`transport-${t.id}`}>
              <circle cx={cx} cy={cy} r="8" fill="rgba(59, 130, 246, 0.3)" />
              <circle cx={cx} cy={cy} r="4" fill="#3b82f6" />
            </g>
          );
        })}

        {events.map((e) => {
          const { x, y } = toXY(e.coordinates.lat, e.coordinates.lng);
          const pulse = 1 + Math.sin(tick * 0.3) * 0.3;
          return (
            <g key={`event-${e.id}`}>
              <circle cx={x} cy={y} r={18 * pulse} fill="url(#eventGlow)" />
              <circle cx={x} cy={y} r="10" fill="rgba(239, 68, 68, 0.3)" />
              <circle cx={x} cy={y} r="6" fill="#ef4444" />
              <text x={x} y={y + 26} textAnchor="middle" fill="#fca5a5" fontSize="10" fontWeight="bold">
                {e.title}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-3 right-3 flex gap-4 rounded-lg bg-slate-900/80 px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          <span className="text-xs text-white/70">仓库</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <span className="text-xs text-white/70">车辆</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <span className="text-xs text-white/70">事件</span>
        </div>
      </div>
    </div>
  );
}

function AlertList({ activities }: { activities: Activity[] }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">实时告警与活动</h3>
        <span className="flex items-center gap-1 text-xs text-white/50">
          <Clock className="h-3 w-3" />
          {activities.length} 条记录
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {activities.map((activity) => {
          const style = LEVEL_STYLES[activity.level];
          const LevelIcon = style.icon;
          return (
            <div
              key={activity.id}
              className={`rounded-lg border ${style.border} ${style.bg} p-3 transition-all hover:bg-white/5`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 rounded-md p-1.5 ${style.bg}`}>
                  <LevelIcon className={`h-4 w-4 ${style.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-white">{activity.title}</p>
                    <span className="shrink-0 text-xs text-white/40">{formatRelativeTime(activity.timestamp)}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/60 line-clamp-2">{activity.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${style.bg} ${style.text} border ${style.border}`}>
                      {activity.level.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-white/40">{activity.type}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const {
    dashboard,
    warehouses,
    filters,
    lastUpdate,
    setDashboard,
    setWarehouses,
    setTransportOrders,
    setEvents,
    setFilter,
    updateTimestamp,
  } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [stats, wh, transports, events] = await Promise.all([
        api.getDashboardStats({ warehouseId: filters.warehouseId, category: filters.category }),
        api.getWarehouses(),
        api.getActiveTransports(),
        api.getEvents(),
      ]);
      setDashboard(stats);
      setWarehouses(wh);
      setTransportOrders(transports);
      setEvents(events);
      updateTimestamp();
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [setDashboard, setWarehouses, setTransportOrders, setEvents, updateTimestamp, filters]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleExportReport = async () => {
    setExporting(true);
    try {
      const report = await api.getMonthlyReport({ warehouseId: filters.warehouseId, category: filters.category }) as any;
      const csvContent = generateReportCSV(report);
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `月度分析报告-${report.period || new Date().toISOString().slice(0, 7)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export report:', error);
    } finally {
      setExporting(false);
    }
  };

  const generateReportCSV = (report: any): string => {
    let csv = '';
    csv += `城市应急物资储备与调拨管理平台 - 月度分析报告\n`;
    csv += `报告周期: ${report.period || '2026年5月'}\n`;
    csv += `生成时间: ${new Date().toLocaleString('zh-CN')}\n`;
    if (filters.warehouseId) {
      const wh = warehouses.find((w) => w.id === filters.warehouseId);
      csv += `筛选仓库: ${wh?.name || filters.warehouseId}\n`;
    }
    if (filters.category) {
      csv += `筛选类别: ${CATEGORY_LABELS[filters.category] || filters.category}\n`;
    }
    csv += '\n';

    csv += `=== 总体统计 ===\n`;
    csv += `指标,数值\n`;
    csv += `库存总价值,${report.summary?.totalInventoryValue?.toLocaleString() || '0'} 元\n`;
    csv += `仓库总数,${report.summary?.totalWarehouses || 0}\n`;
    csv += `调拨单总数,${report.summary?.totalDispatches || 0}\n`;
    csv += `已完成调拨,${report.summary?.completedDispatches || 0}\n`;
    csv += `补货申请总数,${report.summary?.totalReplenishments || 0}\n`;
    csv += `已完成补货,${report.summary?.completedReplenishments || 0}\n`;
    csv += `活跃告警数,${report.summary?.activeAlerts || 0}\n\n`;

    csv += `=== 各仓库统计 ===\n`;
    csv += `仓库名称,容量,已使用,使用率,库存量\n`;
    report.warehouseStats?.forEach((w: any) => {
      csv += `${w.name},${w.capacity},${w.usedCapacity},${w.utilizationRate},${w.inventoryCount}\n`;
    });
    csv += '\n';

    csv += `=== 物资类别统计 ===\n`;
    csv += `类别,总数量,总价值(元),物资种类,预警数\n`;
    const catLabels: Record<string, string> = {
      medical: '医疗物资', food: '食品物资', shelter: '帐篷物资',
      equipment: '设备器材', communication: '通讯设备', other: '其他物资',
    };
    report.categoryStats?.forEach((c: any) => {
      csv += `${catLabels[c.category] || c.category},${c.totalQuantity},${c.totalValue?.toLocaleString()},${c.itemCount},${c.warnings}\n`;
    });

    return csv;
  };

  const categories: { value: MaterialCategory | 'all'; label: string }[] = [
    { value: 'all', label: '全部类别' },
    ...Object.entries(CATEGORY_LABELS).map(([k, v]) => ({ value: k as MaterialCategory, label: v })),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">城市应急物资指挥中心</h1>
            <p className="mt-1 text-sm text-white/50">
              最后更新: {formatDateTime(new Date(lastUpdate).toISOString())}
              {loading && (
                <span className="ml-3 inline-flex items-center gap-1 text-cyan-400">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  刷新中...
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <Filter className="h-4 w-4 text-white/50" />
              <select
                value={filters.warehouseId ?? 'all'}
                onChange={(e) => setFilter('warehouseId', e.target.value === 'all' ? null : e.target.value)}
                className="bg-transparent text-sm text-white outline-none"
              >
                <option value="all" className="bg-slate-900">全部仓库</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id} className="bg-slate-900">
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <Filter className="h-4 w-4 text-white/50" />
              <select
                value={filters.category ?? 'all'}
                onChange={(e) => setFilter('category', e.target.value === 'all' ? null : (e.target.value as MaterialCategory))}
                className="bg-transparent text-sm text-white outline-none"
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value} className="bg-slate-900">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition-all hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>

            <button
              onClick={handleExportReport}
              disabled={exporting}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-cyan-500/20 transition-all hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50"
            >
              <Download className={`h-4 w-4 ${exporting ? 'animate-bounce' : ''}`} />
              {exporting ? '导出中...' : '导出月度报告'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="总库存量"
            value={dashboard?.totalInventory ?? 0}
            unit="件"
            icon={Package}
            color="from-cyan-600/20 to-cyan-900/20"
            trend="up"
            trendValue={12.5}
          />
          <StatCard
            title="活跃仓库"
            value={warehouses.filter((w) => w.status === 'active').length || dashboard?.totalWarehouses || 0}
            unit="个"
            icon={Warehouse}
            color="from-emerald-600/20 to-emerald-900/20"
            trend="up"
            trendValue={5.2}
          />
          <StatCard
            title="调拨任务中"
            value={dashboard?.activeDispatches ?? 0}
            unit="单"
            icon={Truck}
            color="from-blue-800/20 to-blue-950/20"
            trend="down"
            trendValue={3.1}
          />
          <StatCard
            title="异常告警"
            value={dashboard?.activeAlerts ?? 0}
            unit="条"
            icon={AlertTriangle}
            color="from-orange-600/20 to-orange-900/20"
            trend="up"
            trendValue={8.7}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-sm lg:col-span-2">
            <h3 className="mb-4 text-base font-semibold text-white">库存周转率趋势 (近30天)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboard?.turnoverRate ?? []} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="turnoverGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="date"
                    stroke="rgba(255,255,255,0.4)"
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                    tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.4)"
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                    tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    dot={{ fill: '#06b6d4', strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 6, fill: '#06b6d4', stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-sm">
            <h3 className="mb-4 text-base font-semibold text-white">调拨进度分布</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboard?.dispatchProgress ?? []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="status"
                  >
                    {(dashboard?.dispatchProgress ?? []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => <span className="text-xs text-white/70">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-sm">
            <h3 className="mb-4 text-base font-semibold text-white">各仓库平均响应时效 (分钟)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard?.responseTime ?? []} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="warehouse"
                    stroke="rgba(255,255,255,0.4)"
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                    tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.4)"
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                    tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    formatter={(value: number) => [`${value} 分钟`, '平均响应时间']}
                  />
                  <Bar dataKey="avgTime" radius={[6, 6, 0, 0]} barSize={32}>
                    {(dashboard?.responseTime ?? []).map((_, index) => (
                      <Cell key={`bar-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-sm">
            <h3 className="mb-4 text-base font-semibold text-white">实时地理态势</h3>
            <div className="h-72">
              <MapVisualization />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-sm">
          <div className="h-[380px]">
            <AlertList activities={dashboard?.recentActivities ?? []} />
          </div>
        </div>
      </div>
    </div>
  );
}
