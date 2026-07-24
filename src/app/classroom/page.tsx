"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { Tldraw, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { Mic, MicOff, Brain, Loader2, ArrowLeft, Send, Volume2, VolumeX, Database, HelpCircle, ChevronLeft, ChevronRight, Sparkles, Target, BookOpen, Award, CheckCircle } from 'lucide-react';
import * as rrweb from 'rrweb';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';

// ============================================================================
// SKILL TREE TYPES
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
  prerequisites_met?: boolean;
}

interface SkillRecommendation {
  skill: Skill;
  reason: string;
  unlocks: number;
}

export default function CanvasPage() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [voiceType, setVoiceType] = useState<'human' | 'system' | 'mute'>('human');
  const [textInput, setTextInput] = useState("");
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Skill tree state
  const [skillTree, setSkillTree] = useState<Skill[]>([]);
  const [skillRecommendations, setSkillRecommendations] = useState<SkillRecommendation[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [showSkillPanel, setShowSkillPanel] = useState(true);
  const [isLoadingSkills, setIsLoadingSkills] = useState(true);

  const rrwebEventsRef = useRef<any[]>([]);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Check Authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
      }
    });

    synthesisRef.current = window.speechSynthesis;

    // Fetch skill tree with progress
    fetchSkills();
    fetchRecommendations();
    
    // Start recording DOM events silently
    const stopRecording = rrweb.record({
      emit(event) {
        rrwebEventsRef.current.push(event);
        // Prevent memory leak by keeping only the last 1500 events
        if (rrwebEventsRef.current.length > 1500) {
           rrwebEventsRef.current.shift();
        }
      },
    });
    return () => {
      if (stopRecording) stopRecording();
    };
  }, [router]);

  const handleMount = useCallback((editor: Editor) => {
    setEditor(editor);
  }, []);

  // ============================================================================
  // SKILL TREE DATA FETCHING
  // ============================================================================

  const fetchSkills = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const res = await fetch(`/api/skills?userId=${session.user.id}`);
      const data = await res.json();
      if (data.skills) {
        setSkillTree(data.skills);
      }
    } catch (err) {
      console.warn("Could not fetch skills tree, using empty state.", err);
    } finally {
      setIsLoadingSkills(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const res = await fetch(`/api/skills/recommendations?userId=${session.user.id}`);
      const data = await res.json();
      if (data.candidates) {
        setSkillRecommendations(data.candidates.map((c: any) => ({
          skill: c.skill,
          reason: c.reason,
          unlocks: c.unlocks || 0,
          priority: c.score
        })));
      }
    } catch (err) {
      console.warn("Could not fetch recommendations.", err);
    }
  };

  const handleSkillSelect = (skill: Skill) => {
    setSelectedSkill(skill);
    // Skill context is injected into the next API call
    const msg = `Let's work on ${skill.name}. ${skill.description}`;
    speakResponse(msg);
  };

  // ============================================================================
  // MASTERY UI HELPERS
  // ============================================================================

  const getMasteryColor = (mastery: number) => {
    if (mastery === 0) return 'border-black/20 text-black/30';
    if (mastery < 0.3) return 'border-red-500 text-red-600';
    if (mastery < 0.6) return 'border-amber-500 text-amber-600';
    if (mastery < 0.85) return 'border-blue-500 text-blue-600';
    return 'border-green-500 text-green-600';
  };

  const getMasteryBg = (mastery: number) => {
    if (mastery === 0) return 'bg-black/5';
    if (mastery < 0.3) return 'bg-red-50';
    if (mastery < 0.6) return 'bg-amber-50';
    if (mastery < 0.85) return 'bg-blue-50';
    return 'bg-green-50';
  };

  const getMasteryLabel = (mastery: number) => {
    if (mastery === 0) return 'Not Started';
    if (mastery < 0.3) return 'Struggling';
    if (mastery < 0.6) return 'Developing';
    if (mastery < 0.85) return 'Proficient';
    return 'Mastered';
  };

  // Recursive skill tree renderer
  const renderSkillNode = (skill: Skill, depth: number = 0) => {
    const mastery = skill.mastery_level || 0;
    const isSelected = selectedSkill?.id === skill.id;
    const hasChildren = skill.children && skill.children.length > 0;

    return (
      <div key={skill.id}>
        <button
          onClick={() => handleSkillSelect(skill)}
          className={`w-full text-left px-3 py-2 flex items-center gap-2 text-xs font-bold uppercase tracking-tight border-l-2 transition-all hover:bg-black hover:text-white group
            ${isSelected ? 'bg-black text-white border-l-black' : `border-transparent ${getMasteryColor(mastery)}`}
          `}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          title={skill.description}
        >
          <span className="text-base flex-shrink-0">{skill.icon}</span>
          <span className="flex-1 truncate">{skill.name}</span>

          {/* Mastery indicator */}
          <div className="flex-shrink-0 flex items-center gap-1">
            {mastery > 0 && (
              <div className={`w-1.5 h-1.5 rounded-full ${mastery >= 0.85 ? 'bg-green-500' : mastery >= 0.6 ? 'bg-blue-500' : mastery >= 0.3 ? 'bg-amber-500' : 'bg-red-500'}`} />
            )}
            {mastery >= 0.85 && <CheckCircle size={10} className="text-green-600" />}
          </div>
        </button>

        {/* Children */}
        {hasChildren && skill.children!.map((child: Skill) => renderSkillNode(child, depth + 1))}
      </div>
    );
  };

  // ============================================================================
  // Web Audio + MediaRecorder Setup for Bulletproof VAD
  // ============================================================================
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isSpeakingRef = useRef(false);
  const isProcessingRef = useRef(false);

  // ElevenLabs and SpeechSynthesis handlers
  const speakResponse = async (text: string) => {
    if (voiceType === 'mute') {
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
        if (data && data.fallback) {
          console.warn("ElevenLabs TTS key not configured or failed, falling back to system TTS.");
          speakSystem(text);
        } else {
          const audioBlob = await res.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audio.onended = () => {
            isProcessingRef.current = false;
            setIsConnecting(false);
          };
          audio.onerror = () => {
            console.error("Audio playback error, falling back to system TTS.");
            speakSystem(text);
          };
          audio.play().catch(e => {
            console.error("Failed to play audio, falling back to system TTS:", e);
            speakSystem(text);
          });
        }
      } catch (err) {
        console.error("ElevenLabs TTS error, falling back to system TTS:", err);
        speakSystem(text);
      }
    } else {
      speakSystem(text);
    }
  };

  const speakSystem = (text: string) => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => {
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
  };

  const saveSessionReplay = async () => {
    if (rrwebEventsRef.current.length === 0) {
      console.log("No events to save.");
      return;
    }

    const studentName = user?.email?.split('@')[0] || 'Anonymous Student';
    const canvasSnapshot = editor ? editor.getCurrentPageShapes() : [];

    // Analyze concept if possible
    let concept = "General Socratic";
    if (canvasSnapshot.length > 0) {
      const textShape = canvasSnapshot.find((s: any) => s.type === 'text');
      if (textShape && (textShape as any).props?.text) {
        concept = (textShape as any).props.text.slice(0, 30);
      }
    }

    try {
      const { error } = await supabase.from('session_replays').insert([{
        user_id: user?.id || null,
        student_name: studentName,
        concept: concept,
        events: rrwebEventsRef.current,
        canvas_snapshot: canvasSnapshot
      }]);

      if (error) throw error;
      alert("🎉 Your session replay has been successfully saved to the Cloud Database!");
    } catch (err) {
      console.error("Failed to save replay to Supabase. Downloading local file fallback.", err);
      
      // Auto download JSON file
      const blob = new Blob([JSON.stringify(rrwebEventsRef.current)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newton-replay-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      alert("NOTICE: Database connection failed or migrations not applied yet. Your replay has been downloaded locally as a JSON file.");
    }
  };

  const handleTextInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessingRef.current) return;

    const queryText = textInput;
    setTextInput("");
    isProcessingRef.current = true;
    setIsConnecting(true);

    try {
      const formData = new FormData();
      formData.append('text', queryText);
      const shapes = editor ? editor.getCurrentPageShapes() : [];
      formData.append('shapes', JSON.stringify(shapes));
      if (selectedSkill) {
        formData.append('skill', JSON.stringify({ id: selectedSkill.id, name: selectedSkill.name, description: selectedSkill.description }));
      }

      const res = await fetch("/api/chat-audio", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (data.type === "ai_response") {
        speakResponse(data.text);
        // Mark this as a successful skill interaction
        if (selectedSkill && data.is_struggling === false) {
          updateSkillProgress(user?.id, selectedSkill.id, true);
        }
      } else {
        isProcessingRef.current = false;
        setIsConnecting(false);
      }
    } catch (err) {
      console.error("Failed to send text request", err);
      isProcessingRef.current = false;
      setIsConnecting(false);
    }
  };

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
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
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

              const res = await fetch("/api/chat-audio", {
                method: "POST",
                body: formData
              });

              const data = await res.json();
              if (data.transcript) {
                 console.log("🎤 Heard:", data.transcript);
              }

              if (data.type === "ai_response") {
                console.log("🤖 AI says:", data.text);
                speakResponse(data.text);
              } else {
                isProcessingRef.current = false;
                setIsConnecting(false);
              }
            } catch (e) {
              console.error("Failed to send audio", e);
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
          const average = sum / dataArray.length;

          if (average > 15 && !isProcessingRef.current) {
            if (mediaRecorder.state === 'inactive') {
               mediaRecorder.start();
               isSpeakingRef.current = true;
               console.log("Started recording...");
            }
            if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
            
            silenceTimeoutRef.current = setTimeout(() => {
               if (mediaRecorder.state === 'recording') {
                  mediaRecorder.stop();
                  isSpeakingRef.current = false;
                  console.log("Stopped recording due to silence.");
               }
            }, 1500);
          }

          animationFrameId = requestAnimationFrame(checkAudio);
        };

        checkAudio();

      } catch (err) {
        console.error("Error accessing mic:", err);
        setIsSessionActive(false);
        alert("Microphone access is required for Socratic Voice interaction. You can still use Socratic text backup!");
      }
    };

    startMicrophone();

    return () => {
       if (animationFrameId) cancelAnimationFrame(animationFrameId);
       if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
       if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
       }
       if (audioContextRef.current) {
          audioContextRef.current.close();
       }
    };
  }, [editor, isSessionActive]);

  const toggleSession = () => {
    if (isSessionActive) {
      setIsSessionActive(false);
      if (synthesisRef.current) synthesisRef.current.cancel();
      saveSessionReplay();
    } else {
      setIsSessionActive(true);
      rrwebEventsRef.current = [];
      const skillCtx = selectedSkill ? ` Let's focus on ${selectedSkill.name}.` : '';
      const msg = `Hello! I'm Newton. I can see your canvas.${skillCtx} What are we working on today?`;
      speakResponse(msg);
    }
  };

  // ============================================================================
  // SKILL PROGRESS UPDATE
  // ============================================================================

  const updateSkillProgress = async (userId: string | undefined, skillId: string, success: boolean) => {
    if (!userId) return;
    try {
      await fetch('/api/skills/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, skillId, success })
      });
      // Refresh recommendations after update
      fetchRecommendations();
      // Refresh skill tree to show updated progress
      fetchSkills();
    } catch (err) {
      console.warn("Failed to update skill progress:", err);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0 }} className="bg-white font-sans text-black">
      <Tldraw onMount={handleMount} persistenceKey="newton-canvas-v2" />

      {/* Top Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-50 flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2 bg-white border border-black px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <ArrowLeft size={14} />
            <span>INDEX</span>
          </Link>

          {/* Skill Tree Toggle */}
          <button
            onClick={() => setShowSkillPanel(!showSkillPanel)}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5
              ${showSkillPanel ? 'bg-black text-white border-black' : 'bg-white text-black border-black hover:bg-black hover:text-white'}`}
            title="Toggle Skill Tree"
          >
            <Target size={14} />
            <span>SKILLS</span>
          </button>
        </div>

        {/* Voice Selector and Settings (Brutalist Style) */}
        <div className="pointer-events-auto bg-white border-2 border-black p-1.5 px-3 rounded-full flex items-center space-x-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-xs font-bold">
          <span className="uppercase tracking-tight text-[10px] text-black/50 pr-1 border-r border-black/20">VOICE:</span>
          
          <button 
            onClick={() => setVoiceType('human')}
            className={`px-3 py-1 rounded-full uppercase tracking-tighter transition-all ${voiceType === 'human' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-black/5'}`}
          >
            ElevenLabs
          </button>
          
          <button 
            onClick={() => setVoiceType('system')}
            className={`px-3 py-1 rounded-full uppercase tracking-tighter transition-all ${voiceType === 'system' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-black/5'}`}
          >
            Native
          </button>
          
          <button 
            onClick={() => setVoiceType('mute')}
            className={`p-1.5 rounded-full transition-all ${voiceType === 'mute' ? 'bg-red-500 text-white' : 'bg-transparent text-black hover:bg-black/5'}`}
            title="Mute Tutor Audio"
          >
            <VolumeX size={12} />
          </button>
        </div>
      </div>

      {/* Skill Tree Sidebar Panel */}
      {showSkillPanel && (
        <div className="absolute top-20 left-4 z-40 w-[320px] max-h-[calc(100vh-120px)] bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="border-b-2 border-black p-4 flex items-center justify-between bg-white sticky top-0 z-10">
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

          {/* Recommendations Alert */}
          {skillRecommendations.length > 0 && !isLoadingSkills && (
            <div className="border-b-2 border-black bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <Sparkles size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-amber-800 mb-0.5">RECOMMENDED NEXT</div>
                  <button
                    onClick={() => {
                      const topRec = skillRecommendations[0];
                      const skill = skillTree.find(s => s.id === topRec?.skill?.id)
                        || skillTree.flatMap(s => s.children || []).find(c => c.id === topRec?.skill?.id);
                      if (skill) handleSkillSelect(skill);
                    }}
                    className="text-xs font-bold uppercase tracking-tight text-amber-900 hover:underline text-left"
                  >
                    {skillRecommendations[0]?.skill?.icon} {skillRecommendations[0]?.skill?.name}
                    <span className="block text-[9px] font-normal normal-case text-amber-700">
                      {skillRecommendations[0]?.reason}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Selected Skill Context */}
          {selectedSkill && (
            <div className={`border-b-2 border-black p-3 ${getMasteryBg(selectedSkill.mastery_level || 0)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{selectedSkill.icon}</span>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-tighter">{selectedSkill.name}</div>
                    <div className={`text-[9px] font-bold uppercase tracking-widest ${getMasteryColor(selectedSkill.mastery_level || 0)}`}>
                      {getMasteryLabel(selectedSkill.mastery_level || 0)}
                      {selectedSkill.mastery_level > 0 && ` • ${Math.round((selectedSkill.mastery_level || 0) * 100)}%`}
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

          {/* Skill Tree Scroll Area */}
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

      {/* Bottom Toolbar & Text Input */}
      <div className="z-50 absolute bottom-8 left-1/2 -translate-x-1/2 w-[95%] max-w-[680px]">
        <div className="bg-white border-2 border-black p-2 px-4 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row items-center gap-3">
          <div className="flex items-center space-x-2.5 pl-1 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 border-black ${isSessionActive ? 'bg-black text-white animate-pulse' : 'bg-white text-black'}`}>
                <Brain size={16} />
              </div>
              <span className="font-bold text-xs uppercase tracking-tighter w-24">
                {isSessionActive ? "NEWTON ACTIVE" : "READY"}
              </span>
            </div>
            {/* Direct Replay Trigger */}
            {rrwebEventsRef.current.length > 0 && !isSessionActive && (
              <button 
                onClick={saveSessionReplay}
                className="md:hidden p-1.5 border border-black rounded-full hover:bg-black hover:text-white transition-colors"
                title="Save Replay"
              >
                <Database size={12} />
              </button>
            )}
          </div>

          {/* Socratic Text Backup Field */}
          <form onSubmit={handleTextInputSubmit} className="flex-1 flex w-full border-2 border-black bg-white rounded-full overflow-hidden">
            <input 
              type="text" 
              value={textInput} 
              onChange={(e) => setTextInput(e.target.value)} 
              placeholder="Type your mathematical logic here..."
              className="flex-1 px-4 py-2 text-xs font-bold uppercase tracking-tight focus:outline-none placeholder-black/40 bg-transparent"
              disabled={isConnecting}
            />
            <button 
              type="submit" 
              className="px-4 border-l-2 border-black bg-black text-white hover:bg-white hover:text-black transition-all flex items-center justify-center"
              disabled={isConnecting}
            >
              <Send size={12} />
            </button>
          </form>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button 
              className={`flex-1 md:flex-none flex items-center justify-center space-x-2 px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-tight transition-all border-2 border-black ${isSessionActive ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white text-black hover:bg-black hover:text-white'}`}
              onClick={toggleSession}
              disabled={isConnecting}
            >
              {isConnecting ? <Loader2 size={14} className="animate-spin" /> : (isSessionActive ? <MicOff size={14} /> : <Mic size={14} />)}
              <span>{isConnecting ? "WAIT" : (isSessionActive ? "END SESSION" : "START SESSION")}</span>
            </button>

            {rrwebEventsRef.current.length > 0 && !isSessionActive && (
              <button 
                onClick={saveSessionReplay}
                className="hidden md:flex items-center justify-center p-2.5 border-2 border-black rounded-full hover:bg-black hover:text-white transition-colors bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none translate-y-0 active:translate-y-0.5"
                title="Save session replay to cloud database"
              >
                <Database size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
