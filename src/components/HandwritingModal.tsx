"use client";

import { useState, useCallback, useRef } from 'react';
import { Tldraw, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { X, Sparkles, RotateCcw, Loader2 } from 'lucide-react';

interface HandwritingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSkill?: { id: string; name: string; description?: string } | null;
  userId?: string;
  studentName?: string;
}

// Convert plain text to tldraw rich-text doc format
function toRichText(text: string) {
  return {
    type: 'doc',
    content: text.split('\n').filter(Boolean).map((line) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: line }],
    })),
  };
}

// Deep-strip undefined so tldraw never sees an undefined prop
function sanitize(obj: any): any {
  if (Array.isArray(obj)) return obj.map(sanitize);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, sanitize(v)])
    );
  }
  return obj;
}

const VALID_COLORS = new Set([
  'black','grey','light-violet','violet','blue','light-blue',
  'yellow','orange','green','light-green','light-red','red','white',
]);
function normalizeColor(c?: string): string {
  if (!c) return 'blue';
  const l = String(c).toLowerCase().trim();
  if (VALID_COLORS.has(l)) return l;
  if (l === 'gray') return 'grey';
  if (l === 'purple') return 'violet';
  if (l === 'cyan' || l === 'teal') return 'light-blue';
  if (l === 'amber') return 'yellow';
  if (l === 'pink') return 'light-red';
  return 'blue';
}

// Crop tight around dark ink pixels and composite onto solid white background (#ffffff)
// ensureWhiteBackground removed since tldraw exportToBlob handles it natively

