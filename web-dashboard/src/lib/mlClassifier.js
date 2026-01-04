/**
 * AANG AIR CONTROL SYSTEM
 * Machine Learning Air Quality Classifier
 * 
 * Memanggil API ML Backend yang menjalankan model AdaBoost
 * Model di-deploy ke Google Cloud Run
 * 
 * Model Features: [temperature, humidity, pm25, co2]
 * Model Output: 3 classes:
 *   0: TCI Comfort & IAQI Good
 *   1: TCI Most Comfort & IAQI Unhealthy
 *   2: TCI Not Comfort & IAQI Good
 */

// ================= ML API CONFIG =================
// Google Cloud Run API URL
const ML_API_URL = import.meta.env.VITE_ML_API_URL || 'https://aang-ml-api-877063605186.asia-southeast1.run.app';

// ================= ML CLASSIFIER =================
export const MLClassifier = {
  /**
   * Label untuk setiap kelas klasifikasi (sesuai model AdaBoost)
   */
  labels: {
    0: { 
      name: 'TCI Comfort & IAQI Good', 
      nameShort: 'Nyaman & Sehat',
      color: '#10b981', // emerald-500
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
      icon: '✅',
      description: 'Suhu ruangan nyaman dan kualitas udara baik. Kondisi ideal untuk beraktivitas.'
    },
    1: { 
      name: 'TCI Most Comfort & IAQI Unhealthy', 
      nameShort: 'Tidak Sehat',
      color: '#ef4444', // red-500
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      borderColor: 'border-red-200',
      icon: '🚨',
      description: 'Kualitas udara buruk! Segera aktifkan sistem filtrasi udara.'
    },
    2: { 
      name: 'TCI Not Comfort & IAQI Good', 
      nameShort: 'Tidak Nyaman namun masih Sehat',
      color: '#f59e0b', // amber-500
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      borderColor: 'border-amber-200',
      icon: '⚠️',
      description: 'Kualitas udara baik namun suhu tidak nyaman. Sesuaikan pengaturan AC untuk kenyamanan.'
    }
  },

  // Cache untuk hasil prediksi terakhir
  _lastPrediction: null,
  _lastInput: null,
  _isLoading: false,

  /**
   * Cek apakah API tersedia
   */
  checkAPI: async () => {
    try {
      const response = await fetch(`${ML_API_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      return data.status === 'healthy' && data.model_loaded;
    } catch (error) {
      console.warn('ML API not available:', error.message);
      return false;
    }
  },

  /**
   * Prediksi menggunakan ML API (async)
   * @param {number} temperature - Suhu dalam °C
   * @param {number} humidity - Kelembaban dalam %
   * @param {number} pm25 - PM2.5 dalam µg/m³
   * @param {number} gasLevel - CO2/Gas dalam ppm
   * @returns {Promise<Object>} Hasil klasifikasi
   */
  predictAsync: async (temperature, humidity, pm25, gasLevel) => {
    try {
      const response = await fetch(`${ML_API_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temperature: temperature,
          humidity: humidity,
          pm25: pm25,
          co2: gasLevel
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      // Map response ke format yang digunakan frontend
      const predictedClass = data.prediction;
      const label = MLClassifier.labels[predictedClass] || MLClassifier.labels[0];
      
      const result = {
        prediction: predictedClass,
        label: label,
        confidence: data.confidence,
        probabilities: {
          comfortGood: data.probabilities['TCI Comfort & IAQI Good'] || 0,
          comfortUnhealthy: data.probabilities['TCI Most Comfort & IAQI Unhealthy'] || 0,
          notComfortGood: data.probabilities['TCI Not Comfort & IAQI Good'] || 0
        },
        input: data.input,
        source: 'ml_api'
      };

      // Cache hasil
      MLClassifier._lastPrediction = result;
      MLClassifier._lastInput = { temperature, humidity, pm25, gasLevel };

      return result;

    } catch (error) {
      console.error('ML API prediction failed:', error);
      // Fallback ke prediksi lokal jika API gagal
      return MLClassifier.predictLocal(temperature, humidity, pm25, gasLevel);
    }
  },

  /**
   * Prediksi synchronous (menggunakan cache atau fallback lokal)
   * Ini untuk kompatibilitas dengan useMemo yang tidak support async
   */
  predict: (temperature, humidity, pm25, gasLevel) => {
    // Cek apakah input sama dengan cache
    const inputSame = MLClassifier._lastInput &&
      MLClassifier._lastInput.temperature === temperature &&
      MLClassifier._lastInput.humidity === humidity &&
      MLClassifier._lastInput.pm25 === pm25 &&
      MLClassifier._lastInput.gasLevel === gasLevel;

    // Return cache jika input sama
    if (inputSame && MLClassifier._lastPrediction) {
      return MLClassifier._lastPrediction;
    }

    // Trigger async prediction di background
    if (!MLClassifier._isLoading) {
      MLClassifier._isLoading = true;
      MLClassifier.predictAsync(temperature, humidity, pm25, gasLevel)
        .finally(() => {
          MLClassifier._isLoading = false;
        });
    }

    // Return prediksi lokal sementara menunggu API
    return MLClassifier.predictLocal(temperature, humidity, pm25, gasLevel);
  },

  /**
   * Prediksi lokal (fallback jika API tidak tersedia)
   * Menggunakan rule-based approximation
   */
  predictLocal: (temperature, humidity, pm25, gasLevel) => {
    // Normalize input
    const temp = Math.max(0, Math.min(50, temperature));
    const hum = Math.max(0, Math.min(100, humidity));
    const pm = Math.max(0, Math.min(500, pm25));
    const gas = Math.max(0, Math.min(2000, gasLevel));

    // Rule-based classification (approximation)
    // Thresholds berdasarkan data training
    const isAirHealthy = pm <= 35 && gas <= 606; // Sesuai threshold fuzzy
    const isTempComfort = temp >= 22 && temp <= 28;
    const isHumidityComfort = hum >= 40 && hum <= 70;
    const isThermalComfort = isTempComfort && isHumidityComfort;

    let predictedClass = 0;
    let probClass0 = 0.33, probClass1 = 0.33, probClass2 = 0.34;

    if (isAirHealthy) {
      if (isThermalComfort) {
        // Class 0: Comfort & Good
        predictedClass = 0;
        probClass0 = 0.75;
        probClass1 = 0.10;
        probClass2 = 0.15;
      } else {
        // Class 2: Not Comfort & Good
        predictedClass = 2;
        probClass0 = 0.15;
        probClass1 = 0.10;
        probClass2 = 0.75;
      }
    } else {
      // Class 1: Comfort/Most Comfort & Unhealthy
      predictedClass = 1;
      probClass0 = 0.10;
      probClass1 = 0.80;
      probClass2 = 0.10;
    }

    return {
      prediction: predictedClass,
      label: MLClassifier.labels[predictedClass],
      confidence: Math.max(probClass0, probClass1, probClass2),
      probabilities: {
        comfortGood: probClass0,
        comfortUnhealthy: probClass1,
        notComfortGood: probClass2
      },
      input: { temperature: temp, humidity: hum, pm25: pm, gasLevel: gas },
      source: 'local_fallback'
    };
  },

  /**
   * Mendapatkan rekomendasi aksi berdasarkan klasifikasi
   */
  getRecommendations: (prediction) => {
    const recommendations = {
      0: [ // TCI Comfort & IAQI Good
        'Kondisi ideal tercapai!',
        'Pertahankan pengaturan saat ini',
        'Sistem dalam mode hemat energi'
      ],
      1: [ // TCI Most Comfort & IAQI Unhealthy
        'PERINGATAN: Kualitas udara buruk!',
        'Segera aktifkan kipas exhaust',
        'Nyalakan ionizer untuk purifikasi',
        'Buka ventilasi jika memungkinkan'
      ],
      2: [ // TCI Not Comfort & IAQI Good
        'Udara sehat, sesuaikan suhu untuk kenyamanan',
        'Atur AC ke suhu yang lebih nyaman',
        'Cek pengaturan kelembaban ruangan'
      ]
    };

    return recommendations[prediction] || [];
  },

  /**
   * Format confidence sebagai persentase
   */
  formatConfidence: (confidence) => {
    return `${(confidence * 100).toFixed(1)}%`;
  },

  /**
   * Mendapatkan level confidence dalam bahasa
   */
  getConfidenceLevel: (confidence) => {
    if (confidence >= 0.8) return 'Sangat Yakin';
    if (confidence >= 0.6) return 'Cukup Yakin';
    if (confidence >= 0.4) return 'Mungkin';
    return 'Kurang Yakin';
  }
};

export default MLClassifier;
