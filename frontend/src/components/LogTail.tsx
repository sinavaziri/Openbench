import { useEffect, useRef, useState } from 'react';

interface LogTailProps {
  content: string | null | undefined;
  title: string;
  autoScroll?: boolean;
  showAutoScrollToggle?: boolean;
}

export default function LogTail({ 
  content, 
  title, 
  autoScroll: initialAutoScroll = true,
  showAutoScrollToggle = false,
}: LogTailProps) {
  const scrollRef = useRef<HTMLPreElement>(null);
  const [autoScroll, setAutoScroll] = useState(initialAutoScroll);
  const [userScrolled, setUserScrolled] = useState(false);

  // Update autoScroll when prop changes (e.g., when run finishes)
  useEffect(() => {
    setAutoScroll(initialAutoScroll);
  }, [initialAutoScroll]);

  // Auto-scroll to bottom when content changes
  useEffect(() => {
    if (autoScroll && scrollRef.current && !userScrolled) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [content, autoScroll, userScrolled]);

  // Detect manual scrolling
  const handleScroll = () => {
    if (!scrollRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    // If user scrolled away from bottom, disable auto-scroll
    if (!isAtBottom && autoScroll) {
      setUserScrolled(true);
    }
    // If user scrolled back to bottom, re-enable auto-scroll
    if (isAtBottom && userScrolled) {
      setUserScrolled(false);
    }
  };

  const toggleAutoScroll = () => {
    setAutoScroll(!autoScroll);
    setUserScrolled(!autoScroll);
    
    // If enabling auto-scroll, scroll to bottom immediately
    if (!autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setUserScrolled(false);
      setAutoScroll(true);
    }
  };

  const lineCount = content ? content.split('\n').length : 0;

  return (
    <div className="border border-[#1a1a1a]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-[#666]">{title}</span>
          {lineCount > 0 && (
            <span className="text-[11px] text-[#444]">
              {lineCount} lines
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Show "New output" button when user has scrolled away */}
          {userScrolled && autoScroll && (
            <button
              onClick={scrollToBottom}
              className="px-2 py-1 text-[11px] text-[#888] border border-[#333] hover:border-[#555] hover:text-white transition-colors flex items-center gap-1"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 2V8M2 5L5 8L8 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              New output
            </button>
          )}
          
          {/* Auto-scroll toggle */}
          {showAutoScrollToggle && (
            <button
              onClick={toggleAutoScroll}
              className={`px-2 py-1 text-[11px] border transition-colors ${
                autoScroll && !userScrolled
                  ? 'text-white border-[#444] bg-[#1a1a1a]'
                  : 'text-[#666] border-[#222] hover:border-[#333] hover:text-[#888]'
              }`}
              title={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
            >
              {autoScroll && !userScrolled ? 'Auto-scroll on' : 'Auto-scroll off'}
            </button>
          )}
        </div>
      </div>
      
      <pre
        ref={scrollRef}
        onScroll={handleScroll}
        className="p-4 text-[13px] font-mono text-[#888] overflow-x-auto max-h-80 overflow-y-auto whitespace-pre-wrap break-words bg-[#080808]"
      >
        {content || <span className="text-[#444] italic">No output yet...</span>}
      </pre>
    </div>
  );
}
