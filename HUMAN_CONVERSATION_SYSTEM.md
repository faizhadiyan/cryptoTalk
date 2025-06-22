# Human-like Conversation System

## Overview

Sistem percakapan yang telah dimodifikasi untuk memberikan pengalaman yang lebih humanis dan natural dalam diskusi crypto antar AI characters. Sistem ini menghilangkan respons yang terlalu cepat dan robotik, menggantinya dengan pola percakapan yang lebih mirip manusia.

## Fitur Utama

### 1. **Delayed Responses (Respons Tertunda)**
- **User Messages**: Bot merespons dengan delay 1-3 menit (dapat dikonfigurasi)
- **Direct Mentions**: Respons dalam 30 detik - 2 menit
- **Random Scheduling**: Bot lain akan merespons secara acak dengan jeda 2-8 menit

### 2. **Smart Bot Selection (Pemilihan Bot Cerdas)**
- Tidak ada urutan tetap siapa yang merespons
- Pemilihan berdasarkan bobot karakter:
  - **ELON_MUSK**: 35% (paling aktif)
  - **DONALD_TRUMP**: 30% (sangat aktif)
  - **JEROME_POWELL**: 20% (terukur)
  - **WARREN_BUFFETT**: 15% (paling konservatif)

### 3. **Cooldown System (Sistem Jeda)**
- Setelah bot berbicara, ada cooldown 5 menit sebelum bisa berbicara lagi
- Mencegah bot yang sama mendominasi percakapan
- Memastikan distribusi yang adil antar karakter

### 4. **Typing Simulation (Simulasi Mengetik)**
- Indikator "typing..." sebelum mengirim pesan
- Durasi typing berdasarkan panjang pesan (50ms per karakter, max 5 detik)
- Memberikan kesan bot sedang "berpikir" dan mengetik

### 5. **Conversation Flow Management**
- Maksimal 3 respons terjadwal per user message
- Jeda 30 detik - 2 menit antar respons terjadwal
- Percakapan timeout setelah 15 menit tidak ada aktivitas

## Konfigurasi

### Environment Variables
```bash
# Untuk testing/development (respons lebih cepat)
NODE_ENV=development
FAST_MODE=true

# Untuk production (respons normal)
NODE_ENV=production
```

### File Konfigurasi
Lihat `src/config/conversationConfig.ts` untuk mengatur:
- Timing delays
- Character weights
- Typing simulation
- Conversation timeouts

## Cara Kerja

### 1. User Mengirim Pesan
```
User: "What do you think about Bitcoin's recent price movement?"
```

### 2. Bot Selection & Delay
- Sistem memilih bot secara random berdasarkan weight
- Misalnya ELON_MUSK terpilih (35% chance)
- Delay 1-3 menit sebelum merespons

### 3. Response dengan Typing
```
[Bot shows "typing..." for 3-5 seconds]
ELON_MUSK: "Bitcoin's volatility is fascinating! The recent dip might be a great buying opportunity for long-term holders..."
```

### 4. Scheduled Follow-ups
- Sistem menjadwalkan 1-3 bot lain untuk merespons
- JEROME_POWELL dijadwalkan respons dalam 4 menit
- WARREN_BUFFETT dijadwalkan respons dalam 7 menit

### 5. Natural Conversation Flow
```
[4 minutes later]
JEROME_POWELL: "From a monetary policy perspective, we need to consider the regulatory implications..."

[3 minutes later]  
WARREN_BUFFETT: "I remain cautious about crypto investments. The fundamentals are still unclear..."
```

## Direct Mentions

Ketika user mention bot secara langsung:
```
User: "@ELON_MUSK What's your take on Dogecoin?"
```

- Bot yang di-mention akan merespons dalam 30 detik - 2 menit
- Tidak memicu respons dari bot lain secara otomatis
- Sistem tetap bisa menjadwalkan respons follow-up dari bot lain

## Keunggulan Sistem Baru

### ✅ **Lebih Natural**
- Tidak ada respons instan yang terkesan robotik
- Jeda yang realistis seperti manusia berpikir
- Typing indicators untuk realisme

### ✅ **Distribusi Adil**
- Semua karakter mendapat kesempatan berbicara
- Tidak ada yang mendominasi percakapan
- Cooldown mencegah spam dari satu bot

### ✅ **Unpredictable**
- Tidak ada pola tetap siapa yang merespons
- Random selection berdasarkan personality
- Timing yang bervariasi

### ✅ **Contextual**
- Respons yang relevan dengan topik
- Mempertimbangkan history percakapan
- Prompt yang disesuaikan dengan flow

## Monitoring & Debugging

### Logs
Sistem akan menampilkan log untuk:
- Bot selection dan scheduling
- Response delays dan timing
- Conversation state changes
- Error handling

### Development Mode
Untuk testing, gunakan:
```bash
NODE_ENV=development npm start
```
Ini akan menggunakan timing yang lebih cepat (10-30 detik) untuk testing.

## Troubleshooting

### Bot Tidak Merespons
1. Cek apakah bot dalam cooldown period
2. Periksa conversation timeout (15 menit)
3. Lihat logs untuk error messages

### Respons Terlalu Cepat/Lambat
1. Sesuaikan konfigurasi di `conversationConfig.ts`
2. Gunakan environment variables untuk mode development
3. Restart aplikasi setelah perubahan config

### Bot Tertentu Tidak Pernah Bicara
1. Cek character weights di konfigurasi
2. Pastikan bot terdaftar di HumanConversationManager
3. Periksa cooldown status

## Future Enhancements

- **Mood System**: Bot bisa memiliki "mood" yang mempengaruhi response rate
- **Topic Expertise**: Bot lebih aktif pada topik keahliannya
- **Time-based Behavior**: Aktivitas berbeda berdasarkan waktu
- **Conversation Memory**: Mengingat konteks percakapan yang lebih panjang