import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  User,
  FileText,
  Truck,
  Package,
  RefreshCw,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
  ClipboardCheck,
  Filter,
  History,
} from 'lucide-react';
import { api } from '@/services/api';
import { useAppStore } from '@/store';
import { formatCountdown, formatDateTime, formatNumber, formatCurrency } from '@/utils/format';
import type { ApprovalRecord, DispatchOrder, ReplenishmentOrder } from '../../shared/types';

type PendingApprovalItem = ApprovalRecord & {
  order: {
    id: string;
    title: string;
    type: string;
    totalItems: number;
  };
};

const ORDER_TYPE_CONFIG = {
  dispatch: { label: '调拨申请', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40', icon: Truck },
  replenishment: { label: '补货申请', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40', icon: Package },
};

const APPROVAL_STATUS_CONFIG = {
  pending: { label: '待审批', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' },
  approved: { label: '已通过', color: 'bg-green-500/20 text-green-400 border-green-500/40' },
  rejected: { label: '已驳回', color: 'bg-red-500/20 text-red-400 border-red-500/40' },
  escalated: { label: '已升级', color: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
};

export default function ApprovalCenter() {
  const { dispatchOrders, replenishmentOrders, setDispatchOrders, setReplenishmentOrders } = useAppStore();

  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovalItem[]>([]);
  const [loading, setLoading] = useState({
    pending: false,
    approve: false,
    reject: false,
    refresh: false,
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [filter, setFilter] = useState<'all' | 'dispatch' | 'replenishment'>('all');
  const [, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading((s) => ({ ...s, pending: true, refresh: true }));
    try {
      const [pending, dispatches, replenishments] = await Promise.all([
        api.getPendingApprovals(),
        api.getDispatchOrders(),
        api.getReplenishmentOrders(),
      ]);
      setPendingApprovals(pending as PendingApprovalItem[]);
      setDispatchOrders(dispatches);
      setReplenishmentOrders(replenishments);
    } finally {
      setLoading((s) => ({ ...s, pending: false, refresh: false }));
    }
  };

  const handleApprove = async (id: string) => {
    setLoading((s) => ({ ...s, approve: true }));
    try {
      await api.approveApproval(id, commentMap[id]);
      setCommentMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await loadData();
    } finally {
      setLoading((s) => ({ ...s, approve: false }));
    }
  };

  const handleReject = async (id: string) => {
    setLoading((s) => ({ ...s, reject: true }));
    try {
      await api.rejectApproval(id, commentMap[id]);
      setCommentMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await loadData();
    } finally {
      setLoading((s) => ({ ...s, reject: false }));
    }
  };

  const filteredPending = pendingApprovals.filter((item) => {
    if (filter === 'all') return true;
    return item.orderType === filter;
  });

  const allApprovalHistory = [
    ...dispatchOrders.flatMap((o) =>
      o.approvals
        .filter((a) => a.status !== 'pending')
        .map((a) => ({
          ...a,
          orderTitle: o.eventTitle,
          orderId: o.id,
          orderTypeLabel: '调拨申请',
        }))
    ),
    ...replenishmentOrders.flatMap((o) =>
      o.approvals
        .filter((a) => a.status !== 'pending')
        .map((a) => ({
          ...a,
          orderTitle: `${o.warehouseName}补货申请`,
          orderId: o.id,
          orderTypeLabel: '补货申请',
        }))
    ),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getOrderDetails = (item: PendingApprovalItem) => {
    if (item.orderType === 'dispatch') {
      const order = dispatchOrders.find((o) => o.id === item.orderId) as DispatchOrder | undefined;
      return order?.items || [];
    } else {
      const order = replenishmentOrders.find((o) => o.id === item.orderId) as ReplenishmentOrder | undefined;
      return order?.items || [];
    }
  };

  const isExpiringSoon = (iso: string) => {
    const diff = new Date(iso).getTime() - Date.now();
    return diff > 0 && diff < 10 * 60 * 1000;
  };

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gradient">审批中心</h1>
          <p className="text-sm text-slate-400 mt-1">管理调拨与补货申请审批流程</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading.refresh}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-300 hover:bg-slate-700/60 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading.refresh ? 'animate-spin' : ''}`} />
          刷新数据
        </button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex gap-2 p-1 rounded-lg bg-slate-800/60 border border-slate-700/60">
          <button
            onClick={() => setTab('pending')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === 'pending'
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            待审批
            {pendingApprovals.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-cyan-500/30 text-cyan-300">
                {pendingApprovals.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === 'history'
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            已审批记录
          </button>
        </div>

        {tab === 'pending' && (
          <div className="flex items-center gap-2 ml-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <div className="flex gap-1">
              {(['all', 'dispatch', 'replenishment'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-md text-xs transition-all ${
                    filter === f
                      ? 'bg-slate-700/80 text-slate-200'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {f === 'all' ? '全部' : f === 'dispatch' ? '调拨' : '补货'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {tab === 'pending' ? (
        loading.pending ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : filteredPending.length === 0 ? (
          <div className="card-glass rounded-xl p-16 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500/50 mx-auto mb-4" />
            <p className="text-lg text-slate-300 mb-1">暂无待审批事项</p>
            <p className="text-sm text-slate-500">所有申请都已处理完毕</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredPending.map((item) => {
              const typeConfig = ORDER_TYPE_CONFIG[item.orderType];
              const TypeIcon = typeConfig.icon;
              const isExpanded = expandedId === item.id;
              const details = getOrderDetails(item);
              const expiringSoon = isExpiringSoon(item.expiresAt);

              return (
                <div
                  key={item.id}
                  className="card-glass rounded-xl overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg border ${typeConfig.color}`}>
                          <TypeIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 text-xs rounded border ${typeConfig.color}`}>
                              {item.order.type}
                            </span>
                            <span className={`px-2 py-0.5 text-xs rounded border ${APPROVAL_STATUS_CONFIG[item.status].color}`}>
                              {APPROVAL_STATUS_CONFIG[item.status].label}
                            </span>
                          </div>
                          <h3 className="text-base font-semibold text-slate-200">{item.order.title}</h3>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-slate-500">{item.order.id.toUpperCase()}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/60">
                        <div className="text-xs text-slate-500 mb-1">审批进度</div>
                        <div className="text-sm font-semibold text-slate-200">
                          第 <span className="text-cyan-400">{item.level}</span> / {item.totalLevels} 级
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/60">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                          <User className="w-3 h-3" />
                          审批人
                        </div>
                        <div className="text-sm font-semibold text-slate-200">{item.approverName}</div>
                      </div>
                      <div className={`p-3 rounded-lg border ${
                        expiringSoon
                          ? 'bg-red-500/10 border-red-500/30'
                          : 'bg-slate-800/40 border-slate-700/60'
                      }`}>
                        <div className={`flex items-center gap-1.5 text-xs mb-1 ${
                          expiringSoon ? 'text-red-400' : 'text-slate-500'
                        }`}>
                          <Clock className={`w-3 h-3 ${expiringSoon ? 'animate-pulse' : ''}`} />
                          剩余时间
                        </div>
                        <div className={`text-sm font-semibold ${
                          expiringSoon ? 'text-red-400' : 'text-slate-200'
                        }`}>
                          {formatCountdown(item.expiresAt)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            收起明细
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            查看申请明细 ({details.length} 项)
                          </>
                        )}
                      </button>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <FileText className="w-3 h-3" />
                        申请于 {formatDateTime(item.createdAt)}
                      </div>
                    </div>
                  </div>

                  {isExpanded && details.length > 0 && (
                    <div className="px-5 pb-4">
                      <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/60">
                        <div className="text-xs text-slate-500 mb-2">申请明细</div>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {details.map((detail: { materialName: string; quantity: number; unit: string; unitPrice?: number }, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-sm py-1.5 border-b border-slate-800/60 last:border-0"
                            >
                              <div className="flex items-center gap-2">
                                <Package className="w-3.5 h-3.5 text-slate-500" />
                                <span className="text-slate-300">{detail.materialName}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                {detail.unitPrice !== undefined && (
                                  <span className="text-xs text-slate-500">
                                    {formatCurrency(detail.unitPrice * detail.quantity)}
                                  </span>
                                )}
                                <span className="text-slate-200 font-medium animate-number">
                                  {formatNumber(detail.quantity)}
                                  <span className="text-slate-500 ml-0.5 text-xs">{detail.unit}</span>
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="px-5 pb-5 space-y-3">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        审批意见（可选）
                      </label>
                      <input
                        type="text"
                        value={commentMap[item.id] || ''}
                        onChange={(e) =>
                          setCommentMap((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                        placeholder="请输入审批意见..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleReject(item.id)}
                        disabled={loading.reject}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-400 text-sm font-medium hover:bg-red-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading.reject ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        驳回
                      </button>
                      <button
                        onClick={() => handleApprove(item.id)}
                        disabled={loading.approve}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-medium hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading.approve ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        通过
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="card-glass rounded-xl overflow-hidden">
          {allApprovalHistory.length === 0 ? (
            <div className="p-16 text-center">
              <History className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-lg text-slate-400 mb-1">暂无审批记录</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/40">
                  <tr>
                    <th className="text-left py-3.5 px-5 text-slate-400 font-medium">申请类型</th>
                    <th className="text-left py-3.5 px-5 text-slate-400 font-medium">申请标题</th>
                    <th className="text-left py-3.5 px-5 text-slate-400 font-medium">审批级别</th>
                    <th className="text-left py-3.5 px-5 text-slate-400 font-medium">审批人</th>
                    <th className="text-left py-3.5 px-5 text-slate-400 font-medium">状态</th>
                    <th className="text-left py-3.5 px-5 text-slate-400 font-medium">审批意见</th>
                    <th className="text-left py-3.5 px-5 text-slate-400 font-medium">审批时间</th>
                  </tr>
                </thead>
                <tbody>
                  {allApprovalHistory.map((record, idx) => (
                    <tr
                      key={`${record.id}-${idx}`}
                      className="border-t border-slate-800/60 hover:bg-slate-800/20 transition-colors"
                    >
                      <td className="py-3.5 px-5">
                        <span className={`px-2 py-0.5 text-xs rounded border ${
                          ORDER_TYPE_CONFIG[record.orderType].color
                        }`}>
                          {record.orderTypeLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="text-slate-200">{record.orderTitle}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{record.orderId.toUpperCase()}</div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="text-slate-300">第 {record.level} / {record.totalLevels} 级</span>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          {record.approverName}
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`px-2 py-0.5 text-xs rounded border ${
                          APPROVAL_STATUS_CONFIG[record.status as keyof typeof APPROVAL_STATUS_CONFIG].color
                        }`}>
                          {APPROVAL_STATUS_CONFIG[record.status as keyof typeof APPROVAL_STATUS_CONFIG].label}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        {record.comment ? (
                          <div className="flex items-start gap-1.5 max-w-xs">
                            <MessageSquare className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                            <span className="text-slate-400 text-xs">{record.comment}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs">无</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-slate-400 text-xs">
                        {formatDateTime(record.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
