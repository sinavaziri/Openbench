import { 
  BookOpen, 
  Code, 
  Calculator, 
  Beaker, 
  Brain, 
  Shield, 
  FileText, 
  Sparkles, 
  Layers,
  LucideIcon
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  knowledge: BookOpen,
  coding: Code,
  math: Calculator,
  science: Beaker,
  commonsense: Brain,
  safety: Shield,
  reading: FileText,
  diverse: Sparkles,
};

export function getCategoryIcon(category: string): LucideIcon {
  const normalizedCategory = category.toLowerCase();
  return iconMap[normalizedCategory] || Layers;
}

