import React, { useState } from 'react';
import { 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  FileText, 
  FolderGit2, 
  Server, 
  Layers, 
  ArrowUpRight, 
  Filter, 
  Sparkles,
  User,
  Plus
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { ActivityLogItem, ActivityCategory, ActivityStatus } from '../../types';

interface RecentActivityFeedProps {
  className?: string;
  maxItems?: number;
}

export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({ 
  className = '',
  maxItems = 6
}) => {
  const { activityLogs, addActivityLog, setActiveModule } = useProject();
  const [selectedFilter, setSelectedFilter] = useState<'all' | ActivityCategory>('all');
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);

  // Status configuration mapping
  const getStatusBadge = (status: ActivityStatus) => {
    switch (status) {
      case 'completed':
        return {
          label: 'Completed',
          dotColor: 'bg-[#00D6A0]',
          glowClass: 'shadow-[0_0_8px_#00D6A0]',
          badgeBg: 'bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/30',
          icon: CheckCircle2
        };
      case 'verified':
        return {
          label: 'Verified',
          dotColor: 'bg-[#18D8F2]',
          glowClass: 'shadow-[0_0_8px_#18D8F2]',
          badgeBg: 'bg-[#18D8F2]/15 text-[#18D8F2] border-[#18D8F2]/30',
          icon: CheckCircle2
        };
      case 'warning':
        return {
          label: 'Attention',
          dotColor: 'bg-[#FF9A24]',
          glowClass: 'shadow-[0_0_8px_#FF9A24]',
          badgeBg: 'bg-[#FF9A24]/15 text-[#FF9A24] border-[#FF9A24]/30',
          icon: AlertTriangle
        };
      case 'in_progress':
      default:
        return {
          label: 'Active',
          dotColor: 'bg-[#8B5CFF]',
          glowClass: 'shadow-[0_0_8px_#8B5CFF]',
          badgeBg: 'bg-[#8B5CFF]/15 text-[#8B5CFF] border-[#8B5CFF]/30',
          icon: Clock
        };
    }
  };

  // Category icon mapping
  const getCategoryIcon = (category: ActivityCategory) => {
    switch (category) {
      case 'cad':
        return { icon: Cpu, color: 'text-[#8B5CFF]', bg: 'bg-[#8B5CFF]/15 border-[#8B5CFF]/30' };
      case 'report':
        return { icon: FileText, color: 'text-[#18D8F2]', bg: 'bg-[#18D8F2]/15 border-[#18D8F2]/30' };
      case 'panel':
        return { icon: Server, color: 'text-[#FF9A24]', bg: 'bg-[#FF9A24]/15 border-[#FF9A24]/30' };
      case 'scanner':
        return { icon: Layers, color: 'text-[#18D8F2]', bg: 'bg-[#18D8F2]/15 border-[#18D8F2]/30' };
      case 'bom':
        return { icon: Sparkles, color: 'text-[#00D6A0]', bg: 'bg-[#00D6A0]/15 border-[#00D6A0]/30' };
      case 'project':
      default:
        return { icon: FolderGit2, color: 'text-[#147DFF]', bg: 'bg-[#147DFF]/15 border-[#147DFF]/30' };
    }
  };

  const filteredLogs = activityLogs
    .filter(log => selectedFilter === 'all' || log.category === selectedFilter)
    .slice(0, maxItems);

  // Quick Action: Simulate dynamic engineer action
  const handleQuickLog = (actionName: string, category: ActivityCategory, details: string, moduleTarget?: any) => {
    addActivityLog({
      action: actionName,
      details,
      category,
      status: 'completed',
      user: 'Olimjon K.',
      moduleTarget
    });
  };

  return (
    <div className={`rounded-2xl bg-[#0B1C32]/85 backdrop-blur-xl border border-[#1B3A5C] p-5 shadow-xl shadow-black/30 flex flex-col justify-between ${className}`}>
      {/* Feed Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1B3A5C]/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#147DFF]/15 border border-[#147DFF]/30 flex items-center justify-center text-[#18D8F2]">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#F4F8FF] tracking-tight">Recent Activity Feed</h3>
                <span className="w-2 h-2 rounded-full bg-[#00D6A0] animate-pulse" />
              </div>
              <p className="text-[11px] text-[#9EB2CC]">Real-time engineering event audit trail & workspace modifications</p>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Events' },
              { id: 'cad', label: 'CAD & SLD' },
              { id: 'report', label: 'Reports' },
              { id: 'panel', label: 'Panels' },
              { id: 'project', label: 'Projects' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors border ${
                  selectedFilter === tab.id
                    ? 'bg-[#147DFF]/20 text-[#18D8F2] border-[#147DFF]/40 font-bold'
                    : 'bg-[#061426]/70 text-[#9EB2CC] border-[#1B3A5C] hover:text-[#F4F8FF]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Activity Log List */}
        <div className="mt-4 divide-y divide-[#1B3A5C]/40">
          {filteredLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#9EB2CC] font-mono">
              No recent log entries matching this category filter.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const statusCfg = getStatusBadge(log.status);
              const catCfg = getCategoryIcon(log.category);
              const CatIcon = catCfg.icon;

              return (
                <div
                  key={log.id}
                  onClick={() => log.moduleTarget && setActiveModule(log.moduleTarget)}
                  className={`py-3.5 px-2 rounded-xl transition-all duration-200 group flex items-start justify-between gap-3 ${
                    log.moduleTarget ? 'hover:bg-[#10243D]/60 cursor-pointer' : ''
                  }`}
                >
                  {/* Left: Category Icon + Status Indicator Dot */}
                  <div className="relative shrink-0 mt-0.5">
                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105 ${catCfg.bg}`}>
                      <CatIcon className={`w-4 h-4 ${catCfg.color}`} />
                    </div>

                    {/* Small Status Indicator Dot on corner */}
                    <span 
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#0B1C32] ${statusCfg.dotColor} ${statusCfg.glowClass}`}
                      title={`Status: ${statusCfg.label}`}
                    />
                  </div>

                  {/* Middle: Action title, description, and metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[#F4F8FF] group-hover:text-[#18D8F2] transition-colors">
                        {log.action}
                      </span>

                      {/* Small Status Badge */}
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold flex items-center gap-1 ${statusCfg.badgeBg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`} />
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Engineering Detail Summary */}
                    <p className="text-[11px] text-[#9EB2CC] mt-0.5 leading-snug line-clamp-2">
                      {log.details}
                    </p>

                    {/* User and Precise Time Meta */}
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-[#9EB2CC]/80">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-[#18D8F2]" />
                        {log.user}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#9EB2CC]" />
                        {log.timestamp} ({log.exactTime})
                      </span>
                    </div>
                  </div>

                  {/* Right: Module Direct Navigation Jump */}
                  {log.moduleTarget && (
                    <div className="shrink-0 pt-1 text-[#9EB2CC] group-hover:text-[#18D8F2] group-hover:translate-x-0.5 transition-all">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Quick Action Bar */}
      <div className="mt-4 pt-3 border-t border-[#1B3A5C]/70 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#9EB2CC]">Quick Actions:</span>
          <button
            onClick={() => handleQuickLog('Updated CAD Drawing', 'cad', 'Recalculated line impedance and voltage drops for all branch circuits', 'cad')}
            className="px-2 py-0.5 bg-[#061426] hover:bg-[#10243D] text-[10px] font-mono text-[#8B5CFF] rounded border border-[#8B5CFF]/30 transition-colors"
          >
            + Log CAD Edit
          </button>
          <button
            onClick={() => handleQuickLog('Exported Report', 'report', 'Exported comprehensive single-line diagram and BOM certificate to PDF', 'reports')}
            className="px-2 py-0.5 bg-[#061426] hover:bg-[#10243D] text-[10px] font-mono text-[#18D8F2] rounded border border-[#18D8F2]/30 transition-colors"
          >
            + Log Export
          </button>
        </div>

        <button
          onClick={() => setActiveModule('reports')}
          className="text-[11px] font-semibold text-[#18D8F2] hover:underline flex items-center gap-1 font-mono"
        >
          <span>Full Audit Log &rarr;</span>
        </button>
      </div>
    </div>
  );
};
