import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, Benchmark, RunConfig } from '../api/client';
import Layout from '../components/Layout';
import RunForm from '../components/RunForm';

export default function NewRun() {
  const navigate = useNavigate();
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBenchmarks();
  }, []);

  const loadBenchmarks = async () => {
    try {
      const data = await api.listBenchmarks();
      setBenchmarks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load benchmarks');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (config: RunConfig) => {
    setSubmitting(true);
    setError(null);

    try {
      const result = await api.createRun(config);
      navigate(`/runs/${result.run_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start run');
      setSubmitting(false);
    }
  };

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
        <h1 className="text-[28px] text-white tracking-tight">
          New Benchmark Run
        </h1>
        <p className="text-[15px] text-[#666] mt-2">
          Configure and start a new benchmark evaluation
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-8 py-3 px-4 border border-[#333] text-[14px] text-[#888]">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="max-w-2xl">
        {loading ? (
          <div className="space-y-8">
            <div className="h-6 w-32 bg-[#1a1a1a] rounded animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-[#1a1a1a] rounded animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <RunForm
            benchmarks={benchmarks}
            onSubmit={handleSubmit}
            loading={submitting}
          />
        )}
      </div>
    </Layout>
  );
}
