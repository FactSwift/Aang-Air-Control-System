/**
 * AANG AIR CONTROL SYSTEM
 * Fuzzy Rules Base (Expert System)
 * 
 * Rule base untuk sistem kontrol kualitas udara
 * Berdasarkan kombinasi suhu, kelembaban, PM2.5, dan CO
 * 
 * Legend:
 * - t: Temperature (veryCold, cold, normal, hot, veryHot)
 * - h: Humidity (dry, normal, quiteWet, wet, veryWet)
 * - pm: PM2.5 Status (aman <= 35, bahaya > 35)
 * - co: CO Status (aman <= 606, bahaya > 606)
 * - ac: AC Output (cold, normal, hot)
 * - k: Kipas/Fan (ON/OFF)
 * - i: Ionizer (ON/OFF)
 * 
 * Updated: 2026-01-04
 */

export const rules = [
    // --- KELOMPOK 1: KUALITAS UDARA AMAN (PM <= 15, CO <= 9) ---
    { t: 'veryHot',  h: 'veryWet',  pm: 'aman', co: 'aman', ac: 'cold',   k: 'OFF', i: 'OFF' },
    { t: 'veryHot',  h: 'wet',      pm: 'aman', co: 'aman', ac: 'cold',   k: 'OFF', i: 'OFF' },
    { t: 'veryHot',  h: 'quiteWet', pm: 'aman', co: 'aman', ac: 'cold',   k: 'OFF', i: 'OFF' },
    { t: 'veryHot',  h: 'normal',   pm: 'aman', co: 'aman', ac: 'cold',   k: 'OFF', i: 'OFF' },
    { t: 'veryHot',  h: 'dry',      pm: 'aman', co: 'aman', ac: 'cold',   k: 'OFF', i: 'OFF' },
    { t: 'hot',      h: 'veryWet',  pm: 'aman', co: 'aman', ac: 'cold',   k: 'OFF', i: 'OFF' },
    { t: 'hot',      h: 'wet',      pm: 'aman', co: 'aman', ac: 'cold',   k: 'OFF', i: 'OFF' },
    { t: 'hot',      h: 'quiteWet', pm: 'aman', co: 'aman', ac: 'cold',   k: 'OFF', i: 'OFF' },
    { t: 'hot',      h: 'normal',   pm: 'aman', co: 'aman', ac: 'cold',   k: 'OFF', i: 'OFF' },
    { t: 'hot',      h: 'dry',      pm: 'aman', co: 'aman', ac: 'normal', k: 'OFF', i: 'OFF' },
    { t: 'normal',   h: 'veryWet',  pm: 'aman', co: 'aman', ac: 'cold',   k: 'OFF', i: 'OFF' },
    { t: 'normal',   h: 'wet',      pm: 'aman', co: 'aman', ac: 'cold',   k: 'OFF', i: 'OFF' },
    { t: 'normal',   h: 'quiteWet', pm: 'aman', co: 'aman', ac: 'cold',   k: 'OFF', i: 'OFF' },
    { t: 'normal',   h: 'normal',   pm: 'aman', co: 'aman', ac: 'normal', k: 'OFF', i: 'OFF' },
    { t: 'normal',   h: 'dry',      pm: 'aman', co: 'aman', ac: 'normal', k: 'OFF', i: 'OFF' },
    { t: 'cold',     h: 'veryWet',  pm: 'aman', co: 'aman', ac: 'normal', k: 'OFF', i: 'OFF' },
    { t: 'cold',     h: 'wet',      pm: 'aman', co: 'aman', ac: 'normal', k: 'OFF', i: 'OFF' },
    { t: 'cold',     h: 'quiteWet', pm: 'aman', co: 'aman', ac: 'normal', k: 'OFF', i: 'OFF' },
    { t: 'cold',     h: 'normal',   pm: 'aman', co: 'aman', ac: 'hot',    k: 'OFF', i: 'OFF' },
    { t: 'cold',     h: 'dry',      pm: 'aman', co: 'aman', ac: 'hot',    k: 'OFF', i: 'OFF' },
    { t: 'veryCold', h: 'veryWet',  pm: 'aman', co: 'aman', ac: 'normal', k: 'OFF', i: 'OFF' },
    { t: 'veryCold', h: 'wet',      pm: 'aman', co: 'aman', ac: 'hot',    k: 'OFF', i: 'OFF' },
    { t: 'veryCold', h: 'quiteWet', pm: 'aman', co: 'aman', ac: 'hot',    k: 'OFF', i: 'OFF' },
    { t: 'veryCold', h: 'normal',   pm: 'aman', co: 'aman', ac: 'hot',    k: 'OFF', i: 'OFF' },
    { t: 'veryCold', h: 'dry',      pm: 'aman', co: 'aman', ac: 'hot',    k: 'OFF', i: 'OFF' },

    // --- KELOMPOK 2: BAHAYA PM 2.5 (DEBU/ASAP TINGGI, PM > 15) ---
    { t: 'veryHot',  h: 'veryWet',  pm: 'bahaya', co: 'aman', ac: 'cold',   k: 'ON',  i: 'OFF' },
    { t: 'veryHot',  h: 'wet',      pm: 'bahaya', co: 'aman', ac: 'cold',   k: 'ON',  i: 'OFF' },
    { t: 'veryHot',  h: 'quiteWet', pm: 'bahaya', co: 'aman', ac: 'cold',   k: 'ON',  i: 'OFF' },
    { t: 'veryHot',  h: 'normal',   pm: 'bahaya', co: 'aman', ac: 'cold',   k: 'ON',  i: 'OFF' },
    { t: 'veryHot',  h: 'dry',      pm: 'bahaya', co: 'aman', ac: 'cold',   k: 'ON',  i: 'OFF' },
    { t: 'hot',      h: 'veryWet',  pm: 'bahaya', co: 'aman', ac: 'cold',   k: 'ON',  i: 'OFF' },
    { t: 'hot',      h: 'wet',      pm: 'bahaya', co: 'aman', ac: 'cold',   k: 'ON',  i: 'OFF' },
    { t: 'hot',      h: 'quiteWet', pm: 'bahaya', co: 'aman', ac: 'cold',   k: 'ON',  i: 'OFF' },
    { t: 'hot',      h: 'normal',   pm: 'bahaya', co: 'aman', ac: 'cold',   k: 'ON',  i: 'OFF' },
    { t: 'hot',      h: 'dry',      pm: 'bahaya', co: 'aman', ac: 'normal', k: 'ON',  i: 'OFF' },
    { t: 'normal',   h: 'veryWet',  pm: 'bahaya', co: 'aman', ac: 'cold',   k: 'ON',  i: 'OFF' },
    { t: 'normal',   h: 'wet',      pm: 'bahaya', co: 'aman', ac: 'cold',   k: 'ON',  i: 'OFF' },
    { t: 'normal',   h: 'quiteWet', pm: 'bahaya', co: 'aman', ac: 'cold',   k: 'ON',  i: 'OFF' },
    { t: 'normal',   h: 'normal',   pm: 'bahaya', co: 'aman', ac: 'normal', k: 'ON',  i: 'OFF' },
    { t: 'normal',   h: 'dry',      pm: 'bahaya', co: 'aman', ac: 'normal', k: 'ON',  i: 'OFF' },
    { t: 'cold',     h: 'veryWet',  pm: 'bahaya', co: 'aman', ac: 'normal', k: 'ON',  i: 'OFF' },
    { t: 'cold',     h: 'wet',      pm: 'bahaya', co: 'aman', ac: 'normal', k: 'ON',  i: 'OFF' },
    { t: 'cold',     h: 'quiteWet', pm: 'bahaya', co: 'aman', ac: 'normal', k: 'ON',  i: 'OFF' },
    { t: 'cold',     h: 'normal',   pm: 'bahaya', co: 'aman', ac: 'hot',    k: 'ON',  i: 'OFF' },
    { t: 'cold',     h: 'dry',      pm: 'bahaya', co: 'aman', ac: 'hot',    k: 'ON',  i: 'OFF' },
    { t: 'veryCold', h: 'veryWet',  pm: 'bahaya', co: 'aman', ac: 'normal', k: 'ON',  i: 'OFF' },
    { t: 'veryCold', h: 'wet',      pm: 'bahaya', co: 'aman', ac: 'hot',    k: 'ON',  i: 'OFF' },
    { t: 'veryCold', h: 'quiteWet', pm: 'bahaya', co: 'aman', ac: 'hot',    k: 'ON',  i: 'OFF' },
    { t: 'veryCold', h: 'normal',   pm: 'bahaya', co: 'aman', ac: 'hot',    k: 'ON',  i: 'OFF' },
    { t: 'veryCold', h: 'dry',      pm: 'bahaya', co: 'aman', ac: 'hot',    k: 'ON',  i: 'OFF' },

    // --- KELOMPOK 3: BAHAYA GAS CO (GAS BERACUN, CO > 9) ---
    { t: 'veryHot',  h: 'veryWet',  pm: 'aman', co: 'bahaya', ac: 'cold',   k: 'ON',  i: 'ON'  },
    { t: 'veryHot',  h: 'wet',      pm: 'aman', co: 'bahaya', ac: 'cold',   k: 'ON',  i: 'ON'  },
    { t: 'veryHot',  h: 'quiteWet', pm: 'aman', co: 'bahaya', ac: 'cold',   k: 'ON',  i: 'ON'  },
    { t: 'veryHot',  h: 'normal',   pm: 'aman', co: 'bahaya', ac: 'cold',   k: 'ON',  i: 'ON'  },
    { t: 'veryHot',  h: 'dry',      pm: 'aman', co: 'bahaya', ac: 'cold',   k: 'ON',  i: 'ON'  },
    { t: 'hot',      h: 'veryWet',  pm: 'aman', co: 'bahaya', ac: 'cold',   k: 'ON',  i: 'ON'  },
    { t: 'hot',      h: 'wet',      pm: 'aman', co: 'bahaya', ac: 'cold',   k: 'ON',  i: 'ON'  },
    { t: 'hot',      h: 'quiteWet', pm: 'aman', co: 'bahaya', ac: 'cold',   k: 'ON',  i: 'ON'  },
    { t: 'hot',      h: 'normal',   pm: 'aman', co: 'bahaya', ac: 'cold',   k: 'ON',  i: 'ON'  },
    { t: 'hot',      h: 'dry',      pm: 'aman', co: 'bahaya', ac: 'normal', k: 'ON',  i: 'ON'  },
    { t: 'normal',   h: 'veryWet',  pm: 'aman', co: 'bahaya', ac: 'cold',   k: 'ON',  i: 'ON'  },
    { t: 'normal',   h: 'wet',      pm: 'aman', co: 'bahaya', ac: 'cold',   k: 'ON',  i: 'ON'  },
    { t: 'normal',   h: 'quiteWet', pm: 'aman', co: 'bahaya', ac: 'cold',   k: 'ON',  i: 'ON'  },
    { t: 'normal',   h: 'normal',   pm: 'aman', co: 'bahaya', ac: 'normal', k: 'ON',  i: 'ON'  },
    { t: 'normal',   h: 'dry',      pm: 'aman', co: 'bahaya', ac: 'normal', k: 'ON',  i: 'ON'  },
    { t: 'cold',     h: 'veryWet',  pm: 'aman', co: 'bahaya', ac: 'normal', k: 'ON',  i: 'ON'  },
    { t: 'cold',     h: 'wet',      pm: 'aman', co: 'bahaya', ac: 'normal', k: 'ON',  i: 'ON'  },
    { t: 'cold',     h: 'quiteWet', pm: 'aman', co: 'bahaya', ac: 'normal', k: 'ON',  i: 'ON'  },
    { t: 'cold',     h: 'normal',   pm: 'aman', co: 'bahaya', ac: 'hot',    k: 'ON',  i: 'ON'  },
    { t: 'cold',     h: 'dry',      pm: 'aman', co: 'bahaya', ac: 'hot',    k: 'ON',  i: 'ON'  },
    { t: 'veryCold', h: 'veryWet',  pm: 'aman', co: 'bahaya', ac: 'normal', k: 'ON',  i: 'ON'  },
    { t: 'veryCold', h: 'wet',      pm: 'aman', co: 'bahaya', ac: 'hot',    k: 'ON',  i: 'ON'  },
    { t: 'veryCold', h: 'quiteWet', pm: 'aman', co: 'bahaya', ac: 'hot',    k: 'ON',  i: 'ON'  },
    { t: 'veryCold', h: 'normal',   pm: 'aman', co: 'bahaya', ac: 'hot',    k: 'ON',  i: 'ON'  },
    { t: 'veryCold', h: 'dry',      pm: 'aman', co: 'bahaya', ac: 'hot',    k: 'ON',  i: 'ON'  },

    // --- KELOMPOK 4: BAHAYA TOTAL (PM > 15 & CO > 9) ---
    { t: 'veryHot',  h: 'veryWet',  pm: 'bahaya', co: 'bahaya', ac: 'cold',   k: 'ON',  i: 'ON'  },
    { t: 'veryHot',  h: 'wet',      pm: 'bahaya', co: 'bahaya', ac: 'cold',   k: 'ON',  i: 'ON'  },
    { t: 'veryHot',  h: 'quiteWet', pm: 'bahaya', co: 'bahaya', ac: 'cold',   k: 'ON',  i: 'ON'  },
    { t: 'veryHot',  h: 'normal',   pm: 'bahaya', co: 'bahaya', ac: 'cold',   k: 'ON',  i: 'ON'  },
    { t: 'veryHot',  h: 'dry',      pm: 'bahaya', co: 'bahaya', ac: 'cold',   k: 'ON',  i: 'ON'  },
    { t: 'hot',      h: 'veryWet',  pm: 'bahaya', co: 'bahaya', ac: 'cold',   k: 'ON',  i: 'ON'  },
    { t: 'hot',      h: 'wet',      pm: 'bahaya', co: 'bahaya', ac: 'cold',   k: 'ON',  i: 'ON'  },
    { t: 'hot',      h: 'quiteWet', pm: 'bahaya', co: 'bahaya', ac: 'cold',   k: 'ON',  i: 'ON'  },
    { t: 'hot',      h: 'normal',   pm: 'bahaya', co: 'bahaya', ac: 'cold',   k: 'ON',  i: 'ON'  },
    { t: 'hot',      h: 'dry',      pm: 'bahaya', co: 'bahaya', ac: 'normal', k: 'ON',  i: 'ON'  },
    { t: 'normal',   h: 'veryWet',  pm: 'bahaya', co: 'bahaya', ac: 'cold',   k: 'ON',  i: 'ON'  },
    { t: 'normal',   h: 'wet',      pm: 'bahaya', co: 'bahaya', ac: 'cold',   k: 'ON',  i: 'ON'  },
    { t: 'normal',   h: 'quiteWet', pm: 'bahaya', co: 'bahaya', ac: 'cold',   k: 'ON',  i: 'ON'  },
    { t: 'normal',   h: 'normal',   pm: 'bahaya', co: 'bahaya', ac: 'normal', k: 'ON',  i: 'ON'  },
    { t: 'normal',   h: 'dry',      pm: 'bahaya', co: 'bahaya', ac: 'normal', k: 'ON',  i: 'ON'  },
    { t: 'cold',     h: 'veryWet',  pm: 'bahaya', co: 'bahaya', ac: 'normal', k: 'ON',  i: 'ON'  },
    { t: 'cold',     h: 'wet',      pm: 'bahaya', co: 'bahaya', ac: 'normal', k: 'ON',  i: 'ON'  },
    { t: 'cold',     h: 'quiteWet', pm: 'bahaya', co: 'bahaya', ac: 'normal', k: 'ON',  i: 'ON'  },
    { t: 'cold',     h: 'normal',   pm: 'bahaya', co: 'bahaya', ac: 'hot',    k: 'ON',  i: 'ON'  },
    { t: 'cold',     h: 'dry',      pm: 'bahaya', co: 'bahaya', ac: 'hot',    k: 'ON',  i: 'ON'  },
    { t: 'veryCold', h: 'veryWet',  pm: 'bahaya', co: 'bahaya', ac: 'normal', k: 'ON',  i: 'ON'  },
    { t: 'veryCold', h: 'wet',      pm: 'bahaya', co: 'bahaya', ac: 'hot',    k: 'ON',  i: 'ON'  },
    { t: 'veryCold', h: 'quiteWet', pm: 'bahaya', co: 'bahaya', ac: 'hot',    k: 'ON',  i: 'ON'  },
    { t: 'veryCold', h: 'normal',   pm: 'bahaya', co: 'bahaya', ac: 'hot',    k: 'ON',  i: 'ON'  },
    { t: 'veryCold', h: 'dry',      pm: 'bahaya', co: 'bahaya', ac: 'hot',    k: 'ON',  i: 'ON'  }
];

export default rules;
