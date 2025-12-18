const API_BASE = '/api';

export interface Benchmark {
  name: string;
  category: string;
  description_short: string;
  description?: string;  // Full description for detail view
  tags: string[];
}

export interface RunConfig {
  schema_version?: number;  // Config schema version for reproducibility
  benchmark: string;
  model: string;
  limit?: number;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  timeout?: number;
  epochs?: number;
  max_connections?: number;
}

export interface RunSummary {
  run_id: string;
  benchmark: string;
  model: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'canceled';
  created_at: string;
  finished_at?: string;
  primary_metric?: number;
}

export interface RunDetail extends RunSummary {
  started_at?: string;
  artifact_dir?: string;
  exit_code?: number;
  error?: string;
  config?: RunConfig;
  command?: string;  // Exact CLI command for reproducibility
  artifacts: string[];
  stdout_tail?: string;
  stderr_tail?: string;
}

// SSE Event Types
export interface SSEStatusEvent {
  status: string;
  timestamp: string;
}

export interface SSELogLineEvent {
  stream: 'stdout' | 'stderr';
  line: string;
}

export interface SSEProgressEvent {
  current: number;
  total: number;
  percentage: number;
  message?: string;
}

export interface SSECompletedEvent {
  exit_code: number;
  finished_at: string | null;
}

export interface SSEFailedEvent {
  exit_code: number;
  error: string | null;
  finished_at: string | null;
}

export interface SSECanceledEvent {
  finished_at: string | null;
}

export interface SSEHeartbeatEvent {
  timestamp: string;
}

export type SSEEventHandlers = {
  onStatus?: (event: SSEStatusEvent) => void;
  onLogLine?: (event: SSELogLineEvent) => void;
  onProgress?: (event: SSEProgressEvent) => void;
  onCompleted?: (event: SSECompletedEvent) => void;
  onFailed?: (event: SSEFailedEvent) => void;
  onCanceled?: (event: SSECanceledEvent) => void;
  onHeartbeat?: (event: SSEHeartbeatEvent) => void;
  onError?: (error: Error) => void;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  async healthCheck(): Promise<{ status: string }> {
    return this.request('/health');
  }

  async listBenchmarks(): Promise<Benchmark[]> {
    return this.request('/benchmarks');
  }

  async getBenchmark(name: string): Promise<Benchmark> {
    return this.request(`/benchmarks/${name}`);
  }

  async createRun(config: RunConfig): Promise<{ run_id: string }> {
    return this.request('/runs', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async listRuns(limit: number = 50): Promise<RunSummary[]> {
    return this.request(`/runs?limit=${limit}`);
  }

  async getRun(runId: string, logLines: number = 100): Promise<RunDetail> {
    return this.request(`/runs/${runId}?log_lines=${logLines}`);
  }

  async cancelRun(runId: string): Promise<{ status: string }> {
    return this.request(`/runs/${runId}/cancel`, {
      method: 'POST',
    });
  }

  /**
   * Subscribe to run events via Server-Sent Events (SSE).
   * Returns a cleanup function to close the connection.
   */
  subscribeToRunEvents(runId: string, handlers: SSEEventHandlers): () => void {
    const eventSource = new EventSource(`${API_BASE}/runs/${runId}/events`);

    // Handle each event type
    eventSource.addEventListener('status', (e) => {
      try {
        const data = JSON.parse(e.data) as SSEStatusEvent;
        handlers.onStatus?.(data);
      } catch (err) {
        handlers.onError?.(err instanceof Error ? err : new Error('Failed to parse status event'));
      }
    });

    eventSource.addEventListener('log_line', (e) => {
      try {
        const data = JSON.parse(e.data) as SSELogLineEvent;
        handlers.onLogLine?.(data);
      } catch (err) {
        handlers.onError?.(err instanceof Error ? err : new Error('Failed to parse log_line event'));
      }
    });

    eventSource.addEventListener('progress', (e) => {
      try {
        const data = JSON.parse(e.data) as SSEProgressEvent;
        handlers.onProgress?.(data);
      } catch (err) {
        handlers.onError?.(err instanceof Error ? err : new Error('Failed to parse progress event'));
      }
    });

    eventSource.addEventListener('completed', (e) => {
      try {
        const data = JSON.parse(e.data) as SSECompletedEvent;
        handlers.onCompleted?.(data);
        eventSource.close();
      } catch (err) {
        handlers.onError?.(err instanceof Error ? err : new Error('Failed to parse completed event'));
      }
    });

    eventSource.addEventListener('failed', (e) => {
      try {
        const data = JSON.parse(e.data) as SSEFailedEvent;
        handlers.onFailed?.(data);
        eventSource.close();
      } catch (err) {
        handlers.onError?.(err instanceof Error ? err : new Error('Failed to parse failed event'));
      }
    });

    eventSource.addEventListener('canceled', (e) => {
      try {
        const data = JSON.parse(e.data) as SSECanceledEvent;
        handlers.onCanceled?.(data);
        eventSource.close();
      } catch (err) {
        handlers.onError?.(err instanceof Error ? err : new Error('Failed to parse canceled event'));
      }
    });

    eventSource.addEventListener('heartbeat', (e) => {
      try {
        const data = JSON.parse(e.data) as SSEHeartbeatEvent;
        handlers.onHeartbeat?.(data);
      } catch (err) {
        // Heartbeat errors are non-critical
      }
    });

    eventSource.onerror = () => {
      handlers.onError?.(new Error('SSE connection error'));
      eventSource.close();
    };

    // Return cleanup function
    return () => {
      eventSource.close();
    };
  }
}

export const api = new ApiClient();

