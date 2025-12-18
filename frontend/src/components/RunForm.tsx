import { useEffect, useState } from 'react';
import type { ApiKeyPublic, Benchmark, RunConfig } from '../api/client';

interface RunFormProps {
  benchmarks: Benchmark[];
  apiKeys: ApiKeyPublic[];
  onSubmit: (config: RunConfig) => void;
  loading?: boolean;
  prefill?: RunConfig;  // Pre-fill form from "Run Again"
}

// Models organized by provider
const MODEL_PROVIDERS = [
  {
    name: 'OpenAI',
    prefix: 'openai',
    models: [
      { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'Most capable, multimodal' },
      { id: 'openai/gpt-4o-2024-11-20', name: 'GPT-4o (2024-11-20)', description: 'Latest version' },
      { id: 'openai/gpt-4o-2024-08-06', name: 'GPT-4o (2024-08-06)', description: 'Structured outputs' },
      { id: 'openai/gpt-4o-2024-05-13', name: 'GPT-4o (2024-05-13)', description: 'Original release' },
      { id: 'openai/chatgpt-4o-latest', name: 'ChatGPT-4o Latest', description: 'Dynamic, latest ChatGPT' },
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and affordable' },
      { id: 'openai/gpt-4o-mini-2024-07-18', name: 'GPT-4o Mini (2024-07-18)', description: 'Snapshot version' },
      { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', description: '128k context' },
      { id: 'openai/gpt-4-turbo-2024-04-09', name: 'GPT-4 Turbo (2024-04-09)', description: 'Vision capable' },
      { id: 'openai/gpt-4-turbo-preview', name: 'GPT-4 Turbo Preview', description: 'Preview version' },
      { id: 'openai/gpt-4-0125-preview', name: 'GPT-4 (0125 Preview)', description: 'Preview snapshot' },
      { id: 'openai/gpt-4-1106-preview', name: 'GPT-4 (1106 Preview)', description: 'November 2023' },
      { id: 'openai/gpt-4', name: 'GPT-4', description: 'Original GPT-4' },
      { id: 'openai/gpt-4-0613', name: 'GPT-4 (0613)', description: 'June 2023' },
      { id: 'openai/gpt-4-32k', name: 'GPT-4 32k', description: 'Extended context' },
      { id: 'openai/gpt-4-32k-0613', name: 'GPT-4 32k (0613)', description: 'June 2023, 32k' },
      { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and economical' },
      { id: 'openai/gpt-3.5-turbo-0125', name: 'GPT-3.5 Turbo (0125)', description: 'January 2024' },
      { id: 'openai/gpt-3.5-turbo-1106', name: 'GPT-3.5 Turbo (1106)', description: 'November 2023' },
      { id: 'openai/gpt-3.5-turbo-16k', name: 'GPT-3.5 Turbo 16k', description: '16k context window' },
      { id: 'openai/o1-preview', name: 'o1 Preview', description: 'Reasoning model' },
      { id: 'openai/o1-mini', name: 'o1 Mini', description: 'Faster reasoning' },
    ]
  },
  {
    name: 'Anthropic',
    prefix: 'anthropic',
    models: [
      { id: 'anthropic/claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Oct 2024)', description: 'Latest and most capable' },
      { id: 'anthropic/claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet (Jun 2024)', description: 'Previous version' },
      { id: 'anthropic/claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most powerful, 200k context' },
      { id: 'anthropic/claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance' },
      { id: 'anthropic/claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fastest and compact' },
      { id: 'anthropic/claude-2.1', name: 'Claude 2.1', description: '200k context window' },
      { id: 'anthropic/claude-2', name: 'Claude 2', description: 'Previous generation' },
      { id: 'anthropic/claude-instant-1.2', name: 'Claude Instant 1.2', description: 'Fast and affordable' },
    ]
  },
  {
    name: 'Google',
    prefix: 'google',
    models: [
      { id: 'google/gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Exp)', description: 'Latest experimental' },
      { id: 'google/gemini-exp-1206', name: 'Gemini Exp 1206', description: 'Experimental model' },
      { id: 'google/gemini-exp-1121', name: 'Gemini Exp 1121', description: 'Nov experimental' },
      { id: 'google/gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro (Latest)', description: 'Dynamic latest' },
      { id: 'google/gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: '2M token context' },
      { id: 'google/gemini-1.5-pro-002', name: 'Gemini 1.5 Pro 002', description: 'Stable version' },
      { id: 'google/gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash (Latest)', description: 'Dynamic latest' },
      { id: 'google/gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast, 1M context' },
      { id: 'google/gemini-1.5-flash-002', name: 'Gemini 1.5 Flash 002', description: 'Stable version' },
      { id: 'google/gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B', description: 'Smaller, faster' },
      { id: 'google/gemini-pro', name: 'Gemini Pro', description: '1.0 generation' },
      { id: 'google/gemini-pro-vision', name: 'Gemini Pro Vision', description: 'Multimodal 1.0' },
    ]
  },
  {
    name: 'Meta Llama',
    prefix: 'meta-llama',
    models: [
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct', description: 'Latest Dec 2024' },
      { id: 'meta-llama/llama-3.2-90b-vision-instruct', name: 'Llama 3.2 90B Vision', description: 'Multimodal' },
      { id: 'meta-llama/llama-3.2-11b-vision-instruct', name: 'Llama 3.2 11B Vision', description: 'Compact vision' },
      { id: 'meta-llama/llama-3.2-3b-instruct', name: 'Llama 3.2 3B Instruct', description: 'Efficient' },
      { id: 'meta-llama/llama-3.2-1b-instruct', name: 'Llama 3.2 1B Instruct', description: 'Smallest 3.2' },
      { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B Instruct', description: 'Largest flagship' },
      { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B Instruct', description: 'Balanced power' },
      { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B Instruct', description: 'Fast and efficient' },
      { id: 'meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B Instruct', description: 'Original 3.0 70B' },
      { id: 'meta-llama/llama-3-8b-instruct', name: 'Llama 3 8B Instruct', description: 'Original 3.0 8B' },
      { id: 'meta-llama/llama-2-70b-chat', name: 'Llama 2 70B Chat', description: 'Previous gen 70B' },
      { id: 'meta-llama/llama-2-13b-chat', name: 'Llama 2 13B Chat', description: 'Previous gen 13B' },
      { id: 'meta-llama/llama-2-7b-chat', name: 'Llama 2 7B Chat', description: 'Previous gen 7B' },
    ]
  },
  {
    name: 'Mistral AI',
    prefix: 'mistral',
    models: [
      { id: 'mistral/mistral-large-latest', name: 'Mistral Large (Latest)', description: 'Dynamic latest' },
      { id: 'mistral/mistral-large-2411', name: 'Mistral Large (2411)', description: 'Nov 2024, 128k context' },
      { id: 'mistral/mistral-large-2407', name: 'Mistral Large (2407)', description: 'July 2024' },
      { id: 'mistral/mistral-medium-latest', name: 'Mistral Medium (Latest)', description: 'Balanced, latest' },
      { id: 'mistral/mistral-medium-2312', name: 'Mistral Medium (2312)', description: 'Dec 2023' },
      { id: 'mistral/mistral-small-latest', name: 'Mistral Small (Latest)', description: 'Fast, latest' },
      { id: 'mistral/mistral-small-2402', name: 'Mistral Small (2402)', description: 'Feb 2024' },
      { id: 'mistral/pixtral-large-latest', name: 'Pixtral Large (Latest)', description: 'Multimodal, latest' },
      { id: 'mistral/pixtral-12b', name: 'Pixtral 12B', description: 'Vision model' },
      { id: 'mistral/mixtral-8x22b-instruct', name: 'Mixtral 8x22B Instruct', description: 'Large MoE' },
      { id: 'mistral/mixtral-8x7b-instruct', name: 'Mixtral 8x7B Instruct', description: 'Original MoE' },
      { id: 'mistral/mistral-7b-instruct', name: 'Mistral 7B Instruct', description: 'Original 7B' },
      { id: 'mistral/codestral-latest', name: 'Codestral (Latest)', description: 'Code generation' },
      { id: 'mistral/codestral-2405', name: 'Codestral (2405)', description: 'May 2024 code' },
    ]
  },
  {
    name: 'Cohere',
    prefix: 'cohere',
    models: [
      { id: 'cohere/command-r-plus', name: 'Command R+', description: 'Most capable, 128k' },
      { id: 'cohere/command-r-plus-08-2024', name: 'Command R+ (Aug 2024)', description: 'Latest snapshot' },
      { id: 'cohere/command-r', name: 'Command R', description: 'Balanced RAG' },
      { id: 'cohere/command-r-08-2024', name: 'Command R (Aug 2024)', description: 'Latest snapshot' },
      { id: 'cohere/command', name: 'Command', description: 'Standard model' },
      { id: 'cohere/command-light', name: 'Command Light', description: 'Fast and efficient' },
      { id: 'cohere/command-nightly', name: 'Command Nightly', description: 'Latest experimental' },
    ]
  },
  {
    name: 'Groq',
    prefix: 'groq',
    models: [
      { id: 'groq/llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', description: 'Ultra-fast inference' },
      { id: 'groq/llama-3.3-70b-specdec', name: 'Llama 3.3 70B SpecDec', description: 'Speculative decoding' },
      { id: 'groq/llama-3.1-405b-reasoning', name: 'Llama 3.1 405B Reasoning', description: 'Largest Llama model' },
      { id: 'groq/llama-3.1-70b-versatile', name: 'Llama 3.1 70B Versatile', description: 'Fast 70B' },
      { id: 'groq/llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', description: 'Fastest response' },
      { id: 'groq/llama-3.2-1b-preview', name: 'Llama 3.2 1B Preview', description: 'Smallest Llama 3.2' },
      { id: 'groq/llama-3.2-3b-preview', name: 'Llama 3.2 3B Preview', description: 'Small efficient' },
      { id: 'groq/llama-3.2-11b-vision-preview', name: 'Llama 3.2 11B Vision', description: 'Vision capable' },
      { id: 'groq/llama-3.2-90b-vision-preview', name: 'Llama 3.2 90B Vision', description: 'Large vision' },
      { id: 'groq/llama-3-70b-8192', name: 'Llama 3 70B', description: '8k context' },
      { id: 'groq/llama-3-8b-8192', name: 'Llama 3 8B', description: '8k context' },
      { id: 'groq/llama-guard-3-8b', name: 'Llama Guard 3 8B', description: 'Safety model' },
      { id: 'groq/mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: '32k context' },
      { id: 'groq/gemma2-9b-it', name: 'Gemma 2 9B', description: 'Fast Gemma' },
      { id: 'groq/gemma-7b-it', name: 'Gemma 7B', description: 'Google Gemma' },
      { id: 'groq/distil-whisper-large-v3-en', name: 'Distil Whisper Large v3', description: 'Speech-to-text' },
      { id: 'groq/whisper-large-v3', name: 'Whisper Large v3', description: 'OpenAI Whisper' },
      { id: 'groq/whisper-large-v3-turbo', name: 'Whisper Large v3 Turbo', description: 'Fast transcription' },
    ]
  },
  {
    name: 'xAI',
    prefix: 'xai',
    models: [
      { id: 'xai/grok-beta', name: 'Grok Beta', description: 'Latest Grok model' },
      { id: 'xai/grok-2-1212', name: 'Grok 2 (1212)', description: 'Dec 2024' },
      { id: 'xai/grok-2-latest', name: 'Grok 2 (Latest)', description: 'Dynamic latest' },
      { id: 'xai/grok-2-vision-1212', name: 'Grok 2 Vision (1212)', description: 'Multimodal' },
    ]
  },
  {
    name: 'DeepSeek',
    prefix: 'deepseek',
    models: [
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', description: 'General chat model' },
      { id: 'deepseek/deepseek-coder', name: 'DeepSeek Coder', description: 'Code specialist' },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', description: 'Reasoning model' },
    ]
  },
  {
    name: 'Alibaba Qwen',
    prefix: 'qwen',
    models: [
      { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B Instruct', description: 'Latest flagship' },
      { id: 'qwen/qwen-2.5-32b-instruct', name: 'Qwen 2.5 32B Instruct', description: 'Balanced size' },
      { id: 'qwen/qwen-2.5-14b-instruct', name: 'Qwen 2.5 14B Instruct', description: 'Efficient' },
      { id: 'qwen/qwen-2.5-7b-instruct', name: 'Qwen 2.5 7B Instruct', description: 'Fast' },
      { id: 'qwen/qwen-2-72b-instruct', name: 'Qwen 2 72B Instruct', description: 'Previous gen' },
      { id: 'qwen/qwen-2-7b-instruct', name: 'Qwen 2 7B Instruct', description: 'Small efficient' },
      { id: 'qwen/qwq-32b-preview', name: 'QwQ 32B Preview', description: 'Reasoning model' },
      { id: 'qwen/qwen-2-vl-72b-instruct', name: 'Qwen 2 VL 72B', description: 'Vision-language' },
      { id: 'qwen/qwen-2-vl-7b-instruct', name: 'Qwen 2 VL 7B', description: 'Compact vision' },
    ]
  },
  {
    name: 'Perplexity',
    prefix: 'perplexity',
    models: [
      { id: 'perplexity/llama-3.1-sonar-huge-128k-online', name: 'Sonar Huge 128k Online', description: 'Online search' },
      { id: 'perplexity/llama-3.1-sonar-large-128k-online', name: 'Sonar Large 128k Online', description: 'Online search' },
      { id: 'perplexity/llama-3.1-sonar-large-128k-chat', name: 'Sonar Large 128k Chat', description: 'Chat model' },
      { id: 'perplexity/llama-3.1-sonar-small-128k-online', name: 'Sonar Small 128k Online', description: 'Fast online' },
      { id: 'perplexity/llama-3.1-sonar-small-128k-chat', name: 'Sonar Small 128k Chat', description: 'Fast chat' },
    ]
  },
  {
    name: 'AI21 Labs',
    prefix: 'ai21',
    models: [
      { id: 'ai21/jamba-1-5-large', name: 'Jamba 1.5 Large', description: 'SSM-Transformer hybrid' },
      { id: 'ai21/jamba-1-5-mini', name: 'Jamba 1.5 Mini', description: 'Efficient hybrid' },
      { id: 'ai21/jamba-instruct', name: 'Jamba Instruct', description: 'Original Jamba' },
    ]
  },
  {
    name: 'Amazon',
    prefix: 'amazon',
    models: [
      { id: 'amazon/nova-pro-v1', name: 'Nova Pro v1', description: 'Most capable' },
      { id: 'amazon/nova-lite-v1', name: 'Nova Lite v1', description: 'Fast and affordable' },
      { id: 'amazon/nova-micro-v1', name: 'Nova Micro v1', description: 'Ultra-fast' },
    ]
  },
  {
    name: 'Inflection',
    prefix: 'inflection',
    models: [
      { id: 'inflection/inflection-3-pi', name: 'Inflection 3 Pi', description: 'Personal intelligence' },
      { id: 'inflection/inflection-3-productivity', name: 'Inflection 3 Productivity', description: 'Work focused' },
    ]
  },
  {
    name: 'Microsoft',
    prefix: 'microsoft',
    models: [
      { id: 'microsoft/phi-4', name: 'Phi-4', description: 'Small language model' },
      { id: 'microsoft/phi-3.5-mini-128k-instruct', name: 'Phi-3.5 Mini', description: '128k context' },
      { id: 'microsoft/phi-3-medium-128k-instruct', name: 'Phi-3 Medium', description: 'Balanced' },
      { id: 'microsoft/wizardlm-2-8x22b', name: 'WizardLM-2 8x22B', description: 'MoE model' },
    ]
  },
  {
    name: 'NousResearch',
    prefix: 'nousresearch',
    models: [
      { id: 'nousresearch/hermes-3-llama-3.1-405b', name: 'Hermes 3 405B', description: 'Function calling' },
      { id: 'nousresearch/hermes-3-llama-3.1-70b', name: 'Hermes 3 70B', description: 'Balanced hermes' },
      { id: 'nousresearch/hermes-2-pro-llama-3-8b', name: 'Hermes 2 Pro 8B', description: 'Compact' },
    ]
  },
  {
    name: 'OpenRouter',
    prefix: 'openrouter',
    models: [
      { id: 'openrouter/auto', name: 'Auto (Best)', description: 'Automatically select best model' },
    ]
  },
  {
    name: 'Other',
    prefix: 'other',
    models: [
      { id: 'custom', name: 'Custom Model', description: 'Enter custom model identifier' },
    ]
  }
] as const;

// Map model prefixes to API key providers (some models can use multiple providers)
const MODEL_PREFIX_TO_PROVIDERS: Record<string, string[]> = {
  'openai': ['openai'],
  'anthropic': ['anthropic'],
  'google': ['google'],
  'meta-llama': ['together', 'groq', 'fireworks', 'openrouter'],  // Llama via multiple providers
  'mistral': ['mistral', 'together', 'openrouter'],  // Mistral via multiple providers
  'cohere': ['cohere'],
  'groq': ['groq'],
  'xai': ['openrouter'],  // xAI models via OpenRouter
  'deepseek': ['together', 'openrouter'],  // DeepSeek via Together or OpenRouter
  'qwen': ['together', 'openrouter'],  // Qwen via Together or OpenRouter
  'perplexity': ['openrouter'],  // Perplexity via OpenRouter
  'ai21': ['openrouter'],  // AI21 via OpenRouter
  'amazon': ['openrouter'],  // Amazon Nova via OpenRouter
  'inflection': ['openrouter'],  // Inflection via OpenRouter
  'microsoft': ['openrouter'],  // Microsoft models via OpenRouter
  'nousresearch': ['together', 'openrouter'],  // NousResearch via Together or OpenRouter
  'openrouter': ['openrouter'],
  'other': ['custom'],
};

export default function RunForm({ benchmarks, apiKeys, onSubmit, loading, prefill }: RunFormProps) {
  // Get set of providers the user has API keys for
  const availableProviders = new Set(apiKeys.map(key => key.provider));
  
  // Filter MODEL_PROVIDERS to only include those with available API keys
  const filteredProviders = MODEL_PROVIDERS.filter(provider => {
    const possibleProviders = MODEL_PREFIX_TO_PROVIDERS[provider.prefix] || [];
    // Allow "other" category always, or if user has ANY of the possible provider keys
    return provider.prefix === 'other' || possibleProviders.some(p => availableProviders.has(p as any));
  });
  
  // Check if prefilled model is in our list
  const allModelIds = MODEL_PROVIDERS.flatMap(p => p.models.map(m => m.id)) as readonly string[];
  const isPrefillModelKnown = prefill?.model ? allModelIds.includes(prefill.model) : false;
  
  const [benchmark, setBenchmark] = useState(prefill?.benchmark || '');
  const [model, setModel] = useState(
    prefill?.model 
      ? (isPrefillModelKnown ? prefill.model : 'custom')
      : ''
  );
  const [customModel, setCustomModel] = useState(
    prefill?.model && !isPrefillModelKnown ? prefill.model : ''
  );
  const [limit, setLimit] = useState<number | undefined>(prefill?.limit ?? 10);
  
  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [temperature, setTemperature] = useState<number | undefined>(prefill?.temperature);
  const [topP, setTopP] = useState<number | undefined>(prefill?.top_p);
  const [maxTokens, setMaxTokens] = useState<number | undefined>(prefill?.max_tokens);
  const [timeout, setTimeout] = useState<number | undefined>(prefill?.timeout);
  const [epochs, setEpochs] = useState<number | undefined>(prefill?.epochs);
  const [maxConnections, setMaxConnections] = useState<number | undefined>(prefill?.max_connections);

  // Show advanced settings if any are prefilled
  useEffect(() => {
    if (prefill && (
      prefill.temperature !== undefined ||
      prefill.top_p !== undefined ||
      prefill.max_tokens !== undefined ||
      prefill.timeout !== undefined ||
      prefill.epochs !== undefined ||
      prefill.max_connections !== undefined
    )) {
      setShowAdvanced(true);
    }
  }, [prefill]);

  // Filter out separator/divider entries and invalid benchmarks
  const validBenchmarks = benchmarks.filter((b) => {
    // Filter out entries that are just dividers, separators, or box-drawing characters
    if (!b.name || typeof b.name !== 'string') return false;
    
    // Filter out entries that are only dashes, underscores, or box-drawing characters
    const trimmedName = b.name.trim();
    if (!trimmedName) return false;
    if (/^[─━┄┅┈┉╌╍═_-]+$/.test(trimmedName)) return false;
    if (/^[╭╮╯╰├┤┬┴┼│┃║╠╣╦╩╬]+$/.test(trimmedName)) return false;
    
    // Filter out entries that look like category headers (e.g., "Core Benchmarks")
    if (/^(Core|Community|Custom|Available)\s+(Benchmark|Category)/i.test(trimmedName)) return false;
    
    return true;
  });

  // Separate featured and additional benchmarks
  const featuredBenchmarks = validBenchmarks.filter((b) => b.featured);
  const additionalBenchmarks = validBenchmarks.filter((b) => !b.featured);

  const selectedBenchmark = validBenchmarks.find((b) => b.name === benchmark);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine the final model value
    const finalModel = model === 'custom' ? customModel : model;
    
    if (!benchmark || !finalModel) return;

    const config: RunConfig = {
      benchmark,
      model: finalModel,
      limit,
    };
    
    // Only include advanced settings if they have values
    if (temperature !== undefined) config.temperature = temperature;
    if (topP !== undefined) config.top_p = topP;
    if (maxTokens !== undefined) config.max_tokens = maxTokens;
    if (timeout !== undefined) config.timeout = timeout;
    if (epochs !== undefined) config.epochs = epochs;
    if (maxConnections !== undefined) config.max_connections = maxConnections;

    onSubmit(config);
  };

  const handleNumberInput = (
    value: string, 
    setter: (v: number | undefined) => void,
    isFloat: boolean = false
  ) => {
    if (value === '') {
      setter(undefined);
    } else {
      setter(isFloat ? parseFloat(value) : parseInt(value));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-12">
      {/* Benchmark Selection */}
      <div>
        <p className="text-[11px] text-[#666] uppercase tracking-[0.1em] mb-4">
          Popular Benchmarks
        </p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {featuredBenchmarks.map((b, index) => (
            <button
              key={`${b.name}-${index}`}
              type="button"
              onClick={() => setBenchmark(b.name)}
              className={`relative p-4 text-left transition-all border ${
                benchmark === b.name
                  ? 'border-white bg-[#111]'
                  : 'border-[#222] hover:border-[#444]'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-[15px] text-white break-words flex-1">
                  {b.name}
                </span>
                <span className="text-[11px] text-[#666] uppercase tracking-wide flex-shrink-0">
                  {b.category}
                </span>
              </div>
              <p className="text-[13px] text-[#666] line-clamp-2 break-words">
                {b.description_short}
              </p>
            </button>
          ))}
        </div>

        {/* Additional Benchmarks Dropdown */}
        {additionalBenchmarks.length > 0 && (
          <div>
            <p className="text-[11px] text-[#666] uppercase tracking-[0.1em] mb-3">
              More Benchmarks
            </p>
            <select
              value={additionalBenchmarks.some(b => b.name === benchmark) ? benchmark : ''}
              onChange={(e) => setBenchmark(e.target.value)}
              className="w-full px-4 py-3 bg-[#0c0c0c] border border-[#222] text-white text-[15px] focus:border-white transition-colors appearance-none cursor-pointer hover:border-[#444]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 1rem center',
                backgroundSize: '12px 8px',
              }}
            >
              <option value="">Select additional benchmark...</option>
              {additionalBenchmarks.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name} - {b.description_short}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Model Selection */}
      <div>
        <p className="text-[11px] text-[#666] uppercase tracking-[0.1em] mb-4">
          Model
        </p>
        <select
          id="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full px-4 py-3 bg-[#0c0c0c] border border-[#222] text-white text-[15px] focus:border-white transition-colors appearance-none cursor-pointer hover:border-[#444]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 1rem center',
            backgroundSize: '12px 8px',
          }}
        >
          <option value="" disabled>Select a model...</option>
          {filteredProviders.length === 0 ? (
            <option value="" disabled>No models available - please add API keys in Settings</option>
          ) : (
            filteredProviders.map((provider) => (
              <optgroup key={provider.prefix} label={provider.name}>
                {provider.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} - {m.description}
                  </option>
                ))}
              </optgroup>
            ))
          )}
        </select>
        
        {/* Custom Model Input */}
        {model === 'custom' && (
          <div className="mt-3">
            <input
              type="text"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder="provider/model-name"
              className="w-full px-4 py-3 bg-transparent border border-[#222] text-white placeholder-[#444] text-[15px] focus:border-white transition-colors"
            />
            <p className="text-[13px] text-[#666] mt-2">
              Enter the model identifier in the format: provider/model-name
            </p>
          </div>
        )}
        
        {model && model !== 'custom' && (
          <p className="text-[13px] text-[#666] mt-2">
            Selected: {model}
          </p>
        )}
      </div>

      {/* Limit Input */}
      <div>
        <p className="text-[11px] text-[#666] uppercase tracking-[0.1em] mb-4">
          Sample Limit
          <span className="ml-2 text-[#444] normal-case tracking-normal">(optional)</span>
        </p>
        <input
          id="limit"
          type="number"
          value={limit ?? ''}
          onChange={(e) => handleNumberInput(e.target.value, setLimit)}
          placeholder="10"
          min={1}
          max={10000}
          className="w-32 px-4 py-3 bg-transparent border border-[#222] text-white placeholder-[#444] text-[15px] focus:border-white transition-colors"
        />
        <p className="text-[13px] text-[#666] mt-2">
          Limit the number of samples to run. Leave empty for full benchmark.
        </p>
      </div>

      {/* Advanced Settings Toggle */}
      <div className="border-t border-[#1a1a1a] pt-8">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-3 text-[13px] text-[#888] hover:text-white transition-colors group"
        >
          <span className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </span>
          <span className="uppercase tracking-[0.1em]">Advanced Settings</span>
          {!showAdvanced && (temperature !== undefined || topP !== undefined || maxTokens !== undefined || timeout !== undefined || epochs !== undefined || maxConnections !== undefined) && (
            <span className="text-[11px] text-[#555] normal-case tracking-normal">
              (configured)
            </span>
          )}
        </button>

        {showAdvanced && (
          <div className="mt-6 grid grid-cols-2 gap-6">
            {/* Temperature */}
            <div>
              <label className="block text-[11px] text-[#666] uppercase tracking-[0.1em] mb-2">
                Temperature
              </label>
              <input
                type="number"
                value={temperature ?? ''}
                onChange={(e) => handleNumberInput(e.target.value, setTemperature, true)}
                placeholder="0.0"
                step="0.1"
                min={0}
                max={2}
                className="w-full px-3 py-2 bg-transparent border border-[#222] text-white placeholder-[#444] text-[14px] focus:border-white transition-colors"
              />
              <p className="text-[12px] text-[#555] mt-1.5">
                Controls randomness (0.0 - 2.0)
              </p>
            </div>

            {/* Top P */}
            <div>
              <label className="block text-[11px] text-[#666] uppercase tracking-[0.1em] mb-2">
                Top P
              </label>
              <input
                type="number"
                value={topP ?? ''}
                onChange={(e) => handleNumberInput(e.target.value, setTopP, true)}
                placeholder="1.0"
                step="0.05"
                min={0}
                max={1}
                className="w-full px-3 py-2 bg-transparent border border-[#222] text-white placeholder-[#444] text-[14px] focus:border-white transition-colors"
              />
              <p className="text-[12px] text-[#555] mt-1.5">
                Nucleus sampling (0.0 - 1.0)
              </p>
            </div>

            {/* Max Tokens */}
            <div>
              <label className="block text-[11px] text-[#666] uppercase tracking-[0.1em] mb-2">
                Max Tokens
              </label>
              <input
                type="number"
                value={maxTokens ?? ''}
                onChange={(e) => handleNumberInput(e.target.value, setMaxTokens)}
                placeholder="1024"
                min={1}
                max={128000}
                className="w-full px-3 py-2 bg-transparent border border-[#222] text-white placeholder-[#444] text-[14px] focus:border-white transition-colors"
              />
              <p className="text-[12px] text-[#555] mt-1.5">
                Maximum tokens per response
              </p>
            </div>

            {/* Timeout */}
            <div>
              <label className="block text-[11px] text-[#666] uppercase tracking-[0.1em] mb-2">
                Timeout (seconds)
              </label>
              <input
                type="number"
                value={timeout ?? ''}
                onChange={(e) => handleNumberInput(e.target.value, setTimeout)}
                placeholder="120"
                min={1}
                max={3600}
                className="w-full px-3 py-2 bg-transparent border border-[#222] text-white placeholder-[#444] text-[14px] focus:border-white transition-colors"
              />
              <p className="text-[12px] text-[#555] mt-1.5">
                Request timeout per sample
              </p>
            </div>

            {/* Epochs */}
            <div>
              <label className="block text-[11px] text-[#666] uppercase tracking-[0.1em] mb-2">
                Epochs
              </label>
              <input
                type="number"
                value={epochs ?? ''}
                onChange={(e) => handleNumberInput(e.target.value, setEpochs)}
                placeholder="1"
                min={1}
                max={100}
                className="w-full px-3 py-2 bg-transparent border border-[#222] text-white placeholder-[#444] text-[14px] focus:border-white transition-colors"
              />
              <p className="text-[12px] text-[#555] mt-1.5">
                Number of evaluation passes
              </p>
            </div>

            {/* Max Connections */}
            <div>
              <label className="block text-[11px] text-[#666] uppercase tracking-[0.1em] mb-2">
                Max Connections
              </label>
              <input
                type="number"
                value={maxConnections ?? ''}
                onChange={(e) => handleNumberInput(e.target.value, setMaxConnections)}
                placeholder="10"
                min={1}
                max={100}
                className="w-full px-3 py-2 bg-transparent border border-[#222] text-white placeholder-[#444] text-[14px] focus:border-white transition-colors"
              />
              <p className="text-[12px] text-[#555] mt-1.5">
                Concurrent API connections
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Selected Benchmark Info */}
      {selectedBenchmark && (
        <div className="border-t border-[#1a1a1a] pt-8">
          <p className="text-[11px] text-[#666] uppercase tracking-[0.1em] mb-4">
            Selected Benchmark
          </p>
          <div className="p-5 border border-[#1a1a1a] bg-[#0a0a0a]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[17px] text-white font-medium">
                {selectedBenchmark.name}
              </h3>
              <span className="px-2.5 py-1 text-[11px] text-[#888] border border-[#222] uppercase tracking-wide">
                {selectedBenchmark.category}
              </span>
            </div>
            <p className="text-[14px] text-[#888] leading-relaxed">
              {selectedBenchmark.description || selectedBenchmark.description_short}
            </p>
            {selectedBenchmark.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#1a1a1a]">
                {selectedBenchmark.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-[11px] text-[#666] bg-[#111] border border-[#1a1a1a]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!benchmark || !model || (model === 'custom' && !customModel) || loading}
        className="px-8 py-3 bg-white text-[#0c0c0c] text-[14px] tracking-wide disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
      >
        {loading ? 'Starting...' : 'Start Run'}
      </button>
    </form>
  );
}
