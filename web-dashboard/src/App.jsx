import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { database, ref, onValue, set } from './firebase';
import { FuzzyEngine } from './lib/fuzzyEngine';
import { MLClassifier } from './lib/mlClassifier';

// Lazy load Robot3D
const Robot3D = lazy(() => import('./components/Robot3D'));

import { 
  Wind, 
  Zap, 
  Thermometer, 
  Clock, 
  Fan, 
  Sparkles,
  Snowflake,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Info,
  AlertCircle,
  Cpu,
  Radio,
  Droplets,
  Brain,
  Activity,
  TrendingUp,
  Shield,
  Gamepad2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Circle,
  ChevronUp,
  ChevronDown,
  Move,
  Target
} from 'lucide-react';

// ================= MAIN APP COMPONENT =================
function App() {
  // State
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sensorData, setSensorData] = useState({
    pm25: 15,
    gasLevel: 450,  // CO₂ in ppm (typical indoor: 400-1000 ppm)
    temperature: 24.5,
    humidity: 60,
    timestamp: null
  });
  const [deviceState, setDeviceState] = useState({
    fan: false,
    ionizer: false,
    ac: true,
    acTemp: 24
  });
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Subscribe to sensor data from Firebase
  useEffect(() => {
    const sensorRef = ref(database, 'sensor_data/latest');
    
    const unsubscribe = onValue(sensorRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setSensorData({
          pm25: data.pm25 || 0,
          gasLevel: data.gasLevel || 0,
          temperature: data.temperature || 25,
          humidity: data.humidity || 60,
          timestamp: data.timestamp
        });
        setLastUpdate(new Date());
        setIsConnected(true);
      }
    }, (error) => {
      console.error('Firebase error:', error);
      setIsConnected(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to device control state
  useEffect(() => {
    const controlRef = ref(database, 'device_control');
    
    const unsubscribe = onValue(controlRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setDeviceState({
          fan: data.fan || false,
          ionizer: data.ionizer || false,
          ac: data.ac?.on ?? true,
          acTemp: data.ac?.temp || 24
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Fuzzy Logic Evaluation - Smart Air & Climate Control
  const aiEvaluation = useMemo(() => {
    const fuzzyResult = FuzzyEngine.evaluate(sensorData);
    const airQuality = FuzzyEngine.checkAirQuality(sensorData.pm25, sensorData.gasLevel);
    
    return {
      fuzzy: fuzzyResult,
      airQuality: airQuality,
      // Thresholds: PM2.5 > 15 atau CO > 9
      shouldActivateFan: airQuality.fan,
      shouldActivateIonizer: airQuality.ionizer_active,
      roomStatus: airQuality.status === 'good' ? 'good' : 'warning',
      statusMessage: airQuality.message,
      recommendedAC: fuzzyResult.acTemperature
    };
  }, [sensorData]);

  // ML Classification - Air Quality Prediction
  const mlPrediction = useMemo(() => {
    return MLClassifier.predict(
      sensorData.temperature,
      sensorData.humidity,
      sensorData.pm25,
      sensorData.gasLevel
    );
  }, [sensorData]);

  // Auto-update device control based on AI (Fuzzy Logic + Expert System)
  useEffect(() => {
    if (!isConnected) return;

    // Get AI recommendations
    const shouldFan = aiEvaluation.shouldActivateFan;
    const shouldIonizer = aiEvaluation.shouldActivateIonizer;
    const recommendedACTemp = aiEvaluation.recommendedAC;

    // Update Fan and Ionizer if different
    if (shouldFan !== deviceState.fan || shouldIonizer !== deviceState.ionizer) {
      set(ref(database, 'device_control/fan'), shouldFan);
      set(ref(database, 'device_control/ionizer'), shouldIonizer);
    }

    // Auto-update AC temperature from Fuzzy Logic if AC is ON
    if (deviceState.ac && recommendedACTemp !== deviceState.acTemp) {
      set(ref(database, 'device_control/ac/temp'), recommendedACTemp);
    }
  }, [aiEvaluation, isConnected, deviceState.fan, deviceState.ionizer, deviceState.ac, deviceState.acTemp]);

  // Toggle AC
  const toggleAC = useCallback(() => {
    const newState = !deviceState.ac;
    set(ref(database, 'device_control/ac/on'), newState);
  }, [deviceState.ac]);

  // ================= ROBOT REMOTE CONTROL =================
  const [robotActive, setRobotActive] = useState(false);
  const [currentCommand, setCurrentCommand] = useState('stop');
  const [servoAngle, setServoAngle] = useState(90);

  // Subscribe to robot status from Firebase
  useEffect(() => {
    const robotRef = ref(database, 'robot_control');
    
    const unsubscribe = onValue(robotRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setCurrentCommand(data.command || 'stop');
        setServoAngle(data.servoAngle || 90);
        setRobotActive(data.active || false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Send robot movement command
  const sendRobotCommand = useCallback((command) => {
    console.log('[ROBOT] Sending command:', command);
    set(ref(database, 'robot_control/command'), command)
      .then(() => console.log('[ROBOT] Command sent successfully:', command))
      .catch((error) => console.error('[ROBOT] Command failed:', error));
    set(ref(database, 'robot_control/timestamp'), Date.now());
    setCurrentCommand(command);
  }, []);

  // Send servo command with continuous movement
  const sendServoCommand = useCallback((direction) => {
    const newAngle = direction === 'up' 
      ? Math.max(30, servoAngle - 3)
      : Math.min(180, servoAngle + 3);
    console.log('[SERVO] Sending:', direction, 'angle:', newAngle);
    set(ref(database, 'robot_control/servoAngle'), newAngle)
      .then(() => console.log('[SERVO] Angle sent successfully'))
      .catch((error) => console.error('[SERVO] Failed:', error));
    set(ref(database, 'robot_control/servoCommand'), direction);
    setServoAngle(newAngle);
  }, [servoAngle]);

  // Stop robot movement
  const stopRobot = useCallback(() => {
    console.log('[ROBOT] Stopping');
    set(ref(database, 'robot_control/command'), 'stop')
      .then(() => console.log('[ROBOT] Stop sent successfully'))
      .catch((error) => console.error('[ROBOT] Stop failed:', error));
    setCurrentCommand('stop');
  }, []);

  // Toggle robot active state
  const toggleRobotActive = useCallback(() => {
    const newState = !robotActive;
    console.log('[ROBOT] Toggle active:', newState);
    set(ref(database, 'robot_control/active'), newState)
      .then(() => console.log('[ROBOT] Active state sent:', newState))
      .catch((error) => console.error('[ROBOT] Active toggle failed:', error));
    if (!newState) {
      set(ref(database, 'robot_control/command'), 'stop');
    }
    setRobotActive(newState);
  }, [robotActive]);

  // Format time strings
  const timeStrings = useMemo(() => ({
    clock: currentTime.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit', 
      hour12: false 
    }),
    day: currentTime.toLocaleDateString('id-ID', { weekday: 'long' }),
    date: currentTime.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }), [currentTime]);

  // PM2.5 status
  const pmStatus = useMemo(() => {
    if (sensorData.pm25 >= 30) return { color: 'red', bg: 'bg-red-50', text: 'text-red-500', danger: true };
    if (sensorData.pm25 >= 20) return { color: 'orange', bg: 'bg-orange-50', text: 'text-orange-500', danger: false };
    return { color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-500', danger: false };
  }, [sensorData.pm25]);

  // Gas/CO₂ status (threshold: 606 ppm = bahaya)
  const gasStatus = useMemo(() => {
    if (sensorData.gasLevel >= 606) return { color: 'amber', bg: 'bg-amber-100', text: 'text-amber-600', danger: true };
    if (sensorData.gasLevel >= 500) return { color: 'orange', bg: 'bg-orange-50', text: 'text-orange-500', danger: false };
    return { color: 'blue', bg: 'bg-blue-50', text: 'text-blue-500', danger: false };
  }, [sensorData.gasLevel]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100 pb-12">
      {/* Header */}
      <header className="glass-header border-b border-slate-200/60 sticky top-0 z-50 bg-white/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-tr from-indigo-600 to-indigo-400 p-1 rounded-2xl shadow-lg shadow-indigo-100">
              <img src="/aang.png" alt="Aang" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-800 uppercase leading-none mb-1">
                Aang
              </h1>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  aiEvaluation.roomStatus === 'warning' 
                    ? 'bg-orange-500 animate-pulse' 
                    : 'bg-emerald-500'
                }`} />
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  Sistem Aktif
                </p>
              </div>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right mr-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Status Ruangan
              </p>
              <p className={`text-sm font-bold ${
                aiEvaluation.roomStatus === 'warning' 
                  ? 'text-orange-500' 
                  : 'text-emerald-500'
              }`}>
                {aiEvaluation.roomStatus === 'warning' ? 'Perlu Filtrasi' : 'Kondisi Baik'}
              </p>
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="p-3 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6 lg:p-10">
        {/* Sensor Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          
          {/* PM2.5 Card */}
          <div className="bg-white rounded-[32px] p-8 shadow-lg shadow-slate-100 border border-slate-100 hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-500">
            <div className="flex justify-between items-start mb-6">
              <div className={`p-4 rounded-2xl ${pmStatus.bg} ${pmStatus.text} transition-all duration-500 ${
                pmStatus.danger ? 'scale-110 shadow-lg shadow-red-100' : ''
              }`}>
                <Wind className="w-5 h-5" />
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Partikel
                </span>
                <span className="text-[10px] font-bold text-slate-300 uppercase">
                  PM2.5 Sensor
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <h3 className={`text-5xl font-black tracking-tighter ${
                pmStatus.danger ? 'text-red-600' : 'text-slate-800'
              }`}>
                {Math.round(sensorData.pm25)}
              </h3>
              <span className="text-xl text-slate-300 font-bold">µg/m³</span>
            </div>
            <div className="mt-6">
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${
                    pmStatus.danger ? 'bg-red-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min((sensorData.pm25 / 50) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* CO2 Card */}
          <div className="bg-white rounded-[32px] p-8 shadow-lg shadow-slate-100 border border-slate-100 hover:shadow-xl hover:shadow-amber-50/50 transition-all duration-500">
            <div className="flex justify-between items-start mb-6">
              <div className={`p-4 rounded-2xl ${gasStatus.bg} ${gasStatus.text} transition-all duration-500 ${
                gasStatus.danger ? 'shadow-lg shadow-amber-100' : ''
              }`}>
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Kadar CO₂
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <h3 className={`text-5xl font-black tracking-tighter ${
                gasStatus.danger ? 'text-amber-600' : 'text-slate-800'
              }`}>
                {sensorData.gasLevel.toFixed(0)}
              </h3>
              <span className="text-xl text-slate-300 font-bold">ppm</span>
            </div>
            <p className="mt-6 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              CO₂ Detection
            </p>
          </div>

          {/* Temperature Card */}
          <div className="bg-white rounded-[32px] p-8 shadow-lg shadow-slate-100 border border-slate-100 hover:shadow-xl transition-all duration-500">
            <div className="flex justify-between items-start mb-6">
              <div className="p-4 bg-orange-50 rounded-2xl text-orange-500">
                <Thermometer className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Suhu
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <h3 className="text-5xl font-black tracking-tighter text-slate-800">
                {sensorData.temperature.toFixed(1)}
              </h3>
              <span className="text-xl text-slate-300 font-bold">°C</span>
            </div>
            <div className="mt-6 flex items-center gap-2 text-emerald-500">
              <Droplets className="w-3 h-3" />
              <span className="text-[10px] font-black uppercase tracking-wider">
                {sensorData.humidity.toFixed(0)}% Humidity
              </span>
            </div>
          </div>

          {/* Time Card */}
          <div className="bg-slate-900 rounded-[32px] p-8 shadow-2xl shadow-slate-300 relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] opacity-10">
              <Clock className="w-32 h-32 text-white -rotate-12" />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl text-indigo-400">
                  <Radio className="w-4 h-4" />
                </div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  Real-Time
                </span>
              </div>
              <div className="mt-6">
                <h3 className="text-4xl font-mono font-black text-white tracking-tighter leading-none mb-2">
                  {timeStrings.clock}
                </h3>
                <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-[0.2em] leading-none mb-1">
                  {timeStrings.day}
                </p>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-none">
                  {timeStrings.date}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ML Classification Card */}
        <div className="mb-10">
          <div className="flex items-center gap-2 px-2 mb-6">
            <Brain className="w-4 h-4 text-violet-600" />
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">
              Klasifikasi Machine Learning
            </h4>
            <div className="px-2 py-1 bg-violet-50 rounded-lg text-[10px] font-black text-violet-600 uppercase ml-auto">
              AdaBoost Model
            </div>
          </div>
          
          <div className={`bg-white rounded-[32px] p-8 shadow-lg border-2 transition-all duration-500 ${mlPrediction.label.borderColor}`}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Classification Result */}
              <div className="lg:col-span-1">
                <div className={`p-6 rounded-3xl ${mlPrediction.label.bgColor} text-center`}>
                  <div className="text-5xl mb-3">{mlPrediction.label.icon}</div>
                  <h3 className={`text-2xl font-black ${mlPrediction.label.textColor} mb-1`}>
                    {mlPrediction.label.nameShort}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium px-2">
                    {mlPrediction.label.name}
                  </p>
                  <div className="mt-4 pt-4 border-t border-slate-200/50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Confidence Level
                    </p>
                    <p className={`text-2xl font-black ${mlPrediction.label.textColor}`}>
                      {MLClassifier.formatConfidence(mlPrediction.confidence)}
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      {MLClassifier.getConfidenceLevel(mlPrediction.confidence)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Probability Bars */}
              <div className="lg:col-span-1 space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                  Probabilitas Klasifikasi
                </p>
                
                {/* Class 0: TCI Comfort & IAQI Good */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Nyaman & Sehat
                    </span>
                    <span className="text-xs font-black text-emerald-600">
                      {(mlPrediction.probabilities.comfortGood * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                      style={{ width: `${mlPrediction.probabilities.comfortGood * 100}%` }}
                    />
                  </div>
                </div>

                {/* Class 1: TCI Most Comfort & IAQI Unhealthy */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      Tidak Sehat
                    </span>
                    <span className="text-xs font-black text-red-600">
                      {(mlPrediction.probabilities.comfortUnhealthy * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full transition-all duration-1000"
                      style={{ width: `${mlPrediction.probabilities.comfortUnhealthy * 100}%` }}
                    />
                  </div>
                </div>

                {/* Class 2: TCI Not Comfort & IAQI Good */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Tidak Nyaman namun masih Sehat
                    </span>
                    <span className="text-xs font-black text-amber-600">
                      {(mlPrediction.probabilities.notComfortGood * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                      style={{ width: `${mlPrediction.probabilities.notComfortGood * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Recommendations & Input Features */}
              <div className="lg:col-span-1 space-y-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Rekomendasi Sistem
                  </p>
                  <div className={`p-4 rounded-2xl ${mlPrediction.label.bgColor} space-y-2`}>
                    {MLClassifier.getRecommendations(mlPrediction.prediction).map((rec, idx) => (
                      <p key={idx} className={`text-xs font-medium ${mlPrediction.label.textColor}`}>
                        • {rec}
                      </p>
                    ))}
                  </div>
                </div>
                
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Input Features
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 p-3 rounded-xl">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Temp</p>
                      <p className="text-sm font-black text-slate-700">{sensorData.temperature.toFixed(1)}°C</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Humidity</p>
                      <p className="text-sm font-black text-slate-700">{sensorData.humidity.toFixed(0)}%</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">PM2.5</p>
                      <p className="text-sm font-black text-slate-700">{sensorData.pm25.toFixed(1)} µg/m³</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">CO₂</p>
                      <p className="text-sm font-black text-slate-700">{sensorData.gasLevel.toFixed(0)} ppm</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className={`mt-6 pt-6 border-t ${mlPrediction.label.borderColor}`}>
              <div className="flex items-start gap-3">
                <Activity className={`w-4 h-4 mt-0.5 ${mlPrediction.label.textColor}`} />
                <p className="text-sm text-slate-600 leading-relaxed">
                  {mlPrediction.label.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Control Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column - Automation */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-3 h-3 text-indigo-600" />
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">
                  Sistem Otomatisasi
                </h4>
              </div>
              <div className="px-2 py-1 bg-indigo-50 rounded-lg text-[10px] font-black text-indigo-600 uppercase">
                AI Aktif
              </div>
            </div>

            {/* Fan Card */}
            <div className={`p-8 rounded-[40px] border bg-white transition-all duration-500 flex items-center justify-between ${
              aiEvaluation.shouldActivateFan 
                ? 'border-orange-200 shadow-xl shadow-orange-100/50 scale-[1.02]' 
                : 'border-slate-100'
            }`}>
              <div className="flex items-center gap-6">
                <div className={`p-5 rounded-3xl transition-all duration-500 ${
                  aiEvaluation.shouldActivateFan 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-slate-50 text-slate-300'
                }`}>
                  <Fan className={`w-8 h-8 ${aiEvaluation.shouldActivateFan ? 'animate-spin' : ''}`} style={{ animationDuration: '2s' }} />
                </div>
                <div>
                  <p className="font-black text-xl text-slate-800 leading-none mb-2">
                    Kipas Exhaust
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      aiEvaluation.shouldActivateFan 
                        ? 'bg-orange-500 animate-pulse' 
                        : 'bg-slate-300'
                    }`} />
                    <p className={`text-xs font-bold uppercase tracking-wider ${
                      aiEvaluation.shouldActivateFan 
                        ? 'text-orange-500' 
                        : 'text-slate-400'
                    }`}>
                      {aiEvaluation.shouldActivateFan ? 'Berputar: Menarik Polutan' : 'Standby Mode'}
                    </p>
                  </div>
                </div>
              </div>
              {aiEvaluation.shouldActivateFan && (
                <AlertCircle className="w-6 h-6 text-orange-400" />
              )}
            </div>

            {/* Ionizer Card */}
            <div className={`p-8 rounded-[40px] border bg-white transition-all duration-500 flex items-center justify-between ${
              aiEvaluation.shouldActivateIonizer 
                ? 'border-indigo-200 shadow-xl shadow-indigo-100/50 scale-[1.02]' 
                : 'border-slate-100'
            }`}>
              <div className="flex items-center gap-6">
                <div className={`p-5 rounded-3xl transition-all duration-500 ${
                  aiEvaluation.shouldActivateIonizer 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-slate-50 text-slate-300'
                }`}>
                  <Sparkles className={`w-8 h-8 ${aiEvaluation.shouldActivateIonizer ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <p className="font-black text-xl text-slate-800 leading-none mb-2">
                    Ionizer Pro
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      aiEvaluation.shouldActivateIonizer 
                        ? 'bg-indigo-600 animate-pulse' 
                        : 'bg-slate-300'
                    }`} />
                    <p className={`text-xs font-bold uppercase tracking-wider ${
                      aiEvaluation.shouldActivateIonizer 
                        ? 'text-indigo-600' 
                        : 'text-slate-400'
                    }`}>
                      {aiEvaluation.shouldActivateIonizer ? 'Proses Sterilisasi' : 'Standby Mode'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Manual Control */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 px-2">
              <Radio className="w-3 h-3 text-slate-400" />
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">
                Kontrol Manual
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Robot Control Quick Access */}
              <button 
                onClick={() => document.getElementById('robot-control')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-gradient-to-r from-emerald-600 to-green-500 p-6 rounded-[32px] border border-emerald-500 shadow-lg shadow-emerald-100 flex items-center justify-between hover:from-emerald-700 hover:to-green-600 transition-all group text-left"
              >
                <div className="flex items-center gap-5">
                  <div className="p-4 rounded-2xl bg-white/20 text-white transition-all group-hover:scale-110">
                    <Gamepad2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-black text-lg text-white leading-none mb-1">
                      Robot Control
                    </p>
                    <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest">
                      DEEBO Remote via Firebase
                    </p>
                  </div>
                </div>
                <div className="text-white/50 group-hover:text-white transition-colors mr-2">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </button>

              {/* AC Control */}
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:border-blue-200 transition-all group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-2xl transition-all group-hover:scale-110 ${
                      deviceState.ac 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'bg-slate-50 text-slate-300'
                    }`}>
                      <Snowflake className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-lg text-slate-800 leading-none mb-1">
                        Smart Air Cond
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {deviceState.ac ? `Set: ${aiEvaluation.recommendedAC}°C` : 'Kontrol Iklim'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={toggleAC}
                    className={`w-16 h-9 rounded-full relative transition-all duration-300 shadow-inner ${
                      deviceState.ac ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  >
                    <div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-md ${
                      deviceState.ac ? 'left-8' : 'left-2'
                    }`} />
                  </button>
                </div>
                {deviceState.ac && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-[10px] text-blue-600 font-bold">
                      🧠 Fuzzy Logic → Suhu AC otomatis disesuaikan: {aiEvaluation.recommendedAC}°C
                    </p>
                  </div>
                )}
              </div>

              {/* Info Card */}
              <div className="bg-indigo-600/5 border border-indigo-100 p-6 rounded-[32px] flex items-start gap-4">
                <Info className="w-4 h-4 text-indigo-600 mt-1 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-indigo-900 mb-1 tracking-tight">
                    Optimasi Energi AI
                  </p>
                  <p className="text-[10px] text-indigo-600/80 leading-relaxed font-medium">
                    Sistem secara otomatis menyesuaikan suhu AC berdasarkan kondisi ruangan 
                    menggunakan Fuzzy Logic untuk kenyamanan optimal.
                  </p>
                </div>
              </div>

              {/* Fuzzy Logic Info */}
              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[32px]">
                <p className="text-xs font-bold text-emerald-800 mb-2">
                  🧠 Fuzzy Logic Active
                </p>
                <div className="space-y-1">
                  <p className="text-[10px] text-emerald-600/80 font-medium">
                    • Suhu AC Rekomendasi: {aiEvaluation.recommendedAC}°C
                  </p>
                  <p className="text-[10px] text-emerald-600/80 font-medium">
                    • Kipas: {aiEvaluation.shouldActivateFan ? 'ON' : 'OFF'}
                  </p>
                  <p className="text-[10px] text-emerald-600/80 font-medium">
                    • Ionizer: {aiEvaluation.shouldActivateIonizer ? 'ON' : 'OFF'}
                  </p>
                </div>
                <p className="text-[10px] text-emerald-500 mt-2 font-bold">
                  Status: {aiEvaluation.statusMessage}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ================= ROBOT REMOTE CONTROL SECTION ================= */}
        <div id="robot-control" className="mt-12 px-4 sm:px-6 scroll-mt-24">
          <div className="max-w-7xl mx-auto">
            {/* Section Header - Mobile Optimized */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-tr from-green-600 to-emerald-400 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg shadow-green-100">
                  <Gamepad2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">
                    DEEBO Remote
                  </h2>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-medium">
                    Firebase Cloud Control
                  </p>
                </div>
              </div>
              
              {/* Robot Active Toggle */}
              <div className="flex items-center justify-between sm:justify-end gap-4 bg-slate-100 sm:bg-transparent p-3 sm:p-0 rounded-2xl">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${robotActive ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                  <span className="text-xs font-bold text-slate-600 sm:text-slate-500 uppercase">
                    {robotActive ? 'Active' : 'Standby'}
                  </span>
                </div>
                <button 
                  onClick={toggleRobotActive}
                  className={`w-14 h-8 rounded-full relative transition-all duration-300 shadow-inner ${
                    robotActive ? 'bg-green-600' : 'bg-slate-300 sm:bg-slate-200'
                  }`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-md ${
                    robotActive ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* Remote Control Panel - Mobile First */}
            <div className={`bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8 rounded-3xl sm:rounded-[40px] border border-slate-700 shadow-2xl transition-all duration-500 ${
              !robotActive ? 'opacity-50 pointer-events-none' : ''
            }`}>
              
              {/* Mobile Layout: Stack vertically */}
              <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8">
                
                {/* Movement Controls - Always First on Mobile */}
                <div className="flex-1 flex flex-col items-center order-1">
                  <div className="flex items-center gap-2 mb-4">
                    <Move className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] sm:text-xs font-black text-emerald-400 uppercase tracking-widest">
                      Movement
                    </span>
                  </div>
                  
                  {/* D-Pad Style Controls */}
                  <div className="relative">
                    {/* Forward Button */}
                    <div className="flex justify-center mb-2 sm:mb-3">
                      <button
                        onPointerDown={() => sendRobotCommand('maju')}
                        onPointerUp={stopRobot}
                        onPointerLeave={stopRobot}
                        onPointerCancel={stopRobot}
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-150 active:scale-95 select-none cursor-pointer ${
                          currentCommand === 'maju'
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600 active:bg-emerald-500'
                        }`}
                        style={{ touchAction: 'none' }}
                      >
                        <ArrowUp className="w-7 h-7 sm:w-8 sm:h-8 pointer-events-none" />
                      </button>
                    </div>
                    
                    {/* Left, Stop, Right */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        onPointerDown={() => sendRobotCommand('kiri')}
                        onPointerUp={stopRobot}
                        onPointerLeave={stopRobot}
                        onPointerCancel={stopRobot}
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-150 active:scale-95 select-none cursor-pointer ${
                          currentCommand === 'kiri'
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600 active:bg-emerald-500'
                        }`}
                        style={{ touchAction: 'none' }}
                      >
                        <ArrowLeft className="w-7 h-7 sm:w-8 sm:h-8 pointer-events-none" />
                      </button>
                      
                      {/* Stop Button */}
                      <button
                        onPointerDown={stopRobot}
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95 select-none cursor-pointer ${
                          currentCommand === 'stop'
                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/50'
                            : 'bg-slate-600 text-slate-400 hover:bg-red-500/80 hover:text-white active:bg-red-500'
                        }`}
                        style={{ touchAction: 'none' }}
                      >
                        <Circle className="w-6 h-6 sm:w-8 sm:h-8 pointer-events-none" />
                      </button>
                      
                      <button
                        onPointerDown={() => sendRobotCommand('kanan')}
                        onPointerUp={stopRobot}
                        onPointerLeave={stopRobot}
                        onPointerCancel={stopRobot}
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-150 active:scale-95 select-none cursor-pointer ${
                          currentCommand === 'kanan'
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600 active:bg-emerald-500'
                        }`}
                        style={{ touchAction: 'none' }}
                      >
                        <ArrowRight className="w-7 h-7 sm:w-8 sm:h-8 pointer-events-none" />
                      </button>
                    </div>
                    
                    {/* Backward Button */}
                    <div className="flex justify-center mt-2 sm:mt-3">
                      <button
                        onPointerDown={() => sendRobotCommand('mundur')}
                        onPointerUp={stopRobot}
                        onPointerLeave={stopRobot}
                        onPointerCancel={stopRobot}
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-150 active:scale-95 select-none cursor-pointer ${
                          currentCommand === 'mundur'
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600 active:bg-emerald-500'
                        }`}
                        style={{ touchAction: 'none' }}
                      >
                        <ArrowDown className="w-7 h-7 sm:w-8 sm:h-8 pointer-events-none" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Command Label */}
                  <div className="mt-4 text-center">
                    <p className={`text-base sm:text-lg font-black uppercase tracking-wider ${
                      currentCommand === 'stop' ? 'text-slate-400' : 'text-emerald-400'
                    }`}>
                      {currentCommand === 'maju' ? 'FORWARD' : 
                       currentCommand === 'mundur' ? 'BACKWARD' :
                       currentCommand === 'kiri' ? 'LEFT' :
                       currentCommand === 'kanan' ? 'RIGHT' : 'STOPPED'}
                    </p>
                  </div>
                </div>

                {/* Servo Controls - Second on Mobile, Right on Desktop */}
                <div className="flex-1 flex flex-col items-center order-2 lg:order-3">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-4 h-4 text-cyan-400" />
                    <span className="text-[10px] sm:text-xs font-black text-cyan-400 uppercase tracking-widest">
                      Servo Cam
                    </span>
                  </div>
                  
                  {/* Horizontal Layout on Mobile, Vertical on Desktop */}
                  <div className="flex flex-row lg:flex-col items-center gap-3 sm:gap-4">
                    {/* Servo Up */}
                    <button
                      onPointerDown={() => sendServoCommand('up')}
                      onPointerUp={() => set(ref(database, 'robot_control/servoCommand'), 'stop')}
                      onPointerLeave={() => set(ref(database, 'robot_control/servoCommand'), 'stop')}
                      onPointerCancel={() => set(ref(database, 'robot_control/servoCommand'), 'stop')}
                      className="w-14 h-14 sm:w-20 sm:h-14 lg:w-24 lg:h-16 rounded-xl sm:rounded-2xl bg-slate-700 text-slate-300 hover:bg-cyan-600 hover:text-white flex items-center justify-center transition-all duration-150 active:scale-95 active:bg-cyan-500 select-none cursor-pointer"
                      style={{ touchAction: 'none' }}
                    >
                      <ChevronUp className="w-8 h-8 sm:w-10 sm:h-10 pointer-events-none" />
                    </button>
                    
                    {/* Angle Display */}
                    <div className="bg-slate-800 border border-slate-600 rounded-xl sm:rounded-2xl px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-center min-w-[80px] sm:min-w-[100px]">
                      <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase block">Angle</span>
                      <p className="text-2xl sm:text-3xl font-black text-cyan-400">{servoAngle}°</p>
                    </div>
                    
                    {/* Servo Down */}
                    <button
                      onPointerDown={() => sendServoCommand('down')}
                      onPointerUp={() => set(ref(database, 'robot_control/servoCommand'), 'stop')}
                      onPointerLeave={() => set(ref(database, 'robot_control/servoCommand'), 'stop')}
                      onPointerCancel={() => set(ref(database, 'robot_control/servoCommand'), 'stop')}
                      className="w-14 h-14 sm:w-20 sm:h-14 lg:w-24 lg:h-16 rounded-xl sm:rounded-2xl bg-slate-700 text-slate-300 hover:bg-cyan-600 hover:text-white flex items-center justify-center transition-all duration-150 active:scale-95 active:bg-cyan-500 select-none cursor-pointer"
                      style={{ touchAction: 'none' }}
                    >
                      <ChevronDown className="w-8 h-8 sm:w-10 sm:h-10 pointer-events-none" />
                    </button>
                  </div>
                  
                  {/* Quick Presets */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        setServoAngle(30);
                        set(ref(database, 'robot_control/servoAngle'), 30);
                      }}
                      className="px-3 py-2 rounded-lg bg-slate-700 text-slate-400 text-xs font-bold hover:bg-slate-600 active:bg-slate-500 transition-all"
                    >
                      30°
                    </button>
                    <button
                      onClick={() => {
                        setServoAngle(90);
                        set(ref(database, 'robot_control/servoAngle'), 90);
                      }}
                      className="px-3 py-2 rounded-lg bg-cyan-600 text-white text-xs font-bold hover:bg-cyan-500 active:bg-cyan-400 transition-all"
                    >
                      90°
                    </button>
                    <button
                      onClick={() => {
                        setServoAngle(150);
                        set(ref(database, 'robot_control/servoAngle'), 150);
                      }}
                      className="px-3 py-2 rounded-lg bg-slate-700 text-slate-400 text-xs font-bold hover:bg-slate-600 active:bg-slate-500 transition-all"
                    >
                      150°
                    </button>
                  </div>
                </div>

                {/* Status Display - Last on Mobile, Center on Desktop */}
                <div className="flex-1 flex flex-col items-center order-3 lg:order-2">
                  <div className="bg-slate-800/50 border border-slate-600 rounded-2xl sm:rounded-[32px] p-4 sm:p-6 w-full max-w-xs">
                    <div className="text-center mb-4 sm:mb-6">
                      <div className="inline-flex items-center gap-2 bg-slate-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
                        <span className={`w-2 h-2 rounded-full ${robotActive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                        <span className="text-[10px] sm:text-xs font-black text-slate-300 uppercase">
                          {robotActive ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                    
                    {/* 3D Robot Display */}
                    <div className="relative mx-auto w-32 sm:w-40 h-36 sm:h-44 mb-4 sm:mb-6">
                      <Suspense fallback={
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-10 h-10 border-4 border-slate-600 border-t-cyan-400 rounded-full animate-spin" />
                        </div>
                      }>
                        <Robot3D isActive={robotActive} />
                      </Suspense>
                    </div>
                    
                    {/* Status Info */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Servo</span>
                        <span className="font-bold text-slate-300">{servoAngle}°</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Firebase</span>
                        <span className={`font-bold ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                          {isConnected ? 'OK' : 'Error'}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Mode</span>
                        <span className="font-bold text-cyan-400">Cloud</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Bottom Info - Simplified on Mobile */}
              <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[10px] sm:text-xs text-slate-500">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Radio className="w-3 h-3 text-emerald-400" />
                  <span>Firebase</span>
                </div>
                <div className="w-px h-3 sm:h-4 bg-slate-700 hidden sm:block" />
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Activity className="w-3 h-3 text-cyan-400" />
                  <span>Real-time</span>
                </div>
                <div className="w-px h-3 sm:h-4 bg-slate-700 hidden sm:block" />
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Shield className="w-3 h-3 text-amber-400" />
                  <span>Secure</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-slate-200 px-6 py-3 rounded-full shadow-2xl flex items-center gap-8 lg:hidden z-50">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span className="text-[10px] font-black uppercase text-slate-500">
            {isConnected ? 'Node-01' : 'Offline'}
          </span>
        </div>
        <div className="w-px h-4 bg-slate-200" />
        <div className="flex items-center gap-2">
          <Radio className="w-3 h-3 text-indigo-600" />
          <span className="text-[10px] font-black uppercase text-slate-500">
            {isConnected ? 'Connected' : 'Syncing...'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default App;
