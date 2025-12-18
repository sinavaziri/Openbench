import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, RunDetail as RunDetailType, SSEProgressEvent } from '../api/client';
import Layout from '../components/Layout';
import LogTail from '../components/LogTail';

export default function RunDetail() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<RunDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Live log lines (appended via SSE)
  const [stdoutLines, setStdoutLines] = useState<string[]>([]);
  const [stderrLines, setStderrLines] = useState<string[]>([]);
  const [progress, setProgress] = useState<SSEProgressEvent | null>(null);
  const [isSSEConnected, setIsSSEConnected] = useState(false);
  
  // Refs to track SSE subscription
  const sseCleanup = useRef<(() => void) | null>(null);
  const hasInitializedSSE = useRef(false);

  // Load initial run data
  const loadRun = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getRun(id);
      setRun(data);
      setError(null);
      
      // Initialize log lines from tail if not using SSE yet
      if (!isSSEConnected && data.stdout_tail) {
        setStdoutLines(data.stdout_tail.split('\n'));
      }
      if (!isSSEConnected && data.stderr_tail) {
        setStderrLines(data.stderr_tail.split('\n'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load run');
    } finally {
      setLoading(false);
    }
  }, [id, isSSEConnected]);

  // Subscribe to SSE events
  const subscribeToEvents = useCallback(() => {
    if (!id || hasInitializedSSE.current) return;
    
    hasInitializedSSE.current = true;
    
    const cleanup = api.subscribeToRunEvents(id, {
      onStatus: (event) => {
        setRun((prev) => prev ? { ...prev, status: event.status as RunDetailType['status'] } : null);
      },
      onLogLine: (event) => {
        if (event.stream === 'stdout') {
          setStdoutLines((prev) => [...prev, event.line]);
        } else {
          setStderrLines((prev) => [...prev, event.line]);
        }
      },
      onProgress: (event) => {
        setProgress(event);
      },
      onCompleted: (event) => {
        setRun((prev) => prev ? {
          ...prev,
          status: 'completed',
          exit_code: event.exit_code,
          finished_at: event.finished_at || undefined,
        } : null);
        setIsSSEConnected(false);
      },
      onFailed: (event) => {
        setRun((prev) => prev ? {
          ...prev,
          status: 'failed',
          exit_code: event.exit_code,
          error: event.error || undefined,
          finished_at: event.finished_at || undefined,
        } : null);
        setIsSSEConnected(false);
      },
      onCanceled: (event) => {
        setRun((prev) => prev ? {
          ...prev,
          status: 'canceled',
          finished_at: event.finished_at || undefined,
        } : null);
        setIsSSEConnected(false);
      },
      onError: () => {
        // SSE failed, fall back to polling
        setIsSSEConnected(false);
        hasInitializedSSE.current = false;
      },
    });
    
    sseCleanup.current = cleanup;
    setIsSSEConnected(true);
  }, [id]);

  // Initial load
  useEffect(() => {
    loadRun();
  }, [loadRun]);

  // Start SSE when run is active
  useEffect(() => {
    if (run && (run.status === 'running' || run.status === 'queued')) {
      subscribeToEvents();
    }
    
    return () => {
      if (sseCleanup.current) {
        sseCleanup.current();
        sseCleanup.current = null;
      }
    };
  }, [run?.status, subscribeToEvents]);

  // Polling fallback when SSE is not connected
  useEffect(() => {
    if (!id || isSSEConnected) return;
    
    if (run?.status === 'running' || run?.status === 'queued' || !run) {
      const interval = setInterval(() => {
        loadRun();
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [id, run?.status, isSSEConnected, loadRun]);

  const handleCancel = async () => {
    if (!id) return;
    try {
      await api.cancelRun(id);
      loadRun();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel run');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-8">
          <div className="h-8 w-64 bg-[#1a1a1a] rounded animate-pulse" />
          <div className="grid grid-cols-4 gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-[#1a1a1a] rounded animate-pulse" />
            ))}
          </div>
          <div className="h-64 bg-[#1a1a1a] rounded animate-pulse" />
        </div>
      </Layout>
    );
  }

  if (error || !run) {
    return (
      <Layout>
        <div className="text-center py-16">
          <p className="text-[15px] text-[#888] mb-4">{error || 'Run not found'}</p>
          <Link to="/" className="text-[14px] text-white hover:opacity-70 transition-opacity">
            ← Back to Dashboard
          </Link>
        </div>
      </Layout>
    );
  }

  const statusLabels: Record<RunDetailType['status'], string> = {
    queued: 'Queued',
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
    canceled: 'Canceled',
  };

  const isActive = run.status === 'running' || run.status === 'queued';

  // Combine initial logs with SSE updates
  const displayStdout = stdoutLines.join('\n') || run.stdout_tail || '';
  const displayStderr = stderrLines.join('\n') || run.stderr_tail || '';

  return (
    <Layout>
      {/* Header */}
      <div className="mb-12">
        <Link 
          to="/"
          className="text-[13px] text-[#666] hover:text-white transition-colors mb-4 inline-block"
        >
          ← Back
        </Link>
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-[28px] text-white tracking-tight">
            {run.benchmark}
          </h1>
          <span className="text-[13px] text-[#888] flex items-center">
            {run.status === 'running' && (
              <span className="w-1.5 h-1.5 rounded-full bg-white mr-2 animate-pulse" />
            )}
            {statusLabels[run.status]}
          </span>
          {isSSEConnected && (
            <span className="text-[11px] text-[#4a4] flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-[#4a4]" />
              Live
            </span>
          )}
        </div>
        <p className="text-[15px] text-[#666]">
          {run.model}
        </p>
      </div>

      {/* Progress Bar */}
      {progress && isActive && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] text-[#666]">Progress</span>
            <span className="text-[12px] text-[#888]">
              {progress.current} / {progress.total} ({progress.percentage}%)
            </span>
          </div>
          <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          {progress.message && (
            <p className="text-[12px] text-[#555] mt-2 truncate">
              {progress.message}
            </p>
          )}
        </div>
      )}

      {/* Info Grid */}
      <div className="grid grid-cols-[280px_1fr] gap-16 mb-12">
        <div>
          <p className="text-[11px] text-[#666] uppercase tracking-[0.1em] mb-4">
            Details
          </p>
          <div className="space-y-4">
            <div>
              <p className="text-[12px] text-[#666] mb-1">Run ID</p>
              <p className="text-[14px] text-white font-mono">{run.run_id.slice(0, 8)}</p>
            </div>
            <div>
              <p className="text-[12px] text-[#666] mb-1">Created</p>
              <p className="text-[14px] text-white">{new Date(run.created_at).toLocaleString()}</p>
            </div>
            {run.started_at && (
              <div>
                <p className="text-[12px] text-[#666] mb-1">Started</p>
                <p className="text-[14px] text-white">{new Date(run.started_at).toLocaleString()}</p>
              </div>
            )}
            {run.finished_at && (
              <div>
                <p className="text-[12px] text-[#666] mb-1">Finished</p>
                <p className="text-[14px] text-white">{new Date(run.finished_at).toLocaleString()}</p>
              </div>
            )}
            {run.exit_code !== null && run.exit_code !== undefined && (
              <div>
                <p className="text-[12px] text-[#666] mb-1">Exit Code</p>
                <p className={`text-[14px] font-mono ${run.exit_code === 0 ? 'text-white' : 'text-[#888]'}`}>
                  {run.exit_code}
                </p>
              </div>
            )}
          </div>
          
          {isActive && (
            <button
              onClick={handleCancel}
              className="mt-8 px-4 py-2 text-[13px] text-[#888] border border-[#333] hover:border-[#666] hover:text-white transition-colors"
            >
              Cancel Run
            </button>
          )}
        </div>
        
        <div>
          {/* Configuration */}
          {run.config && Object.keys(run.config).length > 0 && (
            <div className="mb-8">
              <p className="text-[11px] text-[#666] uppercase tracking-[0.1em] mb-4">
                Configuration
              </p>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(run.config)
                  .filter(([key]) => key !== 'schema_version')
                  .map(([key, value]) => (
                  value !== null && value !== undefined && (
                    <div key={key}>
                      <p className="text-[12px] text-[#666] mb-1">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="text-[14px] text-white">{String(value)}</p>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Command - for reproducibility */}
          {run.command && (
            <div className="mb-8">
              <p className="text-[11px] text-[#666] uppercase tracking-[0.1em] mb-4">
                Command
                <span className="ml-2 text-[#444] normal-case tracking-normal">
                  (for reproducibility)
                </span>
              </p>
              <div className="relative group">
                <pre className="px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] text-[13px] text-[#888] font-mono overflow-x-auto">
                  {run.command}
                </pre>
                <button
                  onClick={() => navigator.clipboard.writeText(run.command!)}
                  className="absolute top-2 right-2 px-2 py-1 text-[11px] text-[#666] border border-[#222] bg-[#111] opacity-0 group-hover:opacity-100 hover:text-white hover:border-[#444] transition-all"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {run.error && (
            <div className="mb-8">
              <p className="text-[11px] text-[#666] uppercase tracking-[0.1em] mb-4">
                Error
              </p>
              <pre className="text-[13px] text-[#888] font-mono whitespace-pre-wrap break-words">
                {run.error}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Logs */}
      <div className="space-y-8">
        <div>
          <p className="text-[11px] text-[#666] uppercase tracking-[0.1em] mb-4">
            Output
          </p>
          <LogTail
            title="stdout.log"
            content={displayStdout}
            autoScroll={isActive}
            showAutoScrollToggle={true}
          />
        </div>

        {displayStderr && (
          <div>
            <LogTail
              title="stderr.log"
              content={displayStderr}
              autoScroll={isActive}
              showAutoScrollToggle={true}
            />
          </div>
        )}
      </div>

      {/* Artifacts */}
      {run.artifacts && run.artifacts.length > 0 && (
        <div className="mt-12">
          <p className="text-[11px] text-[#666] uppercase tracking-[0.1em] mb-4">
            Artifacts
          </p>
          <div className="space-y-2">
            {run.artifacts.map((artifact) => (
              <div key={artifact} className="text-[14px] text-[#888] font-mono">
                {artifact}
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
