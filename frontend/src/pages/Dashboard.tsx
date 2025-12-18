import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, RunSummary } from '../api/client';
import Layout from '../components/Layout';
import RunTable from '../components/RunTable';

export default function Dashboard() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRuns();
    
    // Poll for updates every 3 seconds
    const interval = setInterval(loadRuns, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadRuns = async () => {
    try {
      const data = await api.listRuns();
      setRuns(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load runs');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: runs.length,
    running: runs.filter((r) => r.status === 'running').length,
    completed: runs.filter((r) => r.status === 'completed').length,
    failed: runs.filter((r) => r.status === 'failed').length,
  };

  return (
    <Layout>
      {/* Header Section */}
      <div className="grid grid-cols-[280px_1fr] gap-16 mb-16">
        <div>
          <p className="text-[11px] text-[#666] uppercase tracking-[0.1em] mb-4">
            About
          </p>
          <p className="text-[15px] text-white leading-relaxed">
            OpenBench is a benchmarking platform for evaluating AI models. 
            Monitor runs, compare results, and track performance across different evaluations.
          </p>
        </div>
        
        <div>
          <div className="grid grid-cols-4 gap-8">
            <div>
              <p className="text-[11px] text-[#666] uppercase tracking-[0.1em] mb-4">
                Total
              </p>
              <p className="text-[32px] text-white tabular-nums">{stats.total}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#666] uppercase tracking-[0.1em] mb-4">
                Running
              </p>
              <p className="text-[32px] text-white tabular-nums">
                {stats.running > 0 && <span className="inline-block w-2 h-2 rounded-full bg-white mr-3 animate-pulse" />}
                {stats.running}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#666] uppercase tracking-[0.1em] mb-4">
                Completed
              </p>
              <p className="text-[32px] text-white tabular-nums">{stats.completed}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#666] uppercase tracking-[0.1em] mb-4">
                Failed
              </p>
              <p className="text-[32px] text-white tabular-nums">{stats.failed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-8 py-3 px-4 border border-[#333] text-[14px] text-[#888]">
          {error}
        </div>
      )}

      {/* Runs Section */}
      <div>
        <div className="flex items-center justify-between mb-8">
          <p className="text-[11px] text-[#666] uppercase tracking-[0.1em]">
            Recent Runs
          </p>
          <Link
            to="/runs/new"
            className="text-[13px] text-white hover:opacity-70 transition-opacity"
          >
            New Run →
          </Link>
        </div>
        <RunTable runs={runs} loading={loading} />
      </div>
    </Layout>
  );
}
