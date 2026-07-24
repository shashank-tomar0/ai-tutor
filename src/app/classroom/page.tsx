"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { Tldraw, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { Brain, Loader2, ArrowLeft, Target, ChevronLeft, Sparkles, BookOpen, CheckCircle, Database } from 'lucide-react';
import * as rrweb from 'rrweb';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import ChatSidebar, { ChatMessage } from '@/components/ChatSidebar';
import CaptionsBar from '@/components/CaptionsBar';

// ============================================================================
// TYPES
// ============================================================================

interface Skill {
  id: string;
  name: string;
  subject: string;
  parent_id: string | null;
  difficulty: number;
  icon: string;
  order_index: number;
  description: string;
  mastery_level: number;
  attempts: number;
  children?: Skill[];
}

export default function CanvasPage() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [voiceType, setVoiceType] = useState<'human' | 'system' | 'mute'>('human');
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Chat messages
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Captions
  const [captionsText, setCaptionsText] = useState('');
  const [captionsVisible, setCaptionsVisible] = useState(false);
  const [captionsTyping, setCaptionsTyping] = useState(false);

  // Skill tree state
  const [skillTree, setSkillTree] = useState<Skill[]>([]);
  const [skillRecommendations, setSkillRecommendations] = useState<any[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [showSkillPanel, setShowSkillPanel] = useState(true);
  const [isLoadingSkills, setIsLoadingSkills] = useState(true);

  const rrwebEventsRef = useRef<any[]>([]);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const msgIdCounter = useRef(0);

  // ==========================================================================
  // AUTH + INIT
  // ==========================================================================

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); }
      else { setUser(session.user); }
    });

    synthesisRef.current = window.speechSynthesis;
    fetchSkills();
    fetchRecommendations();

    const stopRecording = rrweb.record({
      emit(event) {
        rrwebEventsRef.current.push(event);
        if (rrwebEventsRef.current.length > 1500) rrwebEventsRef.current.shift();
      },
    });
    return () => { if (stopRecording) stopRecording(); };
  }, []);

  // ==========================================================================
  // CANVAS
  // ==========================================================================

  const handleMount = useCallback((editor: Editor) => {
    setEditor(editor);
  }, []);

  // Write AI explanation to the canvas as text shapes
  const writeToCanvas = useCallback(async (text: string) => {
    if (!editor) return;
    // Create a text shape with the AI's explanation
    // Position it in a visible area of the canvas
    const center = (editor as any).getViewportPageBounds();
    (editor as any).createShape({
      type: 'text',
      x: center.x + 40,
      y: center.y + 40,
      props: {
        text: text,
        color: 'black',
        size: 'm',
        font: 'sans',
        w: Math.min(text.length * 6, 400),
        autoSize: true,
      },
    });
  }, [editor]);

  // ==========================================================================
  // MESSAGES
  // ==========================================================================

  const addMessage = useCallback((role: 'user' | 'ai', text: string) => {
    msgIdCounter.current += 1;
    const msg: ChatMessage = {
      id: `msg-${msgIdCounter.current}`,
      role,
      text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);

  // ==========================================================================
  // TTS (Text-to-Speech)
  // ==========================================================================

  const speakResponse = useCallback(async (text: string) => {
    // Show captions
    setCaptionsText(text);
    setCaptionsVisible(true);
    setCaptionsTyping(true);

    if (voiceType === 'mute') {
      setTimeout(() => { setCaptionsTyping(false); }, text.split(' ').length * 60);
      setTimeout(() => { setCaptionsVisible(false); }, text.split(' ').length * 60 + 2000);
      isProcessingRef.current = false;
      setIsConnecting(false);
      return;
    }

    if (voiceType === 'human') {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        const data = await res.clone().json().catch(() => null);
        if (data?.fallback) {
          speakSystem(text);
        } else {
          const audioBlob = await res.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audio.onended = () => {
            setCaptionsTyping(false);
            setTimeout(() => setCaptionsVisible(false), 2000);
            isProcessingRef.current = false;
            setIsConnecting(false);
          };
          audio.onerror = () => { setCaptionsTyping(false); speakSystem(text); };
          audio.play().catch(() => speakSystem(text));
        }
      } catch {
        speakSystem(text);
      }
    } else {
      speakSystem(text);
    }
  }, [voiceType]);

  const speakSystem = useCallback((text: string) => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => {
        setCaptionsTyping(false);
        setTimeout(() => setCaptionsVisible(false), 2000);
        isProcessingRef.current = false;
        setIsConnecting(false);
      };
      utterance.onerror = () => {
        isProcessingRef.current = false;
        setIsConnecting(false);
      };
      synthesisRef.current.speak(utterance);
    } else {
      isProcessingRef.current = false;
      setIsConnecting(false);
    }
  }, []);

  // ==========================================================================
  // SEND MESSAGE TO AI
  // ==========================================================================

  const sendToAI = useCallback(async (text: string, fromVoice: boolean = false) => {
    isProcessingRef.current = true;
    setIsConnecting(true);

    // Add user message to chat
    addMessage('user', text);

    try {
      const formData = new FormData();
      if (fromVoice) {
        formData.append('file', text as any, 'audio.webm'); // voice path uses audio blob
      } else {
        formData.append('text', text);
      }
      const shapes = editor ? editor.getCurrentPageShapes() : [];
      formData.append('shapes', JSON.stringify(shapes));
      if (selectedSkill) {
        formData.append('skill', JSON.stringify({
          id: selectedSkill.id,
          name: selectedSkill.name,
          description: selectedSkill.description,
        }));
      }

      const res = await fetch("/api/chat-audio", {
        method: "POST",
        body: fromVoice ? text as any : formData,
      });

      // Retry without file if voice was used (the FormData already has text appended above)
      const actualRes = fromVoice
        ? await fetch("/api/chat-audio", { method: "POST", body: formData })
        : res;
      const data = await actualRes.json();

      if (data.type === "ai_response") {
        const aiText = data.text || "I'm listening. Tell me more.";

        // Add AI message to chat
        addMessage('ai', aiText);

        // Write to canvas
        writeToCanvas(aiText);

        // Speak it + captions
        speakResponse(aiText);

        // Update skill progress
        if (selectedSkill && data.is_struggling === false) {
          updateSkillProgress(user?.id, selectedSkill.id, true);
        }
      } else {
        isProcessingRef.current = false;
        setIsConnecting(false);
      }
    } catch (err) {
      console.error("AI request failed:", err);
      isProcessingRef.current = false;
      setIsConnecting(false);
    }
  }, [editor, selectedSkill, user?.id, addMessage, writeToCanvas, speakResponse]);

  // ==========================================================================
  // CHAT INPUT HANDLER
  // ==========================================================================

  const handleSendMessage = useCallback((text: string) => {
    sendToAI(text, false);
  }, [sendToAI]);

  // ==========================================================================
  // VOICE PIPELINE (VAD)
  // ==========================================================================

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isSpeakingRef = useRef(false);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!isSessionActive) return;

    let animationFrameId: number;

    const startMicrophone = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          if (audioChunksRef.current.length === 0) return;
          if (isProcessingRef.current) return;

          isProcessingRef.current = true;
          setIsConnecting(true);
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          audioChunksRef.current = [];

          if (audioBlob.size > 1000) {
            try {
              const formData = new FormData();
              formData.append('file', audioBlob, 'audio.webm');
              const shapes = editor ? editor.getCurrentPageShapes() : [];
              formData.append('shapes', JSON.stringify(shapes));
              if (selectedSkill) {
                formData.append('skill', JSON.stringify({ id: selectedSkill.id, name: selectedSkill.name }));
              }

              const res = await fetch("/api/chat-audio", { method: "POST", body: formData });
              const data = await res.json();

              if (data.transcript) {
                // Add user voice transcript as message
                addMessage('user', data.transcript);
              }

              if (data.type === "ai_response") {
                const aiText = data.text || "I'm listening.";
                addMessage('ai', aiText);
                writeToCanvas(aiText);
                speakResponse(aiText);

                if (selectedSkill && data.is_struggling === false) {
                  updateSkillProgress(user?.id, selectedSkill.id, true);
                }
              } else {
                isProcessingRef.current = false;
                setIsConnecting(false);
              }
            } catch {
              isProcessingRef.current = false;
              setIsConnecting(false);
            }
          } else {
            isProcessingRef.current = false;
            setIsConnecting(false);
          }
        };

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkAudio = () => {
          if (!isSessionActive) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;

          if (avg > 15 && !isProcessingRef.current) {
            if (mediaRecorder.state === 'inactive') {
              mediaRecorder.start();
              isSpeakingRef.current = true;
            }
            if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = setTimeout(() => {
              if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                isSpeakingRef.current = false;
              }
            }, 1500);
          }
          animationFrameId = requestAnimationFrame(checkAudio);
        };

        checkAudio();
      } catch {
        setIsSessionActive(false);
        alert("Microphone access required. You can still type in the chat panel.");
      }
    };

    startMicrophone();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [editor, isSessionActive, selectedSkill, user?.id, addMessage, writeToCanvas, speakResponse]);

  // ==========================================================================
  // SESSION TOGGLE
  // ==========================================================================

  const toggleSession = () => {
    if (isSessionActive) {
      setIsSessionActive(false);
      if (synthesisRef.current) synthesisRef.current.cancel();
      setCaptionsVisible(false);
      saveSessionReplay();
    } else {
      setIsSessionActive(true);
      rrwebEventsRef.current = [];
      const skillCtx = selectedSkill ? ` Let's focus on ${selectedSkill.name}.` : '';
      const greeting = `Hello! I'm Newton. I can see your canvas.${skillCtx} What are we working on today?`;
      addMessage('ai', greeting);
      speakResponse(greeting);
    }
  };

  // ==========================================================================
  // SAVE REPLAY
  // ==========================================================================

  const saveSessionReplay = async () => {
    if (rrwebEventsRef.current.length === 0) return;

    const studentName = user?.email?.split('@')[0] || 'Anonymous Student';
    const canvasSnapshot = editor ? editor.getCurrentPageShapes() : [];
    let concept = selectedSkill?.name || "General Socratic";

    try {
      const { error } = await supabase.from('session_replays').insert([{
        user_id: user?.id,
        student_name: studentName,
        concept,
        events: rrwebEventsRef.current,
        canvas_snapshot: canvasSnapshot,
      }]);
      if (error) throw error;
    } catch {
      const blob = new Blob([JSON.stringify(rrwebEventsRef.current)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newton-replay-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // ==========================================================================
  // SKILL TREE
  // ==========================================================================

  const fetchSkills = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const res = await fetch(`/api/skills?userId=${session.user.id}`);
      const data = await res.json();
      if (data.skills) setSkillTree(data.skills);
    } catch { /* ignore */ } finally { setIsLoadingSkills(false); }
  };

  const fetchRecommendations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const res = await fetch(`/api/skills/recommendations?userId=${session.user.id}`);
      const data = await res.json();
      if (data.candidates) setSkillRecommendations(data.candidates);
    } catch { /* ignore */ }
  };

  const handleSkillSelect = (skill: Skill) => {
    setSelectedSkill(skill);
    const msg = `Let's work on ${skill.name}. ${skill.description}`;
    addMessage('ai', msg);
    speakResponse(msg);
  };

  const updateSkillProgress = async (userId: string | undefined, skillId: string, success: boolean) => {
    if (!userId) return;
    try {
      await fetch('/api/skills/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, skillId, success }),
      });
      fetchRecommendations();
      fetchSkills();
    } catch { /* ignore */ }
  };

  // ==========================================================================
  // UI HELPERS
  // ==========================================================================

  const getMasteryColor = (m: number) => {
    if (m === 0) return 'text-black/30';
    if (m < 0.3) return 'text-red-600';
    if (m < 0.6) return 'text-amber-600';
    if (m < 0.85) return 'text-blue-600';
    return 'text-green-600';
  };

  const getMasteryLabel = (m: number) => {
    if (m === 0) return 'Not Started';
    if (m < 0.3) return 'Struggling';
    if (m < 0.6) return 'Developing';
    if (m < 0.85) return 'Proficient';
    return 'Mastered';
  };

  const renderSkillNode = (skill: Skill, depth: number = 0) => {
    const mastery = skill.mastery_level || 0;
    const isSelected = selectedSkill?.id === skill.id;
    const hasChildren = skill.children && skill.children.length > 0;

    return (
      <div key={skill.id}>
        <button
          onClick={() => handleSkillSelect(skill)}
          className={`w-full text-left px-3 py-2 flex items-center gap-2 text-xs font-bold uppercase tracking-tight border-l-2 transition-all hover:bg-black hover:text-white group
            ${isSelected ? 'bg-black text-white border-l-black' : `border-transparent ${getMasteryColor(mastery)}`}`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          title={skill.description}
        >
          <span className="text-base flex-shrink-0">{skill.icon}</span>
          <span className="flex-1 truncate">{skill.name}</span>
          <div className="flex-shrink-0 flex items-center gap-1">
            {mastery > 0 && (
              <div className={`w-1.5 h-1.5 rounded-full ${mastery >= 0.85 ? 'bg-green-500' : mastery >= 0.6 ? 'bg-blue-500' : mastery >= 0.3 ? 'bg-amber-500' : 'bg-red-500'}`} />
            )}
            {mastery >= 0.85 && <CheckCircle size={10} className="text-green-600" />}
          </div>
        </button>
        {hasChildren && skill.children!.map(c => renderSkillNode(c, depth + 1))}
      </div>
    );
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="grid grid-cols-[auto_1fr_auto] w-screen h-screen bg-white font-sans text-black overflow-hidden">
      {/* ============ LEFT COLUMN: Skill Tree ============ */}
      {showSkillPanel && (
        <div className="w-[320px] max-h-screen bg-white border-r-2 border-black overflow-y-auto flex flex-col">
          {/* Header */}
          <div className="border-b-2 border-black p-4 flex items-center justify-between sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2">
              <Target size={16} className="stroke-[1.5]" />
              <span className="text-xs font-bold uppercase tracking-widest">LEARNING PATH</span>
            </div>
            <button
              onClick={() => setShowSkillPanel(false)}
              className="p-1 hover:bg-black hover:text-white transition-colors border border-black rounded-full"
            >
              <ChevronLeft size={14} />
            </button>
          </div>

          {/* Recommendations */}
          {skillRecommendations.length > 0 && !isLoadingSkills && (
            <div className="border-b-2 border-black bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <Sparkles size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-amber-800 mb-0.5">RECOMMENDED NEXT</div>
                  <button
                    onClick={() => {
                      const s = skillRecommendations[0]?.skill;
                      if (s) {
                        const found = skillTree.find(n => n.id === s.id) || skillTree.flatMap(n => n.children || []).find(c => c.id === s.id);
                        if (found) handleSkillSelect(found);
                      }
                    }}
                    className="text-xs font-bold uppercase tracking-tight text-amber-900 hover:underline text-left"
                  >
                    {skillRecommendations[0]?.icon || '📚'} {skillRecommendations[0]?.name || ''}
                    <span className="block text-[9px] font-normal normal-case text-amber-700">
                      {skillRecommendations[0]?.reason || ''}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Selected skill context */}
          {selectedSkill && (
            <div className={`border-b-2 border-black p-3 ${selectedSkill.mastery_level && selectedSkill.mastery_level < 0.3 ? 'bg-red-50' : selectedSkill.mastery_level < 0.6 ? 'bg-amber-50' : selectedSkill.mastery_level < 0.85 ? 'bg-blue-50' : 'bg-green-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{selectedSkill.icon}</span>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-tighter">{selectedSkill.name}</div>
                    <div className={`text-[9px] font-bold uppercase tracking-widest ${getMasteryColor(selectedSkill.mastery_level)}`}>
                      {getMasteryLabel(selectedSkill.mastery_level)}
                      {selectedSkill.mastery_level > 0 && ` • ${Math.round(selectedSkill.mastery_level * 100)}%`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSkill(null)}
                  className="text-[9px] font-bold uppercase tracking-wider border border-black px-2 py-1 rounded hover:bg-black hover:text-white transition-colors"
                >
                  CLEAR
                </button>
              </div>
            </div>
          )}

          {/* Skill list */}
          <div className="flex-1 overflow-y-auto py-2">
            {isLoadingSkills ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={16} className="animate-spin" />
                <span className="ml-2 text-[10px] font-bold uppercase tracking-widest">Loading skills...</span>
              </div>
            ) : skillTree.length === 0 ? (
              <div className="p-6 text-center">
                <BookOpen size={24} className="mx-auto mb-2 text-black/30" />
                <div className="text-[10px] font-bold uppercase tracking-widest text-black/40">
                  No skills loaded.<br/>Run the schema migration first.
                </div>
              </div>
            ) : (
              skillTree.map(skill => renderSkillNode(skill, 0))
            )}
          </div>
        </div>
      )}

      {/* ============ CENTER COLUMN: Canvas + Captions ============ */}
      <div className="relative flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <div className="absolute top-4 left-4 right-4 z-40 flex justify-between items-center pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-2 bg-white border border-black px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <ArrowLeft size={14} />
              <span>INDEX</span>
            </Link>

            {!showSkillPanel && (
              <button
                onClick={() => setShowSkillPanel(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white hover:bg-black hover:text-white"
              >
                <Target size={14} />
                SKILLS
              </button>
            )}
          </div>

          {/* Session status badge */}
          <div className="pointer-events-auto flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider border-2 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
              ${isSessionActive ? 'bg-black text-white border-black' : 'bg-white text-black/50 border-black/20'}`}>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isSessionActive ? 'bg-green-400 animate-pulse' : 'bg-black/20'}`} />
                {isSessionActive ? 'SESSION ACTIVE' : 'READY'}
              </div>
            </div>
          </div>
        </div>

        {/* Tldraw Canvas */}
        <div className="flex-1 relative">
          <Tldraw onMount={handleMount} persistenceKey="newton-canvas-v2" />

          {/* Captions Overlay */}
          <CaptionsBar
            text={captionsText}
            isVisible={captionsVisible}
            isTyping={captionsTyping}
            voiceType={voiceType}
            onAnimationComplete={() => {
              if (!isSessionActive) setCaptionsTyping(false);
            }}
          />
        </div>
      </div>

      {/* ============ RIGHT COLUMN: Chat Sidebar ============ */}
      <div className="w-[420px] max-h-screen">
        <ChatSidebar
          messages={messages}
          onSendMessage={handleSendMessage}
          isProcessing={isConnecting}
          isSessionActive={isSessionActive}
          onToggleSession={toggleSession}
          voiceType={voiceType}
          onVoiceTypeChange={setVoiceType}
        />
      </div>
    </div>
  );
}
