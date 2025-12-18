import { Link } from 'react-router-dom';
import type { RunSummary } from '../api/client';

interface RunTableProps {
  runs: RunSummary[];
  loading?: boolean;
}

function StatusIndicator({ status }: { status: RunSummary['status'] }) {
  const labels: Record<RunSummary['status'], string> = {
    queued: 'Queued',
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
    canceled: 'Canceled',
  };

  return (
    <span className="inline-flex items-center text-[14px] text-[#888]">
      {status === 'running' && (
        <span className="w-1.5 h-1.5 rounded-full bg-white mr-2 animate-pulse" />
      )}
      {labels[status]}
    </span>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

export default function RunTable({ runs, loading }: RunTableProps) {
  if (loading) {
    return (
      <div className="border-t border-[#1a1a1a]">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 border-b border-[#1a1a1a] animate-pulse">
            <div className="h-full flex items-center">
              <div className="w-32 h-4 bg-[#1a1a1a] rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="border-t border-[#1a1a1a] py-16 text-center">
        <p className="text-[15px] text-[#666] mb-4">No runs yet</p>
        <Link
          to="/runs/new"
          className="text-[14px] text-white hover:opacity-70 transition-opacity"
        >
          Start a Run →
        </Link>
      </div>
    );
  }

  return (
    <div className="border-t border-[#1a1a1a]">
      {runs.map((run) => (
        <Link
          key={run.run_id}
          to={`/runs/${run.run_id}`}
          className="grid grid-cols-[200px_1fr_120px_100px] gap-8 py-4 border-b border-[#1a1a1a] hover:bg-[#111] transition-colors group"
        >
          <div>
            <span className="text-[15px] text-white">
              {run.benchmark}
            </span>
          </div>
          <div>
            <span className="text-[14px] text-[#666]">
              {run.model}
            </span>
          </div>
          <div>
            <StatusIndicator status={run.status} />
          </div>
          <div className="text-right">
            <span className="text-[14px] text-[#666]">
              {formatDate(run.created_at)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
