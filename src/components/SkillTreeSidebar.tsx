"use client";

import { useEffect, useState, useCallback } from 'react';
import {
  Brain,
  Sparkles,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  Target,
  X,
  RotateCcw,
  BookOpen,
  Shield
} from 'lucide-react';
import {
  SkillWithProgress,
  getSkillTreeWithProgress,
  getRecommendedSkill,
  SkillRecommendation,
  getMasteryColor,
  getMasteryLabel
} from '@/utils/skill-engine';

interface SkillTreeSidebarProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  selectedSkill: SkillWithProgress | null;
  onSelectSkill: (skill: SkillWithProgress | null) => void;
}

export default function SkillTreeSidebar({
  userId,
  isOpen,
  onClose,
  selectedSkill,
  onSelectSkill,
}: SkillTreeSidebarProps) {
  const [skills, setSkills] = useState<SkillWithProgress[]>([]);
  const [recommendation, setRecommendation] = useState<SkillRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [treeData, recData] = await Promise.all([
        getSkillTreeWithProgress(userId),
        getRecommendedSkill(userId),
      ]);

      // Flatten tree to flat list for prerequisite checking
      const allNodes: SkillWithProgress[] = [];
      const collectNodes = (nodes: SkillWithProgress[]) => {
        for (const n of nodes) {
          allNodes.push(n);
          if (n.children) collectNodes(n.children);
        }
      };
      collectNodes(treeData);

      // Build ID lookup map
      const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

      // Mark prerequisites: a skill is unlocked if its parent has mastery >= 0.6
      for (const node of allNodes) {
        if (node.parent_id) {
          const parent = nodeMap.get(node.parent_id);
          node.prerequisites_met = parent ? parent.mastery_level >= 0.6 : false;
        } else {
          node.prerequisites_met = true;
        }
      }

      setSkills(treeData);
      setRecommendation(recData);

      // Auto-expand root nodes
      const initialExpanded = new Set<string>();
      treeData.forEach((node) => initialExpanded.add(node.id));
      setExpandedNodes(initialExpanded);
    } catch (err) {
      console.error('Error loading skill tree data:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen && userId) {
      loadData();
    }
  }, [isOpen, userId, loadData]);

  const toggleNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredSkills = skills.filter((skill) => {
    if (subjectFilter === 'all') return true;
    return skill.subject === subjectFilter;
  });

  const renderTreeNode = (node: SkillWithProgress, depth = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedSkill?.id === node.id;
    const masteryPct = Math.round((node.mastery_level || 0) * 100);
    const isLocked = node.prerequisites_met === false;

    return (
      <div key={node.id} className="flex flex-col">
        <div
          onClick={() => {
            if (isLocked) return;
            onSelectSkill(isSelected ? null : node);
          }}
          title={isLocked ? 'Prerequisites not met' : undefined}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          className={`flex items-center justify-between py-2 pr-3 border-l-2 transition-all group ${
            isLocked
              ? 'opacity-50 cursor-not-allowed border-transparent text-black'
              : 'cursor-pointer ' +
                (isSelected
                  ? 'bg-black text-white border-black font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'hover:bg-black/5 border-transparent text-black')
          }`}
        >
          {/* Left: Icon + Expand Toggle + Name */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {hasChildren ? (
              <button
                onClick={(e) => toggleNode(node.id, e)}
                className="p-0.5 hover:bg-black/10 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown size={14} className={isSelected ? 'text-white' : 'text-black'} />
                ) : (
                  <ChevronRight size={14} className={isSelected ? 'text-white' : 'text-black'} />
                )}
              </button>
            ) : (
              <div className="w-3.5" />
            )}

            <span className="text-sm flex-shrink-0">
              {isLocked ? <Shield size={14} /> : (node.icon || '📚')}
            </span>
            <span className="text-[11px] uppercase tracking-tight truncate font-bold">
              {node.name}
            </span>
            {isLocked && (
              <span className="ml-2 text-[8px] font-bold uppercase tracking-widest text-red-600 bg-red-50 px-1.5 py-0.5 border border-red-200 rounded">
                LOCKED
              </span>
            )}
          </div>

          {/* Right: Mastery Badge */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div
              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-full ${
                isSelected
                  ? 'bg-white text-black border-white'
                  : 'bg-white text-black border-black/20'
              }`}
            >
              {masteryPct}%
            </div>
          </div>
        </div>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div className="flex flex-col">
            {node.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs font-sans">
      <div className="w-full max-w-md bg-white border-l-4 border-black h-full flex flex-col shadow-[-12px_0px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-right duration-300">
        {/* ==================== HEADER ==================== */}
        <div className="p-4 border-b-2 border-black flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center bg-black text-white">
              <Brain size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider">SKILL TREE & PATH</h2>
              <p className="text-[9px] font-bold uppercase tracking-widest text-black/50">
                ADAPTIVE LEARNING DAG
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 border-2 border-black rounded-full hover:bg-black hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ==================== RECOMMENDED NEXT CARD ==================== */}
        {recommendation && (
          <div className="p-4 border-b-2 border-black bg-amber-50">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-amber-600 fill-amber-500" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-amber-900">
                RECOMMENDED NEXT SKILL
              </span>
            </div>

            <div className="border-2 border-black p-3 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{recommendation.skill.icon}</span>
                    <h3 className="text-xs font-bold uppercase tracking-tight">
                      {recommendation.skill.name}
                    </h3>
                  </div>
                  <p className="text-[10px] text-black/60 font-medium italic mb-2">
                    &ldquo;{recommendation.reason}&rdquo;
                  </p>
                </div>
              </div>

              <button
                onClick={() => onSelectSkill(recommendation.skill)}
                className="w-full mt-2 py-1.5 border-2 border-black bg-black text-white hover:bg-white hover:text-black font-bold uppercase text-[9px] tracking-widest transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
              >
                SELECT RECOMMENDED FOCUS →
              </button>
            </div>
          </div>
        )}

        {/* ==================== SUBJECT FILTER TABS ==================== */}
        <div className="p-3 border-b-2 border-black flex gap-1.5 overflow-x-auto bg-gray-50 scrollbar-none">
          {[
            { id: 'all', label: 'ALL' },
            { id: 'mathematics', label: 'MATH' },
            { id: 'computer_science', label: 'CS' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSubjectFilter(tab.id)}
              className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded-full border transition-all ${
                subjectFilter === tab.id
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black/60 border-black/20 hover:border-black'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ==================== ACTIVE FOCUS BANNER ==================== */}
        {selectedSkill && (
          <div className="p-3 bg-black text-white flex items-center justify-between border-b-2 border-black">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-green-400 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                FOCUS: {selectedSkill.name}
              </span>
            </div>
            <button
              onClick={() => onSelectSkill(null)}
              className="text-[9px] font-bold uppercase underline tracking-widest hover:text-red-300"
            >
              CLEAR
            </button>
          </div>
        )}

        {/* ==================== TREE LIST AREA ==================== */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="space-y-2 px-2">
              {[3/4, 1/2, 2/3, 3/4, 1/2, 2/3].map((width, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse" />
                  <div className={`h-4 bg-gray-200 animate-pulse rounded flex-1 ${width === 3/4 ? 'max-w-[75%]' : width === 1/2 ? 'max-w-[50%]' : 'max-w-[66%]'}`} />
                  <div className="w-12 h-5 bg-gray-200 animate-pulse rounded-full" />
                </div>
              ))}
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="p-8 text-center text-xs font-bold uppercase tracking-widest text-black/40">
              NO SKILLS FOUND FOR SUBJECT
            </div>
          ) : (
            <div className="space-y-1">
              {filteredSkills.map((rootNode) => renderTreeNode(rootNode))}
            </div>
          )}
        </div>

        {/* ==================== FOOTER STATS ==================== */}
        <div className="p-3 border-t-2 border-black bg-white flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-black/50">
          <span>NEWTON SKILL ENGINE v2.0</span>
          <span>{skills.length} NODES LOADED</span>
        </div>
      </div>
    </div>
  );
}
