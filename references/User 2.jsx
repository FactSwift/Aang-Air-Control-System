import React, { useState, useEffect, useMemo } from 'react';
import { 
  Thermometer, 
  Clock, 
  Wind, 
  Bot, 
  Snowflake, 
  LayoutDashboard,
  Fan,
  Sparkles,
  Zap,
  Activity,
  ShieldCheck,
  AlertCircle,
  Cpu,
  RefreshCcw
} from 'lucide-react';

const App = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [airQuality, setAirQuality] = useState(15);
  const [gasLevel, setGasLevel] = useState(0.5);
  const [isRobotOn, setIsRobotOn] = useState(true);
  const [isACOn, setIsACOn] = useState(true);

  // Logika Otomatisasi
  const isFanActive = airQuality >= 20 || gasLevel >= 1.0;
  const isIonizerActive = airQuality >= 30 || gasLevel >= 1.5;

  useEffect(() => {
    const sensorInterval = setInterval(() => {
      const newPM = Math.floor(Math.random() * (45 - 10 + 1)) + 10;
      const newGas = parseFloat((Math.random() * (2.0 - 0.1) + 0.1).toFixed(2));
      
      setAirQuality(newPM);
      setGasLevel(newGas);
    }, 4000); 

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    return () => {
      clearInterval(sensorInterval);
      clearInterval(timer);
    };
  }, []);

  const timeStrings = useMemo(() => ({
    clock: currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    date: currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    day: currentTime.toLocaleDateString('id-ID', { weekday: 'long' })
  }), [currentTime]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100 pb-12">
      {/* Header Section */}
      <header className="bg-white/70 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-tr from-indigo-600 to-indigo-400 p-2.5 rounded-2xl shadow-lg shadow-indigo-100">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-800 uppercase leading-none mb-1">Deebo Smart AIQ</h1>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isFanActive ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-nowrap">Sistem Aktif</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right mr-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kualitas Udara</p>
                <p className={`text-sm font-bold ${airQuality > 30 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {airQuality > 30 ? 'Perlu Filtrasi' : 'Kondisi Baik'}
                </p>
            </div>
            <div className="p-3 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer">
              <RefreshCcw className="w-4 h-4" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 lg:p-10">
        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          
          {/* PM 2.5 Card */}
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-500 group">
            <div className="flex justify-between items-start mb-6">
              <div className={`p-4 rounded-2xl transition-all duration-500 ${airQuality >= 30 ? 'bg-red-50 text-red-500 scale-110 shadow-lg shadow-red-100' : 'bg-emerald-50 text-emerald-500'}`}>
                <Wind className={`w-6 h-6 ${airQuality >= 30 ? 'animate-bounce' : ''}`} />
              </div>
              <div className="text-right">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Partikel</span>
                 <span className="text-[10px] font-bold text-slate-300 uppercase">PM2.5 Sensor</span>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <h3 className={`text-5xl font-black tracking-tighter transition-colors ${airQuality >= 30 ? 'text-red-600' : 'text-slate-800'}`}>
                {airQuality}
              </h3>
              <span className="text-xl text-slate-300 font-bold">µg</span>
            </div>
            <div className="mt-6">
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-1000 ${airQuality >= 30 ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min((airQuality / 50) * 100, 100)}%` }}
                    ></div>
                </div>
            </div>
          </div>

          {/* Gas Card */}
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-amber-50/50 transition-all duration-500">
            <div className="flex justify-between items-start mb-6">
              <div className={`p-4 rounded-2xl transition-colors ${gasLevel >= 1.2 ? 'bg-amber-100 text-amber-600 shadow-lg shadow-amber-100' : 'bg-blue-50 text-blue-500'}`}>
                <Zap className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kadar Gas</span>
            </div>
            <div className="flex items-baseline gap-1">
              <h3 className={`text-5xl font-black tracking-tighter transition-colors ${gasLevel >= 1.2 ? 'text-amber-600' : 'text-slate-800'}`}>
                {gasLevel}
              </h3>
              <span className="text-xl text-slate-300 font-bold">ppm</span>
            </div>
            <p className="mt-6 text-slate-400 text-[10px] font-black uppercase tracking-widest">VOC Detection</p>
          </div>

          {/* Temperature Card */}
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-500">
            <div className="flex justify-between items-start mb-6">
              <div className="p-4 bg-orange-50 rounded-2xl text-orange-500 shadow-lg shadow-orange-100"><Thermometer className="w-6 h-6" /></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Suhu</span>
            </div>
            <div className="flex items-baseline gap-1">
              <h3 className="text-5xl font-black tracking-tighter text-slate-800">24.5</h3>
              <span className="text-xl text-slate-300 font-bold">°C</span>
            </div>
            <div className="mt-6 flex items-center gap-2 text-emerald-500">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-wider text-nowrap">Temperatur Ideal</span>
            </div>
          </div>

          {/* Time Card */}
          <div className="bg-slate-900 rounded-[32px] p-8 shadow-2xl shadow-slate-300 relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] opacity-10">
                <Clock className="w-32 h-32 text-white -rotate-12" />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl text-white"><Activity className="w-5 h-5 text-indigo-400" /></div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Real-Time</span>
                </div>
                <div className="mt-6">
                  <h3 className="text-4xl font-mono font-black text-white tracking-tighter leading-none mb-2">{timeStrings.clock}</h3>
                  <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-[0.2em] leading-none mb-1">{timeStrings.day}</p>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-none">{timeStrings.date}</p>
                </div>
            </div>
          </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Smart Automation Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Sistem Otomatisasi</h4>
                </div>
                <div className="px-2 py-1 bg-indigo-50 rounded-lg text-[10px] font-black text-indigo-600 uppercase">AI Aktif</div>
            </div>
            
            {/* Fan Status */}
            <div className={`p-8 rounded-[40px] border transition-all duration-700 flex items-center justify-between ${isFanActive ? 'bg-white border-orange-200 shadow-xl shadow-orange-100/50 scale-[1.02]' : 'bg-white border-slate-100 opacity-80'}`}>
              <div className="flex items-center gap-6">
                <div className={`p-5 rounded-3xl transition-all duration-500 ${isFanActive ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-slate-50 text-slate-300'}`}>
                  <Fan className={`w-8 h-8 ${isFanActive ? 'animate-spin' : ''}`} style={{ animationDuration: '1.5s' }} />
                </div>
                <div>
                  <p className="font-black text-xl text-slate-800 leading-none mb-2">Kipas Exhaust</p>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isFanActive ? 'bg-orange-500 animate-pulse' : 'bg-slate-300'}`}></span>
                    <p className={`text-xs font-bold uppercase tracking-wider ${isFanActive ? 'text-orange-500' : 'text-slate-400'}`}>
                        {isFanActive ? 'Berputar: Menarik Polutan' : 'Standby Mode'}
                    </p>
                  </div>
                </div>
              </div>
              {isFanActive && (
                <div className="hidden sm:block">
                    <AlertCircle className="w-6 h-6 text-Orange-400" />
                </div>
              )}
            </div>

            {/* Ionizer Status */}
            <div className={`p-8 rounded-[40px] border transition-all duration-700 flex items-center justify-between ${isIonizerActive ? 'bg-white border-indigo-200 shadow-xl shadow-indigo-100/50 scale-[1.02]' : 'bg-white border-slate-100 opacity-80'}`}>
              <div className="flex items-center gap-6">
                <div className={`p-5 rounded-3xl transition-all duration-500 ${isIonizerActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-50 text-slate-300'}`}>
                  <Sparkles className={`w-8 h-8 ${isIonizerActive ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <p className="font-black text-xl text-slate-800 leading-none mb-2">Ionizer Pro</p>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isIonizerActive ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'}`}></span>
                    <p className={`text-xs font-bold uppercase tracking-wider ${isIonizerActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                        {isIonizerActive ? 'Proses Sterilisasi' : 'Standby Mode'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Manual Control Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 px-2">
                <Bot className="w-4 h-4 text-slate-400" />
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Kontrol Manual</h4>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {/* Bot Control */}
                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between hover:border-indigo-200 transition-all group">
                    <div className="flex items-center gap-5">
                        <div className={`p-4 rounded-2xl transition-all group-hover:scale-110 ${isRobotOn ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-300'}`}>
                            <Bot className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="font-black text-lg text-slate-800 leading-none mb-1">Deebo Assistant</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Robot Navigasi</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsRobotOn(!isRobotOn)} 
                        className={`w-16 h-9 rounded-full relative transition-all duration-300 shadow-inner ${isRobotOn ? 'bg-indigo-600' : 'bg-slate-200'}`}
                    >
                        <div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-md ${isRobotOn ? 'left-8' : 'left-2'}`}></div>
                    </button>
                </div>

                {/* AC Control */}
                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between hover:border-blue-200 transition-all group">
                    <div className="flex items-center gap-5">
                        <div className={`p-4 rounded-2xl transition-all group-hover:scale-110 ${isACOn ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-300'}`}>
                            <Snowflake className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="font-black text-lg text-slate-800 leading-none mb-1">Smart Air Cond</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kontrol Iklim</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsACOn(!isACOn)} 
                        className={`w-16 h-9 rounded-full relative transition-all duration-300 shadow-inner ${isACOn ? 'bg-blue-600' : 'bg-slate-200'}`}
                    >
                        <div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-md ${isACOn ? 'left-8' : 'left-2'}`}></div>
                    </button>
                </div>

                {/* Info Card */}
                <div className="bg-indigo-600/5 border border-indigo-100 p-6 rounded-[32px] flex items-start gap-4">
                    <AlertCircle className="w-5 h-5 text-indigo-600 mt-1 shrink-0" />
                    <div>
                        <p className="text-xs font-bold text-indigo-900 mb-1 tracking-tight">Optimasi Energi AI</p>
                        <p className="text-[10px] text-indigo-600/80 leading-relaxed font-medium">
                            Sistem secara otomatis menyesuaikan daya hisap kipas berdasarkan volume PM2.5 di udara untuk menghemat konsumsi energi hingga 30%.
                        </p>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer Mobile Info */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-slate-200 px-6 py-3 rounded-full shadow-2xl flex items-center gap-8 lg:hidden z-50">
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-[10px] font-black uppercase text-slate-500">Node-01</span>
         </div>
         <div className="w-px h-4 bg-slate-200"></div>
         <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            <span className="text-[10px] font-black uppercase text-slate-500">Syncing...</span>
         </div>
      </div>
    </div>
  );
};

export default App;