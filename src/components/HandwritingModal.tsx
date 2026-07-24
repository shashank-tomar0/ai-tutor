"use client";

import { useState, useCallback, useRef } from 'react';
import { Tldraw, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { X, Sparkles, RotateCcw } from 'lucide-react';

interface HandwritingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSolveHandwriting: (imageBase64: string) => void;
}

export default function HandwritingModal({
  isOpen,
  onClose,
  onSolveHandwriting,
}: HandwritingModalProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleMount = useCallback((ed: Editor) => {
    setEditor(ed);
    // Automatically select draw/pencil tool for immediate writing
    try {
      (ed as any).setCurrentTool('draw');
    } catch (_e) {}
  }, []);

  const handleClear = useCallback(() => {
    if (!editor) return;
    try {
      const shapeIds = (editor as any).getCurrentPageShapeIds();
      if (shapeIds.size > 0) {
        (editor as any).deleteShapes([...shapeIds]);
      }
    } catch (_e) {}
  }, [editor]);

  const handleSolve = useCallback(async () => {
    if (!editor || isCapturing) return;
    setIsCapturing(true);
    try {
      const shapeIds = (editor as any).getCurrentPageShapeIds();
      if (!shapeIds || shapeIds.size === 0) {
        alert("Please write an equation, math problem, or diagram on the pad first!");
        setIsCapturing(false);
        return;
      }

      const tldrawMod = await import('tldraw') as any;
      if (!tldrawMod.exportToBlob) {
        setIsCapturing(false);
        return;
      }

      const blob = await tldrawMod.exportToBlob({
        editor: editor as any,
        ids: [...shapeIds],
        format: 'png',
        opts: { background: true, scale: 1.0 },
      });

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setIsCapturing(false);
        onClose();
        if (base64) onSolveHandwriting(base64);
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.warn('Handwriting capture error:', e);
      setIsCapturing(false);
    }
  }, [editor, isCapturing, onClose, onSolveHandwriting]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border-4 border-black w-full max-w-4xl h-[85vh] flex flex-col shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] font-sans">
        
        {/* HEADER BAR */}
        <div className="border-b-4 border-black bg-white p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-black bg-amber-400 text-black flex items-center justify-center font-black text-sm">
              ✏️
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest leading-none">PENECHO HANDWRITING SCRATCHPAD</h2>
              <p className="text-[9px] font-bold uppercase tracking-wider text-black/50 mt-1">
                Write any equation, math problem, or diagram below — AI will read & solve it on the main board!
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

        {/* TL-DRAW CANVAS FOR HANDWRITING */}
        <div className="flex-1 relative bg-[#fdfdfd]">
          <Tldraw onMount={handleMount} persistenceKey="newton-scratchpad-v1" />
          <div className="absolute top-3 left-3 z-10 bg-white/90 border-2 border-black px-3 py-1 text-[8px] font-black uppercase tracking-widest pointer-events-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            ✍️ PEN TOOL ACTIVE — WRITE FREELY
          </div>
        </div>

        {/* FOOTER ACTION BAR */}
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
              CANCEL
            </button>
            <button
              onClick={handleSolve}
              disabled={isCapturing}
              className="flex items-center gap-2 border-2 border-black bg-amber-400 text-black px-6 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-amber-300 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
            >
              <Sparkles size={14} />
              <span>{isCapturing ? 'READING...' : '🚀 SOLVE MY HANDWRITING →'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
