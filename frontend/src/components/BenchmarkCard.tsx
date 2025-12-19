import { Benchmark } from '../api/client';
import { getCategoryIcon } from '../utils/categoryIcons';

interface BenchmarkCardProps {
  benchmark: Benchmark;
  onClick: () => void;
  isSelected?: boolean;
}

export default function BenchmarkCard({ benchmark, onClick, isSelected }: BenchmarkCardProps) {
  const Icon = getCategoryIcon(benchmark.category || '');
  
  return (
    <div
      onClick={onClick}
      className={`
        p-6 space-y-4 cursor-pointer transition-colors
        bg-[#0a0a0a] 
        ${isSelected 
          ? 'border border-white bg-[#111]' 
          : 'border border-[#1a1a1a] hover:border-[#333]'
        }
      `}
    >
      {/* Icon */}
      <div>
        <Icon size={20} className="text-[#666]" />
      </div>

      {/* Name */}
      <h3 className="text-[14px] text-white font-medium">
        {benchmark.name}
      </h3>

      {/* Metadata */}
      <div className="text-[11px] text-[#666]">
        {benchmark.category && (
          <>
            {benchmark.category}
            {benchmark.tags && benchmark.tags.length > 0 && ' · '}
          </>
        )}
        {benchmark.tags?.slice(0, 2).join(' · ')}
      </div>

      {/* Description */}
      <p className="text-[13px] text-[#888] line-clamp-3">
        {benchmark.description || 'No description available'}
      </p>
    </div>
  );
}

