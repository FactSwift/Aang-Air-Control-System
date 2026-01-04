/**
 * AANG AIR CONTROL SYSTEM
 * Mamdani Fuzzy Logic Engine dengan Rule Base Expert System
 * 
 * Sistem ini menggunakan:
 * 1. Fuzzifikasi dengan Triangular Membership Function
 * 2. Inferensi Mamdani (MIN-MAX)
 * 3. Defuzzifikasi Centroid
 * 4. Rule Base Expert System
 * 
 * Input:
 * - Temperature (°C)
 * - Humidity (%)
 * - PM2.5 (µg/m³) - Threshold: <= 35 aman, > 35 bahaya
 * - CO₂ (ppm) - Threshold: <= 606 aman, > 606 bahaya
 * 
 * Output:
 * - AC Temperature: 18-30°C (Integer)
 * - Fan: ON/OFF
 * - Ionizer: ON/OFF
 * 
 * Updated: 2025-01-04
 */

import { rules } from './fuzzyRules.js';

// ================= MEMBERSHIP FUNCTIONS =================

/**
 * Fungsi Keanggotaan Segitiga (Triangular Membership Function)
 * @param {number} x - Nilai input
 * @param {number} a - Titik kiri (membership = 0)
 * @param {number} b - Titik tengah (membership = 1)
 * @param {number} c - Titik kanan (membership = 0)
 * @returns {number} Nilai membership (0-1)
 */
const trimf = (x, a, b, c) => {
  if (x <= a || x >= c) return 0;
  if (x === b) return 1;
  if (x > a && x < b) return (x - a) / (b - a);
  if (x > b && x < c) return (c - x) / (c - b);
  return 0;
};

// ================= MAMDANI FUZZY ENGINE =================

/**
 * Kalkulasi Mamdani Fuzzy Logic dengan Rule Base
 * @param {Object} input - Data sensor {temp, humid, pm25, co}
 * @returns {Object} Hasil inferensi {suhu_ac, fan, ionizer}
 */
export function calculateMamdani(input) {
  const { temp, humid, pm25, co } = input;

  // 1. FUZZIFIKASI INPUT (Berdasarkan Tabel III)
  // Fuzzy Set untuk Temperature
  const fsT = {
    veryCold: trimf(temp, 0, 19, 22),
    cold: trimf(temp, 20, 22.5, 25),
    normal: trimf(temp, 24, 25.5, 27),
    hot: trimf(temp, 26, 28.5, 31),
    veryHot: trimf(temp, 29, 32, 50)
  };

  // Fuzzy Set untuk Humidity
  const fsH = {
    dry: trimf(humid, 1, 52, 57),
    normal: trimf(humid, 55, 60, 65),
    quiteWet: trimf(humid, 63, 69, 75),
    wet: trimf(humid, 73, 79, 85),
    veryWet: trimf(humid, 83, 95, 100)
  };

  // Crisp Status untuk PM2.5 dan CO (Threshold-based)
  const pmStatus = pm25 <= 35 ? 'aman' : 'bahaya';
  const coStatus = co <= 606 ? 'aman' : 'bahaya';

  // 2. INFERENSI MAMDANI (MIN-MAX)
  let activeCold = 0, activeNormal = 0, activeHot = 0;
  let fanOn = false, ionOn = false;

  rules.forEach(r => {
    // Filter rules berdasarkan PM dan CO status
    if (pmStatus === r.pm && coStatus === r.co) {
      // Hitung firing strength (MIN operator)
      const strength = Math.min(fsT[r.t] || 0, fsH[r.h] || 0);
      
      if (strength > 0) {
        // Agregasi output AC (MAX operator)
        if (r.ac === 'cold') activeCold = Math.max(activeCold, strength);
        if (r.ac === 'normal') activeNormal = Math.max(activeNormal, strength);
        if (r.ac === 'hot') activeHot = Math.max(activeHot, strength);
        
        // Fan dan Ionizer menggunakan OR logic
        if (r.k === 'ON') fanOn = true;
        if (r.i === 'ON') ionOn = true;
      }
    }
  });

  // 3. DEFUZZIFIKASI CENTROID (Sampling Rentang 18-30)
  let numerator = 0;
  let denominator = 0;

  // Iterasi dengan step 0.1 untuk akurasi
  for (let x = 18; x <= 30; x += 0.1) {
    // Membership functions untuk output AC
    const muCold = Math.min(activeCold, trimf(x, 18, 21, 25));
    const muNormal = Math.min(activeNormal, trimf(x, 24, 25.5, 27));
    const muHot = Math.min(activeHot, trimf(x, 26, 28, 30));

    // Agregasi total (MAX)
    const muTotal = Math.max(muCold, muNormal, muHot);
    
    numerator += x * muTotal;
    denominator += muTotal;
  }

  // Pembulatan hasil akhir ke Integer
  const finalAC = denominator === 0 ? 24 : Math.round(numerator / denominator);

  return {
    suhu_ac: finalAC,
    fan: fanOn,
    ionizer: ionOn,
    output: {
      suhu_ac: finalAC + "°C",
      fan: fanOn ? "ON" : "OFF",
      ionizer: ionOn ? "ON" : "OFF"
    },
    // Debug info
    debug: {
      fuzzyTemp: fsT,
      fuzzyHumid: fsH,
      pmStatus,
      coStatus,
      activeCold,
      activeNormal,
      activeHot
    }
  };
}

