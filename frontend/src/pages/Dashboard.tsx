import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, RunSummary } from '../api/client';
import Layout from '../components/Layout';
import RunTable from '../components/RunTable';

export default function Dashboard() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Compare mode state
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const handleToggleCompareMode = () => {
    if (compareMode) {
      // Exit compare mode
      setCompareMode(false);
      setSelectedIds(new Set());
    } else {
      // Enter compare mode
      setCompareMode(true);
    }
  };

  const handleCompare = () => {
    if (selectedIds.size >= 2) {
      const idsParam = Array.from(selectedIds).join(',');
      navigate(`/compare?ids=${idsParam}`);
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
          <div className="flex items-center gap-6">
            <p className="text-[11px] text-[#666] uppercase tracking-[0.1em]">
              Recent Runs
            </p>
            
            {/* Compare Mode Toggle */}
            <button
              onClick={handleToggleCompareMode}
              className={`text-[13px] transition-colors ${
                compareMode 
                  ? 'text-white' 
                  : 'text-[#555] hover:text-white'
              }`}
            >
              {compareMode ? '✕ Cancel' : 'Compare'}
            </button>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Compare Button (when in compare mode) */}
            {compareMode && (
              <button
                onClick={handleCompare}
                disabled={selectedIds.size < 2}
                className={`text-[13px] px-4 py-2 transition-all ${
                  selectedIds.size >= 2
                    ? 'text-black bg-white hover:bg-[#e0e0e0]'
                    : 'text-[#555] bg-[#222] cursor-not-allowed'
                }`}
              >
                Compare {selectedIds.size > 0 && `(${selectedIds.size})`}
              </button>
            )}
            
            <Link
              to="/runs/new"
              className="text-[13px] text-white hover:opacity-70 transition-opacity"
            >
              New Run →
            </Link>
          </div>
        </div>
        
        {/* Selection Info */}
        {compareMode && (
          <div className="mb-4 py-3 px-4 bg-[#111] border border-[#1a1a1a] text-[13px] text-[#888]">
            {selectedIds.size === 0 
              ? 'Select at least 2 runs to compare'
              : selectedIds.size === 1
              ? 'Select 1 more run to compare'
              : `${selectedIds.size} runs selected`
            }
          </div>
        )}
        
        <RunTable 
          runs={runs} 
          loading={loading}
          selectable={compareMode}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </div>
    </Layout>
  );
}