export default function HandwritingModal({
  isOpen,
  onClose,
  selectedSkill,
  userId,
  studentName,
}: HandwritingModalProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [status, setStatus] = useState<'idle' | 'capturing' | 'solving' | 'done'>('idle');
  const [ocrText, setOcrText] = useState('');
  const editorRef = useRef<Editor | null>(null);
  const aiShapeIdsRef = useRef<Set<string>>(new Set());

  const handleMount = useCallback((ed: Editor) => {
    setEditor(ed);
    editorRef.current = ed;
    try { (ed as any).setCurrentTool('draw'); } catch (_e) {}
  }, []);

  const handleClear = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    try {
      const shapeIds = (ed as any).getCurrentPageShapeIds();
      if (shapeIds?.size > 0) (ed as any).deleteShapes([...shapeIds]);
    } catch (_e) {}
    setStatus('idle');
    setOcrText('');
  }, []);

  // ── Write answer shapes directly onto the handwriting pad ────────────────
  const writeAnswerOnPad = useCallback((
    ed: Editor,
    ocrReading: string,
    canvasContent: any[] | null,
    responseText: string,
  ) => {
    try {
      // Clean OCR reading string
      const cleanReading = (ocrReading || '')
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<\/?think>/gi, '')
        .replace(/[\r\n]+/g, ' ')
        .trim();

      const pageShapes = (ed as any).getCurrentPageShapes() as any[];

      // Delete previous AI shapes (keep only student's handwritten drawings)
      const aiShapeIdsToDelete: string[] = [];
      let lowestY = 200;

      pageShapes.forEach((s: any) => {
        if (s.type !== 'draw' && s.type !== 'line') {
          aiShapeIdsToDelete.push(s.id);
        } else {
          const bottom = (s.y || 0) + (s.props?.h || 60);
          if (bottom > lowestY) lowestY = bottom;
        }
      });

      if (aiShapeIdsToDelete.length > 0) {
        try { (ed as any).deleteShapes(aiShapeIdsToDelete); } catch (_e) {}
      }

      const startX = 60;
      let currentY = lowestY + 40;

      const shapesToCreate: any[] = [];

      // ── Divider header card ──────────────────────────────────────────────
      const headerText = `✏️ Newton's Answer  |  Read: "${cleanReading.slice(0, 70)}"`;
      const headerLines = headerText.split('\n');
      const headerH = Math.max(headerLines.length * 36 + 24, 52);

      shapesToCreate.push({
        type: 'geo',
        x: startX,
        y: currentY,
        props: {
          geo: 'rectangle',
          w: 520,
          h: headerH,
          richText: toRichText(headerText),
          color: 'violet',
          fill: 'solid',
          font: 'draw',
          size: 's',
        },
      });
      currentY += headerH + 24;

      // Filter out any diagnostic meta shapes
      const isMetaText = (txt: string) => {
        const lower = txt.toLowerCase();
        return (
          lower.includes('observe the image') ||
          lower.includes('blank image') ||
          lower.includes('check for low-contrast') ||
          lower.includes('variations in luminance') ||
          lower.includes('ambiguity check') ||
          lower.includes('global observation')
        );
      };

      const validCards = (canvasContent || []).filter(item => {
        const txt = item?.text || String(item || '');
        return !isMetaText(txt);
      });

      // ── Canvas shape cards from AI ───────────────────────────────────────
      if (validCards && validCards.length > 0) {
        validCards.forEach((item: any) => {
          const text = item?.text || '';
          const type = (item?.type || 'box').toLowerCase();
          const color = normalizeColor(item?.color);
          const fill  = item?.fill || 'semi';
          const lines = text.split('\n');
          const maxLen = Math.max(...lines.map((l: string) => l.length), 10);
          const w = Math.min(Math.max(maxLen * 11, 280), 520);
          const h = Math.max(lines.length * 36 + 28, 64);

          if (type === 'note') {
            shapesToCreate.push({
              type: 'geo', x: startX, y: currentY,
              props: { geo: 'rectangle', w, h, richText: toRichText(text.startsWith('💡') ? text : '💡 ' + text), color: 'yellow', fill: 'solid', font: 'draw', size: 's' },
            });
          } else if (type === 'circle' || type === 'ellipse') {
            shapesToCreate.push({
              type: 'geo', x: startX, y: currentY,
              props: { geo: 'ellipse', w: Math.max(w, 200), h: Math.max(h, 84), richText: toRichText(text), color, fill, font: 'mono', size: 's' },
            });
          } else if (type === 'diamond') {
            shapesToCreate.push({
              type: 'geo', x: startX, y: currentY,
              props: { geo: 'diamond', w: Math.max(w, 240), h: Math.max(h, 100), richText: toRichText(text), color, fill, font: 'mono', size: 's' },
            });
          } else if (type === 'star') {
            shapesToCreate.push({
              type: 'geo', x: startX, y: currentY,
              props: { geo: 'star', w: Math.max(w, 200), h: Math.max(h, 110), richText: toRichText(text), color: 'yellow', fill: 'solid', font: 'draw', size: 's' },
            });
          } else if (type === 'arrow') {
            // Skip unanchored arrows
          } else {
            shapesToCreate.push({
              type: 'geo', x: startX, y: currentY,
              props: { geo: 'rectangle', w, h, richText: toRichText(text), color, fill, font: 'mono', size: 's' },
            });
          }
          currentY += h + 24;
        });
      } else {
        // Fallback: write response_text as paragraph boxes
        const cleanResponse = responseText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        const paragraphs = cleanResponse.split(/\n+/).filter(p => p.trim() && !isMetaText(p));
        paragraphs.forEach((para, idx) => {
          const lines = para.split('\n');
          const maxLen = Math.max(...lines.map(l => l.length), 10);
          const w = Math.min(Math.max(maxLen * 11, 280), 520);
          const h = Math.max(lines.length * 36 + 28, 64);
          shapesToCreate.push({
            type: 'geo', x: startX, y: currentY,
            props: {
              geo: 'rectangle', w, h,
              richText: toRichText(para),
              color: idx === 0 ? 'blue' : idx % 2 === 0 ? 'green' : 'violet',
              fill: idx === 0 ? 'semi' : 'none',
              font: 'draw', size: 's',
            },
          });
          currentY += h + 24;
        });
      }

      const sanitizedShapes = shapesToCreate.map(sanitize);
      const created = (ed as any).createShapes(sanitizedShapes);
      try {
        const pageShapesAfter = (ed as any).getCurrentPageShapes() as any[];
        pageShapesAfter.forEach((s: any) => {
          if (s.type !== 'draw' && s.type !== 'line') {
            aiShapeIdsRef.current.add(s.id);
          }
        });
      } catch (_e) {}

      // Pan camera to show the answer
      try {
        const bounds = (ed as any).getViewportPageBounds();
        if (lowestY + 300 > bounds.y + bounds.h) {
          (ed as any).centerOnPoint({ x: startX + 260, y: lowestY + 200 });
        }
      } catch (_e) {}
    } catch (err) {
      console.error('writeAnswerOnPad error:', err);
    }
  }, []);

  // ── Capture → OCR → Solve → Write back on pad ───────────────────────────
  const handleSolve = useCallback(async () => {
    const ed = editorRef.current;
    if (!ed) return;

    const pageShapes = (ed as any).getCurrentPageShapes() as any[];

    // Exclude any AI-generated shape IDs so the image ONLY contains student drawings
    const studentShapes = pageShapes.filter((s: any) => !aiShapeIdsRef.current.has(s.id));
    const ids = studentShapes.map((s: any) => s.id);

    if (ids.length === 0) {
      alert('Please write an equation or problem on the pad first!');
      return;
    }

    setStatus('capturing');

    let base64: string | null = null;

    // Capture ONLY the student's handwritten ink using Tldraw's native exporter
    try {
      // ed.toImage returns a Blob, which we convert to base64
      const { blob } = await (ed as any).toImage(ids, {
        format: 'png',
        background: true,
        scale: 2,
        padding: 32
      });
      if (blob && blob.size > 0) {
        const ab = await blob.arrayBuffer();
        let binary = '';
        new Uint8Array(ab).forEach(b => { binary += String.fromCharCode(b); });
        base64 = btoa(binary);
      }
    } catch (err) {
      console.warn('Native toImage failed:', err);
    }

    // Method 2: Fallback to DOM canvas toDataURL
    if (!base64) {
      try {
        const containers = document.querySelectorAll('.tl-canvas canvas');
        const canvasEl = containers[containers.length - 1] as HTMLCanvasElement | null;
        if (canvasEl && canvasEl.width > 0) {
          base64 = canvasEl.toDataURL('image/png').split(',')[1] ?? null;
        }
      } catch (err) { console.warn('DOM canvas capture failed:', err); }
    }

    if (!base64 || base64.length < 500) {
      alert('Could not capture a clear image of your handwriting. Please draw larger or try again.');
      setStatus('idle');
      return;
    }

    // The tldraw exportToBlob already ensures a clean background with the `background: true` option.

    setStatus('solving');

    try {
      const formData = new FormData();
      formData.append('text', 'Read and solve the handwritten content.');
      formData.append('image', base64);
      if (selectedSkill) formData.append('skill', JSON.stringify(selectedSkill));
      if (userId)        formData.append('user_id', userId);
      if (studentName)   formData.append('student_name', studentName);

      const res = await fetch('/api/chat-audio', { method: 'POST', body: formData });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(`API ${res.status}: ${errBody?.detail || errBody?.error || 'Unknown'}`);
      }
      const data = await res.json();

      const ocrReading = data.transcript || 'your handwriting';
      const responseText: string = data.text || "Here's the solution!";
      const canvasContent: any[] | null = data.canvas_content || null;

      setOcrText(ocrReading);
      setStatus('done');

      // Write answer directly onto the handwriting pad
      writeAnswerOnPad(ed, ocrReading, canvasContent, responseText);

    } catch (err: any) {
      console.error('Handwriting solve error:', err);
      // Write error onto the pad itself
      const ed2 = editorRef.current;
      if (ed2) {
        const pageShapes = (ed2 as any).getCurrentPageShapes() as any[];
        let lowestY = 200;
        pageShapes.forEach((s: any) => {
          const b = (s.y || 0) + (s.props?.h || 60);
          if (b > lowestY) lowestY = b;
        });
        (ed2 as any).createShapes([sanitize({
          type: 'geo', x: 60, y: lowestY + 40,
          props: {
            geo: 'rectangle', w: 480, h: 80,
            richText: toRichText(`⚠️ Error: ${String(err).slice(0, 120)}`),
            color: 'red', fill: 'semi', font: 'draw', size: 's',
          },
        })]);
      }
      setStatus('idle');
    }
  }, [selectedSkill, userId, studentName, writeAnswerOnPad]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border-4 border-black w-full max-w-4xl h-[88vh] flex flex-col shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] font-sans">

        {/* HEADER */}
        <div className="border-b-4 border-black bg-white p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-black bg-amber-400 flex items-center justify-center font-black text-sm">✏️</div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest leading-none">PENECHO HANDWRITING SCRATCHPAD</h2>
              <p className="text-[9px] font-bold uppercase tracking-wider text-black/50 mt-1">
                {status === 'idle'     && 'Write your equation below — answer appears right here on the pad!'}
                {status === 'capturing'&& '📸 Capturing your handwriting...'}
                {status === 'solving'  && '🧠 Newton is solving... please wait'}
                {status === 'done'     && `✅ Done! Newton read: "${ocrText.slice(0, 50)}${ocrText.length > 50 ? '…' : ''}"`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 border-2 border-black bg-white hover:bg-black hover:text-white transition-all flex items-center justify-center font-black"
          >
            <X size={16} />
          </button>
        </div>

        {/* TLDRAW CANVAS — answer is written HERE */}
        <div className="flex-1 relative bg-[#fdfdfd]">
          <Tldraw onMount={handleMount} persistenceKey="newton-scratchpad-v3" />
          <div className="absolute top-3 left-3 z-10 bg-white/90 border-2 border-black px-3 py-1 text-[8px] font-black uppercase tracking-widest pointer-events-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            {status === 'solving'
              ? '🧠 NEWTON IS SOLVING YOUR PROBLEM...'
              : '✍️ DRAW YOUR QUESTION — ANSWER APPEARS BELOW IT'}
          </div>
          {/* Solving overlay */}
          {status === 'solving' && (
            <div className="absolute inset-0 z-20 bg-black/10 flex items-center justify-center pointer-events-none">
              <div className="bg-white border-4 border-black px-8 py-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center gap-3">
                <Loader2 size={32} className="animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest">Reading & Solving…</p>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="border-t-4 border-black bg-white p-4 flex items-center justify-between flex-shrink-0 gap-3">
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 border-2 border-black bg-gray-100 px-4 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-px active:translate-y-px"
          >
            <RotateCcw size={14} />
            <span>CLEAR PAD</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="border-2 border-black/30 px-4 py-2.5 text-xs font-bold uppercase tracking-widest hover:border-black transition-all"
            >
              CLOSE
            </button>
            <button
              onClick={handleSolve}
              disabled={status === 'capturing' || status === 'solving'}
              className="flex items-center gap-2 border-2 border-black bg-amber-400 text-black px-6 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-amber-300 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
            >
              {status === 'capturing' || status === 'solving'
                ? <><Loader2 size={14} className="animate-spin" /><span>SOLVING…</span></>
                : <><Sparkles size={14} /><span>🚀 SOLVE ON PAD →</span></>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