// ================= FUZZY ENGINE WRAPPER (Backward Compatible) =================

export const FuzzyEngine = {
  /**
   * Fungsi keanggotaan segitiga
   */
  trimf,

  /**
   * Fuzzifikasi nilai suhu dan kelembaban
   * @param {number} temp - Suhu dalam °C
   * @param {number} hum - Kelembaban dalam %
   * @returns {Object} Nilai membership untuk setiap kategori
   */
  getFuzzyValues: (temp, hum) => {
    return {
      temp: {
        veryCold: trimf(temp, 0, 19, 22),
        cold: trimf(temp, 20, 22.5, 25),
        normal: trimf(temp, 24, 25.5, 27),
        hot: trimf(temp, 26, 28.5, 31),
        veryHot: trimf(temp, 29, 32, 50)
      },
      hum: {
        dry: trimf(hum, 1, 52, 57),
        normal: trimf(hum, 55, 60, 65),
        quiteWet: trimf(hum, 63, 69, 75),
        wet: trimf(hum, 73, 79, 85),
        veryWet: trimf(hum, 83, 95, 100)
      }
    };
  },

  /**
   * Kalkulasi lengkap menggunakan Mamdani Fuzzy Logic
   * @param {number} temp - Suhu ruangan dalam °C
   * @param {number} hum - Kelembaban dalam %
   * @param {number} pm25 - PM2.5 dalam µg/m³
   * @param {number} co - CO dalam ppm
   * @returns {Object} Hasil inferensi lengkap
   */
  calculateAC: (temp, hum, pm25 = 0, co = 0) => {
    const result = calculateMamdani({ temp, humid: hum, pm25, co });
    return result.suhu_ac;
  },

  /**
   * Evaluasi kualitas udara untuk status display
   * @param {number} pm - Nilai PM2.5 dalam µg/m³
   * @param {number} co - Nilai CO₂ dalam ppm
   * @returns {Object} Status dan message kualitas udara
   */
  checkAirQuality: (pm, co) => {
    const pmBahaya = pm > 35;
    const coBahaya = co > 606;

    let statusType = 'good';
    let message = 'Kualitas Udara Baik - Sistem Standby';

    if (coBahaya && pmBahaya) {
      statusType = 'danger';
      message = 'BAHAYA! PM2.5 & CO₂ Tinggi - Aktifkan Kipas & Ionizer';
    } else if (coBahaya) {
      statusType = 'danger';
      message = 'CO₂ Tinggi - Aktifkan Kipas & Ionizer';
    } else if (pmBahaya) {
      statusType = 'warning';
      message = 'PM2.5 Tinggi - Aktifkan Kipas';
    }

    // Determine fan and ionizer state based on air quality
    const shouldFan = pmBahaya || coBahaya;
    const shouldIonizer = coBahaya;

    return {
      status: statusType,
      message: message,
      pmStatus: pmBahaya ? 'bahaya' : 'aman',
      coStatus: coBahaya ? 'bahaya' : 'aman',
      // Backward compatibility properties
      fan: shouldFan,
      ionizer_active: shouldIonizer,
      kipas: shouldFan ? "on" : "off",
      ionizer: shouldIonizer ? "on" : "off"
    };
  },

  /**
   * Evaluasi lengkap sistem menggunakan Mamdani Fuzzy Logic
   * @param {Object} sensors - Data sensor {temperature, humidity, pm25, gasLevel}
   * @returns {Object} Rekomendasi kontrol perangkat
   */
  evaluate: (sensors) => {
    const { temperature, humidity, pm25, gasLevel } = sensors;

    // Kalkulasi menggunakan Mamdani Fuzzy Logic dengan Rule Base
    const mamdaniResult = calculateMamdani({
      temp: temperature,
      humid: humidity,
      pm25: pm25,
      co: gasLevel
    });

    // Evaluasi status kualitas udara
    const airQuality = FuzzyEngine.checkAirQuality(pm25, gasLevel);

    // Fuzzy membership values untuk display
    const fuzzyValues = FuzzyEngine.getFuzzyValues(temperature, humidity);

    return {
      // Output utama dari Mamdani
      acTemperature: mamdaniResult.suhu_ac,
      fan: mamdaniResult.fan,
      ionizer: mamdaniResult.ionizer,
      
      // Backward compatibility
      kipas: mamdaniResult.fan ? "on" : "off",
      ionizerStatus: mamdaniResult.ionizer ? "on" : "off",
      
      // Status kualitas udara
      airQualityStatus: airQuality.status,
      airQualityMessage: airQuality.message,
      
      // Debug dan display info
      fuzzyMembership: fuzzyValues,
      mamdaniDebug: mamdaniResult.debug,
      
      // Recommendations
      recommendation: {
        acAction: temperature > 27 ? 'lower' : temperature < 22 ? 'raise' : 'maintain',
        ventilation: mamdaniResult.fan ? 'activate' : 'standby',
        purification: mamdaniResult.ionizer ? 'activate' : 'standby'
      }
    };
  },

  /**
   * Fungsi untuk menjalankan dan menampilkan hasil sistem (untuk debugging)
   * @param {number} t - Suhu
   * @param {number} h - Kelembaban
   * @param {number} pm - PM2.5
   * @param {number} co - CO/Gas Level
   */
  runSmartSystem: (t, h, pm, co) => {
    const result = calculateMamdani({ temp: t, humid: h, pm25: pm, co: co });
    const airStatus = FuzzyEngine.checkAirQuality(pm, co);

    console.log(`=== INPUT SENSOR ===`);
    console.log(`Suhu: ${t}°C | Hum: ${h}% | PM2.5: ${pm} | CO: ${co}`);
    console.log(`=== FUZZIFIKASI ===`);
    console.log(`PM Status: ${result.debug.pmStatus} | CO Status: ${result.debug.coStatus}`);
    console.log(`Active Cold: ${result.debug.activeCold.toFixed(3)}`);
    console.log(`Active Normal: ${result.debug.activeNormal.toFixed(3)}`);
    console.log(`Active Hot: ${result.debug.activeHot.toFixed(3)}`);
    console.log(`=== KEPUTUSAN SISTEM (Mamdani) ===`);
    console.log(`SET AC       : ${result.suhu_ac}°C (Range: 18-30)`);
    console.log(`STATUS KIPAS : ${result.fan ? 'ON' : 'OFF'}`);
    console.log(`IONIZER      : ${result.ionizer ? 'ON' : 'OFF'}`);
    console.log(`AIR STATUS   : ${airStatus.message}`);
    console.log(`========================\n`);

    return result;
  }
};

