import type { StudyStatus } from '@/types';
import { Brain, Eye, Moon, DoorOpen, Clock, Spinner, WarningCircle } from '@phosphor-icons/react';

interface StatusBadgeProps {
  status: StudyStatus;
  showLabel?: boolean;
}

const statusConfig: Record<StudyStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  focused: { label: '专注', color: 'bg-emerald-500', bg: 'bg-emerald-50', icon: <Brain size={14} weight="fill" /> },
  distracted: { label: '分心', color: 'bg-amber-500', bg: 'bg-amber-50', icon: <Eye size={14} weight="fill" /> },
  drowsy: { label: '开小差', color: 'bg-orange-500', bg: 'bg-orange-50', icon: <Moon size={14} weight="fill" /> },
  away: { label: '离开', color: 'bg-slate-400', bg: 'bg-slate-50', icon: <DoorOpen size={14} weight="fill" /> },
  idle: { label: '等待开始', color: 'bg-slate-300', bg: 'bg-slate-50', icon: <Clock size={14} weight="fill" /> },
  loading: { label: '加载中...', color: 'bg-blue-400', bg: 'bg-blue-50', icon: <Spinner size={14} weight="fill" className="animate-spin" /> },
  error: { label: '检测异常', color: 'bg-red-500', bg: 'bg-red-50', icon: <WarningCircle size={14} weight="fill" /> },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, showLabel = true }) => {
  const cfg = statusConfig[status] || statusConfig.idle;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${cfg.bg}`}>
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.color} opacity-75`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.color}`} />
      </span>
      {showLabel && (
        <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
          {cfg.icon}
          {cfg.label}
        </span>
      )}
    </div>
  );
};
