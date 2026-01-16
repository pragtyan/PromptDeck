import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight, 
  Maximize2, 
  Minimize2,
  Lock, 
  Facebook,
  Layers,
  Zap,
  ShieldCheck,
  Fingerprint,
  Download,
  UserPlus,
  LogIn,
  Eye,
  EyeOff,
  Calendar,
  X
} from 'lucide-react';

// --- CONFIGURATION ---
const apiKey = ""; 

const App = () => {
  // Application State
  const [identity, setIdentity] = useState(null); 
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authView, setAuthView] = useState('signup'); // 'signup' or 'signin'
  const [showPassword, setShowPassword] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    dob: ''
  });
  const [authError, setAuthError] = useState('');
  
  const [step, setStep] = useState('landing'); 
  const [prompt, setPrompt] = useState('');
  const [slideCount, setSlideCount] = useState(5);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slides, setSlides] = useState([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [downloadAttempted, setDownloadAttempted] = useState(false);

  // --- IDENTITY LOGIC ---
  useEffect(() => {
    const activeSession = localStorage.getItem('pragyan_active_session');
    if (activeSession) {
      setIdentity(JSON.parse(activeSession));
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsAuthModalOpen(false);
        setShowPremiumModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setAuthError('');
  };

  const handleSignUp = (e) => {
    e.preventDefault();
    const { username, password, dob } = formData;
    
    if (!username || !password || !dob) {
      setAuthError('All fields are required.');
      return;
    }
    
    const formattedUser = username.trim().toLowerCase().replace(/\s+/g, '');
    const address = `${formattedUser}.pragyanai.com`;
    
    const existingUsers = JSON.parse(localStorage.getItem('pragyan_registered_users') || '[]');
    if (existingUsers.some(u => u.address === address)) {
      setAuthError('Username already taken.');
      return;
    }

    const newUser = {
      username: formattedUser,
      address: address,
      password: password,
      dob: dob,
      registeredAt: new Date().toISOString()
    };
    
    existingUsers.push(newUser);
    localStorage.setItem('pragyan_registered_users', JSON.stringify(existingUsers));
    
    setAuthView('signin');
    setAuthError('');
    setFormData(prev => ({ ...prev, password: '' }));
  };

  const handleSignIn = (e) => {
    e.preventDefault();
    const { username, password } = formData;
    const formattedUser = username.trim().toLowerCase().replace(/\s+/g, '');
    const address = `${formattedUser}.pragyanai.com`;
    
    const registeredUsers = JSON.parse(localStorage.getItem('pragyan_registered_users') || '[]');
    const user = registeredUsers.find(u => (u.address === address || u.username === formattedUser) && u.password === password);
    
    if (user) {
      setIdentity(user);
      localStorage.setItem('pragyan_active_session', JSON.stringify(user));
      setIsAuthModalOpen(false);
      setAuthError('');
      setFormData({ username: '', password: '', dob: '' });
      if (downloadAttempted) setDownloadAttempted(false);
    } else {
      setAuthError('Invalid credentials. Check username or password.');
    }
  };

  const handleSignOut = () => {
    setIdentity(null);
    localStorage.removeItem('pragyan_active_session');
    setStep('landing');
    setSlides([]);
  };

  const handleDownloadRequest = () => {
    if (!identity) {
      setDownloadAttempted(true);
      setAuthView('signin');
      setIsAuthModalOpen(true);
      return;
    }
    window.print();
  };

  const generatePresentationData = async (userPrompt, count) => {
    setLoadingStatus('Architecting slide deck structure...');
    const systemPrompt = `
      You are an expert presentation designer. Return a JSON object with:
      - title: String
      - slides: Array of ${count} objects (title, content: Array, visualPrompt).
    `;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Topic: ${userPrompt}` }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      const data = await response.json();
      return JSON.parse(data.candidates[0].content.parts[0].text);
    } catch (error) { throw error; }
  };

  const generateSlideImage = async (visualPrompt) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: { prompt: `${visualPrompt}, cinematic, professional photography` },
          parameters: { sampleCount: 1 }
        })
      });
      const result = await response.json();
      return `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
    } catch (e) { return "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200"; }
  };

  const handleStartGeneration = async () => {
    if (!prompt.trim()) return;
    setStep('generating');
    try {
      const deckData = await generatePresentationData(prompt, slideCount);
      const enrichedSlides = [];
      for (let i = 0; i < deckData.slides.length; i++) {
        setLoadingStatus(`Designing Slide ${i + 1} of ${deckData.slides.length}`);
        const imageUrl = await generateSlideImage(deckData.slides[i].visualPrompt);
        enrichedSlides.push({ ...deckData.slides[i], backgroundImage: imageUrl });
      }
      setSlides(enrichedSlides);
      setStep('viewing');
    } catch (e) { setStep('landing'); }
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  return (
    <div className={`font-sans text-white bg-[#020202] min-h-screen ${isFullScreen ? 'overflow-hidden' : ''}`}>
      {/* LANDING VIEW */}
      {step === 'landing' && (
        <div className="min-h-screen bg-[#020202] text-white flex flex-col items-center justify-center px-6 overflow-hidden relative print:hidden">
          <div className="absolute top-8 right-8 z-50">
            {identity ? (
              <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-2 pl-4 rounded-2xl backdrop-blur-xl border-blue-500/20 shadow-xl shadow-blue-500/5">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-blue-500 font-black uppercase tracking-widest">{identity.address}</span>
                  <button onClick={handleSignOut} className="text-[9px] text-red-400/60 hover:text-red-300 transition-colors uppercase font-black">Terminate</button>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center font-black text-xs shadow-lg">
                  {identity.username[0].toUpperCase()}
                </div>
              </div>
            ) : (
              <button 
                onClick={() => { setAuthView('signup'); setIsAuthModalOpen(true); }}
                className="bg-white/5 border border-white/10 px-6 py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2 backdrop-blur-md"
              >
                <Fingerprint size={14} className="text-blue-500" /> Identity Access
              </button>
            )}
          </div>

          <div className="z-10 max-w-3xl w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-10">
              <Zap size={12} className="fill-current" />
              <span>Next-Gen Presentation Engine</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4 text-center bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent">
              Prompt Deck<span className="text-blue-500">.</span>
            </h1>
            <div className="flex items-center gap-3 text-gray-500 text-sm mb-16 tracking-widest uppercase font-medium">
              <span>Directed by <span className="text-white">Pragyan Koirala</span></span>
            </div>

            <div className="w-full bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 md:p-10 backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <div className="relative z-10 space-y-10">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="What is your story about?"
                  className="w-full bg-transparent border-b border-white/20 py-4 text-2xl md:text-4xl font-light focus:outline-none focus:border-blue-500 transition-all text-center placeholder:text-gray-800"
                />
                <div className="flex flex-col md:flex-row items-center gap-10">
                  <div className="flex-1 w-full space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Slide Count</span>
                      <span className="text-blue-500 font-mono text-lg">{slideCount}</span>
                    </div>
                    <input 
                      type="range" min="5" max="20" value={slideCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val > 10) setShowPremiumModal(true);
                        else setSlideCount(val);
                      }}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                  <button 
                    onClick={handleStartGeneration}
                    disabled={!prompt.trim()}
                    className="w-full md:w-auto bg-white text-black px-12 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-blue-600 hover:text-white transition-all duration-500 disabled:opacity-20 shadow-xl active:scale-95"
                  >
                    Launch <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GENERATING VIEW */}
      {step === 'generating' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center print:hidden">
          <div className="relative w-24 h-24 mb-12">
            <Sparkles className="text-blue-500 animate-pulse absolute inset-0 m-auto" size={48} />
            <div className="absolute inset-0 border-2 border-blue-500/20 rounded-full animate-ping" />
          </div>
          <h2 className="text-xs font-black tracking-[0.4em] mb-4 uppercase text-white/40">Architecting Content</h2>
          <p className="text-white text-sm font-medium animate-pulse">{loadingStatus}</p>
        </div>
      )}

      {/* VIEWING VIEW */}
      {step === 'viewing' && (
        <div className={`min-h-screen bg-[#020202] flex flex-col ${isFullScreen ? 'fixed inset-0 z-[150]' : ''}`}>
          <div className="px-8 py-5 flex items-center justify-between border-b border-white/5 bg-[#020202]/80 backdrop-blur-xl z-20 print:hidden">
            <div className="flex items-center gap-8">
              <button onClick={() => setStep('landing')} className="text-gray-500 hover:text-white flex items-center gap-2 group transition-colors">
                <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Exit</span>
              </button>
              <div className="flex flex-col">
                <span className="text-[9px] text-blue-500 uppercase tracking-widest font-black">Deck</span>
                <span className="text-sm font-bold text-white/90 tracking-tight truncate max-w-[200px]">{prompt}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={handleDownloadRequest}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-500/20 active:scale-95"
              >
                <Download size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Download PDF Deck</span>
              </button>
              <button onClick={toggleFullScreen} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 transition-all border border-white/5">
                {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            </div>
          </div>

          <div className="flex-1 relative flex items-center justify-center p-4 md:p-8 bg-[#050505] overflow-hidden print:hidden">
            <div className={`w-full h-full relative overflow-hidden flex flex-col animate-in fade-in zoom-in-95 ${isFullScreen ? 'max-w-none max-h-none rounded-none shadow-none border-none' : 'max-w-[1200px] max-h-[675px] aspect-video rounded-[1.5rem] md:rounded-[2.5rem] shadow-3xl border border-white/10'}`}>
              <div 
                className="absolute inset-0 transition-transform duration-[10000ms] scale-100" 
                style={{ 
                  backgroundImage: `url(${slides[currentSlideIndex]?.backgroundImage})`, 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'center' 
                }} 
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
              <div className="relative z-10 flex-1 p-8 md:p-16 flex flex-col justify-center overflow-y-auto custom-scrollbar">
                <div className="mb-4 h-1 w-16 bg-blue-500 flex-shrink-0"></div>
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-black mb-6 leading-[1.1] text-white tracking-tighter max-w-4xl break-words">
                  {slides[currentSlideIndex]?.title}
                </h2>
                <ul className="space-y-4 md:space-y-6 max-w-3xl">
                  {slides[currentSlideIndex]?.content.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-4 text-lg md:text-xl lg:text-2xl font-medium text-gray-200/90 tracking-tight animate-in slide-in-from-left-4" style={{ animationDelay: `${idx * 100}ms` }}>
                      <div className="mt-2.5 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-500/20 flex-shrink-0" />
                      <span className="break-words">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="absolute bottom-6 left-8 right-8 flex justify-between items-end opacity-40 pointer-events-none">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[7px] font-black uppercase tracking-widest">Hash: {Math.random().toString(16).slice(2, 10)}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest">{identity?.address}</span>
                </div>
                <span className="text-xs font-mono">{currentSlideIndex + 1} / {slides.length}</span>
              </div>
            </div>

            <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 md:px-6 pointer-events-none z-30">
              <button 
                onClick={() => currentSlideIndex > 0 && setCurrentSlideIndex(v => v - 1)} 
                className={`p-4 text-white/20 hover:text-white transition-all pointer-events-auto ${currentSlideIndex === 0 ? 'invisible' : ''}`}
              >
                <ChevronLeft size={48} strokeWidth={1.5} />
              </button>
              <button 
                onClick={() => currentSlideIndex < slides.length - 1 && setCurrentSlideIndex(v => v + 1)} 
                className={`p-4 text-white/20 hover:text-white transition-all pointer-events-auto ${currentSlideIndex === slides.length - 1 ? 'invisible' : ''}`}
              >
                <ChevronRight size={48} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="hidden print:block print:bg-black">
            {slides.map((slide, sIdx) => (
              <div key={sIdx} className="print-slide relative w-screen h-screen overflow-hidden flex flex-col bg-black">
                <div 
                  className="absolute inset-0" 
                  style={{ 
                    backgroundImage: `url(${slide.backgroundImage})`, 
                    backgroundSize: 'cover', 
                    backgroundPosition: 'center' 
                  }} 
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
                <div className="relative z-10 flex-1 p-20 flex flex-col justify-center">
                  <div className="mb-6 h-1.5 w-24 bg-blue-600"></div>
                  <h2 className="text-7xl font-black mb-10 text-white tracking-tighter leading-tight">{slide.title}</h2>
                  <ul className="space-y-8">
                    {slide.content.map((point, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-6 text-3xl font-semibold text-white/90">
                        <div className="mt-4 w-3 h-3 rounded-full bg-blue-600 ring-8 ring-blue-600/20" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="absolute bottom-10 left-20 right-20 flex justify-between items-end opacity-50 border-t border-white/10 pt-6">
                  <div className="text-xs font-bold uppercase tracking-[0.3em] text-white">Generated via Prompt Deck • {identity?.address}</div>
                  <div className="text-xl font-mono text-white">Slide {sIdx + 1} / {slides.length}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALS */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl print:hidden overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[2.5rem] max-w-md w-full shadow-3xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <button 
              onClick={() => setIsAuthModalOpen(false)} 
              className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
            
            <div className="overflow-y-auto flex-1 px-2 custom-scrollbar pr-4">
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-1 ring-blue-500/20">
                <Fingerprint className="text-blue-500" size={24} />
              </div>
              <h3 className="text-xl font-bold mb-1 text-center tracking-tight">{authView === 'signup' ? 'Create AI Identity' : 'Verify Identity'}</h3>
              <p className="text-gray-500 text-[9px] text-center mb-8 uppercase tracking-[0.3em] font-black">{authView === 'signup' ? 'Digital Registration' : 'Secure Session Login'}</p>
              
              <form onSubmit={authView === 'signup' ? handleSignUp : handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest ml-1">Username</label>
                  <input type="text" name="username" value={formData.username} onChange={handleInputChange} placeholder="Enter your username" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:outline-none focus:border-blue-500 transition-all font-sans text-white text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest ml-1">Password</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleInputChange} placeholder="Enter password" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:outline-none focus:border-blue-500 transition-all font-sans text-white text-sm" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                {authView === 'signup' && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest ml-1">Date of Birth</label>
                    <div className="relative">
                      <input type="date" name="dob" value={formData.dob} onChange={handleInputChange} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-white text-sm" style={{ colorScheme: 'dark' }} />
                      <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
                    </div>
                  </div>
                )}
                {authError && <p className="text-red-400 text-[10px] font-bold mt-2 text-center uppercase tracking-wider">{authError}</p>}
                
                <div className="flex flex-col gap-3 mt-6">
                  <button type="submit" className="w-full bg-white text-black py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 hover:text-white transition-all shadow-lg flex items-center justify-center gap-2 active:scale-[0.98]">
                    {authView === 'signup' ? 'Register Account' : 'Initialize Session'} {authView === 'signup' ? <UserPlus size={14} /> : <LogIn size={14} />}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsAuthModalOpen(false)}
                    className="w-full bg-white/5 text-gray-400 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 hover:text-white transition-all border border-white/5"
                  >
                    Esc / Cancel
                  </button>
                </div>
              </form>
              
              <div className="mt-8 pt-6 border-t border-white/5 text-center mb-4">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">{authView === 'signup' ? 'Already registered?' : 'Need an AI address?'}</p>
                <button onClick={() => { setAuthView(authView === 'signup' ? 'signin' : 'signup'); setAuthError(''); }} className="text-[10px] text-blue-500 font-black uppercase tracking-widest hover:text-blue-400 transition-colors">
                  {authView === 'signup' ? 'Switch to Sign In' : 'Create New Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPremiumModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300 print:hidden">
          <div className="bg-[#0a0a0a] border border-white/10 p-10 rounded-[3rem] max-w-md w-full text-center relative">
            <button onClick={() => setShowPremiumModal(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white">
              <X size={20} />
            </button>
            <Lock className="text-blue-500 mx-auto mb-8" size={32} />
            <h3 className="text-2xl font-bold mb-4">Support Creator</h3>
            <p className="text-gray-500 text-sm mb-10 leading-relaxed">Expand your deck capacity to 20 slides by following the creator.</p>
            <a href="https://www.facebook.com/PragyanKoirala0" target="_blank" rel="noreferrer" onClick={() => { setSlideCount(20); setShowPremiumModal(false); }} className="block bg-[#1877F2] py-4 rounded-2xl font-bold mb-4 transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20">Follow on Facebook</a>
            <button onClick={() => setShowPremiumModal(false)} className="text-[10px] uppercase font-bold text-gray-600 hover:text-white">Maybe Later</button>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.5); border-radius: 10px; }

        input[type="date"]::-webkit-calendar-picker-indicator {
          background: transparent;
          bottom: 0;
          color: transparent;
          cursor: pointer;
          height: auto;
          left: 0;
          position: absolute;
          right: 0;
          top: 0;
          width: auto;
        }

        @media print {
          @page {
            size: 1600px 900px;
            margin: 0;
          }
          
          body {
            background: #000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-slide {
            page-break-after: always;
            width: 1600px !important;
            height: 900px !important;
            position: relative;
            display: flex !important;
            flex-direction: column;
            overflow: hidden;
          }

          .print-slide * {
            -webkit-print-color-adjust: exact;
          }

          header, footer, nav, .print-hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default App;