// ================= AIR QUALITY INDEX CALCULATOR =================
export const AirQualityIndex = {
  /**
   * Kalkulasi AQI berdasarkan PM2.5
   * @param {number} pm25 - Nilai PM2.5 dalam µg/m³
   * @returns {Object} AQI value dan kategori
   */
  calculateFromPM25: (pm25) => {
    let aqi, category, color;

    if (pm25 <= 12) {
      aqi = (50 / 12) * pm25;
      category = 'Baik';
      color = '#10b981'; // emerald
    } else if (pm25 <= 35.4) {
      aqi = ((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1) + 51;
      category = 'Sedang';
      color = '#f59e0b'; // amber
    } else if (pm25 <= 55.4) {
      aqi = ((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5) + 101;
      category = 'Tidak Sehat untuk Sensitif';
      color = '#f97316'; // orange
    } else if (pm25 <= 150.4) {
      aqi = ((200 - 151) / (150.4 - 55.5)) * (pm25 - 55.5) + 151;
      category = 'Tidak Sehat';
      color = '#ef4444'; // red
    } else if (pm25 <= 250.4) {
      aqi = ((300 - 201) / (250.4 - 150.5)) * (pm25 - 150.5) + 201;
      category = 'Sangat Tidak Sehat';
      color = '#7c3aed'; // violet
    } else {
      aqi = ((500 - 301) / (500.4 - 250.5)) * (pm25 - 250.5) + 301;
      category = 'Berbahaya';
      color = '#991b1b'; // dark red
    }

    return {
      value: Math.round(aqi),
      category,
      color,
      pm25
    };
  },

  /**
   * Kalkulasi kategori gas/CO level
   * @param {number} gasLevel - Nilai gas/CO dalam ppm
   * @returns {Object} Kategori dan warna
   */
  calculateGasCategory: (gasLevel) => {
    if (gasLevel <= 9) {
      return { category: 'Normal', color: '#10b981', status: 'good' };
    } else if (gasLevel <= 15) {
      return { category: 'Sedang', color: '#f59e0b', status: 'moderate' };
    } else if (gasLevel <= 25) {
      return { category: 'Tinggi', color: '#f97316', status: 'warning' };
    } else {
      return { category: 'Berbahaya', color: '#ef4444', status: 'danger' };
    }
  }
};

export default FuzzyEngine;
