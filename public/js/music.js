/**
 * Retro 8-bit Chiptune Music Engine for Codemons
 * Authentic Classic Game Boy Style Audio Synthesis (Pulse 1, Pulse 2, Wave Bass, Noise Drums)
 * Mirai-Game / Gamify Platform
 */

(function () {
  'use strict';

  // Musical Note Frequencies (12-TET, C2 to B6) + Flat Aliases (Db, Eb, Gb, Ab, Bb)
  const N = {
    '-': 0, // Rest
    'C2': 65.41, 'C#2': 69.30, 'Db2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'Eb2': 77.78, 'E2': 82.41, 'F2': 87.31, 'F#2': 92.50, 'Gb2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'Ab2': 103.83, 'A2': 110.00, 'A#2': 116.54, 'Bb2': 116.54, 'B2': 123.47,
    'C3': 130.81, 'C#3': 138.59, 'Db3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'Eb3': 155.56, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'Gb3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'Ab3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'Bb3': 233.08, 'B3': 246.94,
    'C4': 261.63, 'C#4': 277.18, 'Db4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'Eb4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'Gb4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'Ab4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'Bb4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'C#5': 554.37, 'Db5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'Eb5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'Gb5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'Ab5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'Bb5': 932.33, 'B5': 987.77,
    'C6': 1046.50, 'C#6': 1108.73, 'Db6': 1108.73, 'D6': 1174.66, 'D#6': 1244.51, 'Eb6': 1244.51, 'E6': 1318.51, 'F6': 1396.91, 'F#6': 1479.98, 'Gb6': 1479.98, 'G6': 1567.98, 'G#6': 1661.22, 'Ab6': 1661.22, 'A6': 1760.00, 'A#6': 1864.66, 'Bb6': 1864.66, 'B6': 1975.53
  };

  // Drum definitions for Channel 4 (Noise): K = Kick, S = Snare, H = Hi-Hat, C = Crash
  const D_KICK = 1;
  const D_SNARE = 2;
  const D_HAT = 3;
  const D_CRASH = 4;

  // ---------------------------------------------------------------------------
  // TRACK DEFINITIONS (POKEMON CLASSIC STYLE CHIPTUNE COMPOSITIONS)
  // ---------------------------------------------------------------------------

  /**
   * BATTLE THEME: Classic Game Boy Pokemon Battle Track
   * Energetic 144 BPM in D Minor / F Major with driving walking bass and syncopated melodies
   */
  const TRACK_BATTLE = {
    name: 'battle',
    bpm: 144,
    stepsPerBeat: 4, // 16th notes
    loopStartStep: 32, // Loop back to start of main battle theme after intro fanfare
    // Channel 1: Pulse Lead (Square wave melody)
    lead: [
      // --- INTRO FANFARE (Bars 1-2: 32 steps) ---
      'D5', '-', 'D5', '-', 'F5', '-', 'A5', '-', 'D6', 'D6', 'C6', '-', 'A5', '-', 'F5', '-',
      'G5', '-', 'G#5', '-', 'A5', 'A5', 'C6', '-', 'D6', 'D6', 'E6', '-', 'F6', 'E6', 'D6', 'C#6',

      // --- MAIN THEME A (Bars 3-6: 64 steps) ---
      'D5', '-', 'D5', 'E5', 'F5', '-', 'G5', '-', 'A5', '-', 'F5', '-', 'D5', '-', 'C5', '-',
      'D5', '-', 'F5', '-', 'A5', '-', 'D6', '-', 'C6', '-', 'A5', '-', 'G5', 'F5', 'G5', 'A5',
      'Bb5', '-', 'Bb5', 'A5', 'G5', '-', 'F5', '-', 'G5', '-', 'A5', '-', 'F5', '-', 'D5', '-',
      'E5', '-', 'F5', '-', 'G5', '-', 'A5', '-', 'C#6', '-', 'E6', '-', 'D6', '-', '-', '-',

      // --- MAIN THEME B: Heroic High Octave (Bars 7-10: 64 steps) ---
      'D6', '-', 'A5', '-', 'F6', '-', 'E6', '-', 'D6', 'C6', 'A5', '-', 'G5', '-', 'A5', '-',
      'Bb5', '-', 'D6', '-', 'C6', '-', 'A5', '-', 'G5', 'F5', 'E5', '-', 'D5', '-', 'E5', 'F5',
      'G5', '-', 'Bb5', '-', 'A5', '-', 'F5', '-', 'G5', 'A5', 'Bb5', 'C6', 'D6', '-', 'F6', '-',
      'E6', '-', 'C#6', '-', 'A5', '-', 'E5', '-', 'D5', '-', 'D5', 'D5', 'D5', '-', '-', '-',

      // --- TENSION BRIDGE (Bars 11-14: 64 steps) ---
      'F5', 'F5', 'A5', 'F5', 'G5', 'G5', 'Bb5', 'G5', 'A5', 'A5', 'C6', 'A5', 'Bb5', 'Bb5', 'D6', 'Bb5',
      'C6', 'C6', 'E6', 'C6', 'D6', '-', 'A5', '-', 'F6', 'E6', 'D6', 'C6', 'Bb5', 'A5', 'G5', 'F5',
      'E5', '-', 'G5', '-', 'Bb5', '-', 'D6', '-', 'C#6', '-', 'E6', '-', 'A5', '-', 'G5', '-',
      'F5', '-', 'D5', '-', 'E5', '-', 'C#5', '-', 'D5', 'E5', 'F5', 'G5', 'A5', 'Bb5', 'C6', 'C#6',

      // --- TRIUMPHANT CLIMAX & CADENCE (Bars 15-16: 32 steps) ---
      'D6', '-', 'F6', '-', 'E6', '-', 'D6', '-', 'A5', '-', 'D6', '-', 'C6', '-', 'A5', '-',
      'Bb5', 'A5', 'G5', 'F5', 'E5', 'D5', 'C#5', 'E5', 'D5', '-', 'D5', '-', 'D5', '-', '-', '-'
    ],

    // Channel 2: Pulse Harmony / Counter-Melody
    harmony: [
      // Intro
      'A4', '-', 'A4', '-', 'D5', '-', 'F5', '-', 'F#5', 'F#5', 'E5', '-', 'D5', '-', 'A4', '-',
      'E5', '-', 'F5', '-', 'F#5', 'F#5', 'A5', '-', 'Bb5', 'Bb5', 'C#6', '-', 'D6', 'C#6', 'A5', 'G5',

      // Main Theme A
      'A4', '-', 'A4', 'C5', 'D5', '-', 'E5', '-', 'F5', '-', 'D5', '-', 'A4', '-', 'G4', '-',
      'A4', '-', 'D5', '-', 'F5', '-', 'F#5', '-', 'E5', '-', 'D5', '-', 'E5', 'D5', 'E5', 'F5',
      'G5', '-', 'G5', 'F5', 'E5', '-', 'D5', '-', 'E5', '-', 'F5', '-', 'D5', '-', 'Bb4', '-',
      'C#5', '-', 'D5', '-', 'E5', '-', 'F#5', '-', 'G5', '-', 'A5', '-', 'F#5', '-', '-', '-',

      // Main Theme B
      'F5', '-', 'F5', '-', 'D6', '-', 'C6', '-', 'A5', 'G5', 'F5', '-', 'E5', '-', 'F5', '-',
      'G5', '-', 'Bb5', '-', 'A5', '-', 'F5', '-', 'E5', 'D5', 'C#5', '-', 'A4', '-', 'C5', 'D5',
      'E5', '-', 'G5', '-', 'F5', '-', 'D5', '-', 'E5', 'F5', 'G5', 'A5', 'Bb5', '-', 'D6', '-',
      'C#6', '-', 'A5', '-', 'F5', '-', 'C#5', '-', 'A4', '-', 'A4', 'A4', 'A4', '-', '-', '-',

      // Tension Bridge
      'D5', 'D5', 'F5', 'D5', 'E5', 'E5', 'G5', 'E5', 'F5', 'F5', 'A5', 'F5', 'G5', 'G5', 'Bb5', 'G5',
      'A5', 'A5', 'C6', 'A5', 'Bb5', '-', 'F5', '-', 'D6', 'C6', 'Bb5', 'A5', 'G5', 'F5', 'E5', 'D5',
      'C#5', '-', 'E5', '-', 'G5', '-', 'Bb5', '-', 'A5', '-', 'C#6', '-', 'F5', '-', 'E5', '-',
      'D5', '-', 'Bb4', '-', 'C#5', '-', 'A4', '-', 'Bb4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'A4',

      // Climax
      'F5', '-', 'D6', '-', 'C#6', '-', 'A5', '-', 'F5', '-', 'Bb5', '-', 'A5', '-', 'F5', '-',
      'G5', 'F5', 'E5', 'D5', 'C#5', 'Bb4', 'A4', 'C#5', 'A4', '-', 'A4', '-', 'A4', '-', '-', '-'
    ],

    // Channel 3: Wave Bass (Triangle/Wave walking driving bass)
    bass: [
      // Intro
      'D3', 'D3', 'D3', 'D3', 'D3', 'D3', 'D3', 'D3', 'D3', 'D3', 'C3', 'C3', 'B2', 'B2', 'Bb2', 'Bb2',
      'A2', 'A2', 'A2', 'A2', 'A2', 'A2', 'A2', 'A2', 'A2', 'A2', 'B2', 'B2', 'C#3', 'C#3', 'A2', 'A2',

      // Main Theme A (Bouncing Root-Octave 16ths)
      'D3', 'D4', 'D3', 'D4', 'D3', 'D4', 'D3', 'D4', 'D3', 'D4', 'D3', 'D4', 'C3', 'C4', 'C3', 'C4',
      'Bb2', 'Bb3', 'Bb2', 'Bb3', 'Bb2', 'Bb3', 'Bb2', 'Bb3', 'C3', 'C4', 'C3', 'C4', 'C#3', 'C#4', 'C#3', 'C#4',
      'D3', 'D4', 'D3', 'D4', 'D3', 'D4', 'D3', 'D4', 'G2', 'G3', 'G2', 'G3', 'G2', 'G3', 'G2', 'G3',
      'A2', 'A3', 'A2', 'A3', 'A2', 'A3', 'A2', 'A3', 'A2', 'A3', 'A2', 'A3', 'D3', 'D4', 'C3', 'C#3',

      // Main Theme B
      'D3', 'D4', 'D3', 'D4', 'D3', 'D4', 'D3', 'D4', 'F3', 'F4', 'F3', 'F4', 'F3', 'F4', 'F3', 'F4',
      'G3', 'G4', 'G3', 'G4', 'G3', 'G4', 'G3', 'G4', 'A2', 'A3', 'A2', 'A3', 'A2', 'A3', 'A2', 'A3',
      'Bb2', 'Bb3', 'Bb2', 'Bb3', 'Bb2', 'Bb3', 'Bb2', 'Bb3', 'C3', 'C4', 'C3', 'C4', 'D3', 'D4', 'D3', 'D4',
      'A2', 'A3', 'A2', 'A3', 'A2', 'A3', 'A2', 'A3', 'D3', 'A2', 'D3', 'A2', 'D3', 'D4', 'C3', 'C#3',

      // Tension Bridge
      'D3', 'D3', 'F3', 'F3', 'G3', 'G3', 'Bb3', 'Bb3', 'A3', 'A3', 'C4', 'C4', 'Bb3', 'Bb3', 'D4', 'D4',
      'C4', 'C4', 'E4', 'E4', 'D4', 'D4', 'C4', 'C4', 'Bb3', 'Bb3', 'A3', 'A3', 'G3', 'G3', 'F3', 'F3',
      'E3', 'E4', 'E3', 'E4', 'E3', 'E4', 'E3', 'E4', 'A2', 'A3', 'A2', 'A3', 'A2', 'A3', 'A2', 'A3',
      'Bb2', 'Bb3', 'Bb2', 'Bb3', 'A2', 'A3', 'A2', 'A3', 'D3', 'D3', 'E3', 'E3', 'F3', 'F3', 'G3', 'G3',

      // Climax
      'D3', 'D4', 'D3', 'D4', 'D3', 'D4', 'D3', 'D4', 'Bb2', 'Bb3', 'Bb2', 'Bb3', 'F3', 'F4', 'F3', 'F4',
      'G2', 'G3', 'A2', 'A3', 'Bb2', 'Bb3', 'C3', 'C4', 'D3', 'D3', 'A2', 'A2', 'D3', '-', '-', '-'
    ],

    // Channel 4: Noise Drums (Game Boy style drum groove)
    drums: [
      // Intro drum roll
      D_CRASH, D_HAT, D_HAT, D_HAT, D_KICK, D_HAT, D_SNARE, D_HAT, D_KICK, D_HAT, D_SNARE, D_SNARE, D_SNARE, D_SNARE, D_SNARE, D_SNARE,
      D_KICK, D_SNARE, D_KICK, D_SNARE, D_KICK, D_SNARE, D_KICK, D_SNARE, D_SNARE, D_SNARE, D_SNARE, D_SNARE, D_CRASH, D_SNARE, D_SNARE, D_HAT,

      // Main Theme A groove (repeated 4 bars x 4 = 64)
      D_KICK, D_HAT, D_HAT, D_HAT, D_SNARE, D_HAT, D_HAT, D_HAT, D_KICK, D_HAT, D_KICK, D_HAT, D_SNARE, D_HAT, D_HAT, D_HAT,
      D_KICK, D_HAT, D_HAT, D_HAT, D_SNARE, D_HAT, D_HAT, D_HAT, D_KICK, D_HAT, D_KICK, D_HAT, D_SNARE, D_HAT, D_SNARE, D_HAT,
      D_KICK, D_HAT, D_HAT, D_HAT, D_SNARE, D_HAT, D_HAT, D_HAT, D_KICK, D_HAT, D_KICK, D_HAT, D_SNARE, D_HAT, D_HAT, D_HAT,
      D_KICK, D_HAT, D_HAT, D_HAT, D_SNARE, D_HAT, D_KICK, D_HAT, D_SNARE, D_SNARE, D_SNARE, D_SNARE, D_CRASH, D_SNARE, D_HAT, D_HAT,

      // Main Theme B groove
      D_KICK, D_HAT, D_HAT, D_HAT, D_SNARE, D_HAT, D_HAT, D_HAT, D_KICK, D_HAT, D_KICK, D_HAT, D_SNARE, D_HAT, D_HAT, D_HAT,
      D_KICK, D_HAT, D_HAT, D_HAT, D_SNARE, D_HAT, D_HAT, D_HAT, D_KICK, D_HAT, D_KICK, D_HAT, D_SNARE, D_HAT, D_SNARE, D_HAT,
      D_KICK, D_HAT, D_HAT, D_HAT, D_SNARE, D_HAT, D_HAT, D_HAT, D_KICK, D_HAT, D_KICK, D_HAT, D_SNARE, D_HAT, D_HAT, D_HAT,
      D_KICK, D_HAT, D_HAT, D_HAT, D_SNARE, D_HAT, D_KICK, D_HAT, D_SNARE, D_SNARE, D_SNARE, D_SNARE, D_CRASH, D_SNARE, D_HAT, D_HAT,

      // Tension Bridge groove
      D_KICK, D_HAT, D_SNARE, D_HAT, D_KICK, D_HAT, D_SNARE, D_HAT, D_KICK, D_KICK, D_SNARE, D_HAT, D_KICK, D_HAT, D_SNARE, D_HAT,
      D_KICK, D_HAT, D_SNARE, D_HAT, D_KICK, D_HAT, D_SNARE, D_HAT, D_KICK, D_KICK, D_SNARE, D_HAT, D_KICK, D_HAT, D_SNARE, D_HAT,
      D_KICK, D_HAT, D_SNARE, D_HAT, D_KICK, D_HAT, D_SNARE, D_HAT, D_KICK, D_KICK, D_SNARE, D_HAT, D_KICK, D_HAT, D_SNARE, D_HAT,
      D_KICK, D_SNARE, D_KICK, D_SNARE, D_KICK, D_SNARE, D_KICK, D_SNARE, D_SNARE, D_SNARE, D_SNARE, D_SNARE, D_CRASH, D_SNARE, D_HAT, D_HAT,

      // Climax groove
      D_KICK, D_HAT, D_HAT, D_HAT, D_SNARE, D_HAT, D_HAT, D_HAT, D_KICK, D_HAT, D_KICK, D_HAT, D_SNARE, D_HAT, D_HAT, D_HAT,
      D_KICK, D_HAT, D_SNARE, D_HAT, D_KICK, D_SNARE, D_KICK, D_SNARE, D_SNARE, D_SNARE, D_SNARE, D_SNARE, D_CRASH, D_SNARE, D_KICK, D_HAT
    ]
  };

  /**
   * TITLE / ADVENTURE THEME: Whimsical, nostalgic Route / Pallet Town 8-bit theme
   * 128 BPM in C Major with warm walking bassline and cheerful whistle lead
   */
  const TRACK_TITLE = {
    name: 'title',
    bpm: 128,
    stepsPerBeat: 4,
    loopStartStep: 0,
    lead: [
      // Phrase 1 (C Major joyful adventure)
      'G4', '-', 'C5', '-', 'E5', '-', 'G5', '-', 'A5', 'G5', 'E5', '-', 'C5', '-', 'D5', '-',
      'E5', '-', 'E5', 'D5', 'C5', '-', 'D5', '-', 'E5', '-', 'G5', '-', 'D5', '-', '-', '-',
      // Phrase 2
      'G4', '-', 'C5', '-', 'E5', '-', 'G5', '-', 'A5', 'B5', 'C6', '-', 'G5', '-', 'E5', '-',
      'F5', '-', 'E5', '-', 'D5', 'C5', 'D5', '-', 'C5', '-', 'C5', '-', 'C5', '-', '-', '-',
      // Phrase 3 (Bouncy contrast)
      'A5', '-', 'A5', 'G5', 'F5', '-', 'A5', '-', 'G5', '-', 'E5', '-', 'C5', '-', 'E5', '-',
      'D5', '-', 'D5', 'E5', 'F5', '-', 'G5', '-', 'E5', '-', 'C5', '-', 'D5', '-', '-', '-',
      // Phrase 4 (Cadence resolution)
      'A5', '-', 'B5', '-', 'C6', '-', 'G5', '-', 'F5', 'E5', 'D5', '-', 'E5', '-', 'F5', '-',
      'G5', '-', 'F5', '-', 'E5', '-', 'D5', '-', 'C5', '-', 'C5', '-', 'C5', '-', '-', '-'
    ],
    harmony: [
      'E4', '-', 'G4', '-', 'C5', '-', 'E5', '-', 'F5', 'E5', 'C5', '-', 'G4', '-', 'B4', '-',
      'C5', '-', 'C5', 'B4', 'A4', '-', 'B4', '-', 'C5', '-', 'E5', '-', 'B4', '-', '-', '-',
      'E4', '-', 'G4', '-', 'C5', '-', 'E5', '-', 'F5', 'G5', 'A5', '-', 'E5', '-', 'C5', '-',
      'D5', '-', 'C5', '-', 'B4', 'A4', 'B4', '-', 'G4', '-', 'G4', '-', 'G4', '-', '-', '-',
      'F5', '-', 'F5', 'E5', 'D5', '-', 'F5', '-', 'E5', '-', 'C5', '-', 'G4', '-', 'C5', '-',
      'B4', '-', 'B4', 'C5', 'D5', '-', 'E5', '-', 'C5', '-', 'G4', '-', 'B4', '-', '-', '-',
      'F5', '-', 'G5', '-', 'A5', '-', 'E5', '-', 'D5', 'C5', 'B4', '-', 'C5', '-', 'D5', '-',
      'E5', '-', 'D5', '-', 'C5', '-', 'B4', '-', 'G4', '-', 'G4', '-', 'G4', '-', '-', '-'
    ],
    bass: [
      'C3', 'C4', 'G2', 'G3', 'C3', 'C4', 'G2', 'G3', 'F3', 'F4', 'C3', 'C4', 'G2', 'G3', 'D3', 'D4',
      'C3', 'C4', 'G2', 'G3', 'F2', 'F3', 'C3', 'C4', 'C3', 'C4', 'E3', 'E4', 'G2', 'G3', 'B2', 'B3',
      'C3', 'C4', 'G2', 'G3', 'C3', 'C4', 'G2', 'G3', 'F2', 'F3', 'C3', 'C4', 'C3', 'C4', 'G2', 'G3',
      'D3', 'D4', 'A2', 'A3', 'G2', 'G3', 'B2', 'B3', 'C3', 'G2', 'C3', 'G2', 'C3', 'C4', 'G2', 'B2',
      'F3', 'F4', 'C3', 'C4', 'F3', 'F4', 'C3', 'C4', 'C3', 'C4', 'G2', 'G3', 'C3', 'C4', 'E3', 'E4',
      'G2', 'G3', 'D3', 'D4', 'G2', 'G3', 'B2', 'B3', 'C3', 'C4', 'G2', 'G3', 'G2', 'G3', 'D3', 'D4',
      'F3', 'F4', 'C3', 'C4', 'A2', 'A3', 'E3', 'E4', 'D3', 'D4', 'A2', 'A3', 'G2', 'G3', 'B2', 'B3',
      'C3', 'C4', 'G2', 'G3', 'C3', 'C4', 'G2', 'G3', 'C3', 'G2', 'C3', 'G2', 'C3', '-', '-', '-'
    ],
    drums: [
      D_KICK, D_HAT, D_HAT, D_HAT, D_SNARE, D_HAT, D_HAT, D_HAT, D_KICK, D_HAT, D_KICK, D_HAT, D_SNARE, D_HAT, D_HAT, D_HAT,
      D_KICK, D_HAT, D_HAT, D_HAT, D_SNARE, D_HAT, D_HAT, D_HAT, D_KICK, D_HAT, D_KICK, D_HAT, D_SNARE, D_HAT, D_HAT, D_HAT,
      D_KICK, D_HAT, D_HAT, D_HAT, D_SNARE, D_HAT, D_HAT, D_HAT, D_KICK, D_HAT, D_KICK, D_HAT, D_SNARE, D_HAT, D_HAT, D_HAT,
      D_KICK, D_HAT, D_HAT, D_HAT, D_SNARE, D_HAT, D_KICK, D_HAT, D_SNARE, D_SNARE, D_SNARE, D_SNARE, D_CRASH, D_HAT, D_HAT, D_HAT,
      D_KICK, D_HAT, D_HAT, D_HAT, D_SNARE, D_HAT, D_HAT, D_HAT, D_KICK, D_HAT, D_KICK, D_HAT, D_SNARE, D_HAT, D_HAT, D_HAT,
      D_KICK, D_HAT, D_HAT, D_HAT, D_SNARE, D_HAT, D_HAT, D_HAT, D_KICK, D_HAT, D_KICK, D_HAT, D_SNARE, D_HAT, D_HAT, D_HAT,
      D_KICK, D_HAT, D_HAT, D_HAT, D_SNARE, D_HAT, D_HAT, D_HAT, D_KICK, D_HAT, D_KICK, D_HAT, D_SNARE, D_HAT, D_HAT, D_HAT,
      D_KICK, D_HAT, D_SNARE, D_HAT, D_KICK, D_HAT, D_SNARE, D_HAT, D_KICK, D_SNARE, D_KICK, D_SNARE, D_CRASH, D_HAT, D_HAT, D_HAT
    ]
  };

  /**
   * BUGMON GLITCH BATTLE THEME: Fast, intense, dissonant retro horror theme
   * 154 BPM in C Minor with pitch vibrato and rapid bitcrush rhythm
   */
  const TRACK_BUGMON = {
    name: 'bugmon',
    bpm: 154,
    stepsPerBeat: 4,
    loopStartStep: 16,
    lead: [
      // Alert intro
      'C5', 'C#5', 'C5', 'B4', 'C5', 'D#5', 'D5', 'C#5', 'C5', 'G5', 'F#5', 'F5', 'D#5', 'D5', 'C#5', 'C5',
      // Glitch battle loop
      'C5', '-', 'C5', 'D#5', 'F#5', '-', 'G5', '-', 'C6', 'B5', 'G#5', '-', 'F#5', '-', 'D#5', '-',
      'F5', '-', 'D#5', 'C5', 'F#5', '-', 'F5', '-', 'D#5', '-', 'C5', '-', 'B4', 'C5', 'D#5', 'F#5',
      'G5', '-', 'G5', 'F#5', 'G#5', '-', 'B5', '-', 'C6', '-', 'D#6', '-', 'D6', '-', 'C#6', '-',
      'C6', 'B5', 'G#5', 'G5', 'F#5', 'F5', 'D#5', 'D5', 'C#5', 'C5', 'B4', 'C5', 'D#5', 'F#5', 'A5', 'B5'
    ],
    harmony: [
      'G4', 'G#4', 'G4', 'F#4', 'G4', 'A#4', 'A4', 'G#4', 'G4', 'D#5', 'D5', 'C#5', 'C5', 'B4', 'A#4', 'A4',
      'G4', '-', 'G4', 'C5', 'D#5', '-', 'E5', '-', 'G#5', 'G5', 'E5', '-', 'D#5', '-', 'C5', '-',
      'C#5', '-', 'C5', 'G#4', 'D#5', '-', 'D5', '-', 'C5', '-', 'G#4', '-', 'G4', 'G#4', 'C5', 'D#5',
      'E5', '-', 'E5', 'D#5', 'F5', '-', 'G#5', '-', 'A5', '-', 'C6', '-', 'B5', '-', 'A#5', '-',
      'A5', 'G#5', 'F5', 'E5', 'D#5', 'D5', 'C5', 'B4', 'A#4', 'A4', 'G#4', 'A4', 'C5', 'D#5', 'F#5', 'G5'
    ],
    bass: [
      'C2', 'C3', 'C2', 'C3', 'C2', 'C3', 'C2', 'C3', 'C2', 'C3', 'C2', 'C3', 'C2', 'C3', 'C2', 'C3',
      'C3', 'C4', 'C3', 'C4', 'D#3', 'D#4', 'D#3', 'D#4', 'F#3', 'F#4', 'F#3', 'F#4', 'G3', 'G4', 'G3', 'G4',
      'G#3', 'G#4', 'G#3', 'G#4', 'F3', 'F4', 'F3', 'F4', 'D#3', 'D#4', 'D#3', 'D#4', 'D3', 'D4', 'C#3', 'C#4',
      'C3', 'C4', 'C3', 'C4', 'E3', 'E4', 'E3', 'E4', 'F3', 'F4', 'F#3', 'F#4', 'G3', 'G4', 'G#3', 'G#4',
      'A3', 'A4', 'G#3', 'G#4', 'G3', 'G4', 'F#3', 'F#4', 'F3', 'F4', 'E3', 'E4', 'D#3', 'D#4', 'D3', 'C#3'
    ],
    drums: [
      D_CRASH, D_SNARE, D_KICK, D_SNARE, D_CRASH, D_SNARE, D_KICK, D_SNARE, D_SNARE, D_SNARE, D_SNARE, D_SNARE, D_CRASH, D_SNARE, D_KICK, D_HAT,
      D_KICK, D_HAT, D_SNARE, D_HAT, D_KICK, D_KICK, D_SNARE, D_HAT, D_KICK, D_HAT, D_SNARE, D_HAT, D_KICK, D_KICK, D_SNARE, D_HAT,
      D_KICK, D_HAT, D_SNARE, D_HAT, D_KICK, D_KICK, D_SNARE, D_HAT, D_KICK, D_HAT, D_SNARE, D_HAT, D_KICK, D_KICK, D_SNARE, D_HAT,
      D_KICK, D_HAT, D_SNARE, D_HAT, D_KICK, D_KICK, D_SNARE, D_HAT, D_KICK, D_HAT, D_SNARE, D_HAT, D_KICK, D_KICK, D_SNARE, D_HAT,
      D_KICK, D_SNARE, D_KICK, D_SNARE, D_KICK, D_SNARE, D_KICK, D_SNARE, D_SNARE, D_SNARE, D_SNARE, D_SNARE, D_CRASH, D_CRASH, D_SNARE, D_HAT
    ]
  };

  const TRACKS = {
    battle: TRACK_BATTLE,
    title: TRACK_TITLE,
    bugmon: TRACK_BUGMON
  };

  // ---------------------------------------------------------------------------
  // AUDIO SYNTHESIZER & SCHEDULING STATE
  // ---------------------------------------------------------------------------
  let audioCtx = null;
  let masterGain = null;
  let musicGain = null;
  let isPlaying = false;
  let isPaused = false;
  let currentTrackName = null;
  let currentTrack = null;

  // Scheduler timing state
  let currentStep = 0;
  let nextStepTime = 0.0;
  let scheduleTimerId = null;
  const LOOKAHEAD_MS = 25; // How often the scheduler checks (ms)
  const SCHEDULE_AHEAD_TIME = 0.14; // How far ahead to schedule notes (seconds)

  // Settings & persistence
  let musicEnabled = true;
  let musicVolume = 0.28; // Pleasant background volume that doesn't overpower SFX

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedMute = window.localStorage.getItem('codemons_music_enabled');
      if (savedMute !== null) {
        musicEnabled = (savedMute === 'true');
      }
      const savedVol = window.localStorage.getItem('codemons_music_volume');
      if (savedVol !== null) {
        const v = parseFloat(savedVol);
        if (!isNaN(v) && v >= 0 && v <= 1) musicVolume = v;
      }
    }
  } catch {}

  // ---------------------------------------------------------------------------
  // AUDIO CONTEXT INITIALIZATION
  // ---------------------------------------------------------------------------
  function getAudioContext() {
    if (typeof window === 'undefined') return null;

    if (!audioCtx) {
      // Re-use window.AudioContext or create new
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }

    if (audioCtx) {
      if (!masterGain) {
        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(1.0, audioCtx.currentTime);
        masterGain.connect(audioCtx.destination);
      }
      if (!musicGain) {
        musicGain = audioCtx.createGain();
        musicGain.gain.setValueAtTime(musicEnabled ? musicVolume : 0.0, audioCtx.currentTime);
        musicGain.connect(masterGain);
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
    }

    return audioCtx;
  }

  // ---------------------------------------------------------------------------
  // CHIPTUNE SOUND GENERATORS
  // ---------------------------------------------------------------------------

  /**
   * Channel 1 & 2: Pulse (Square wave) with Game Boy ADSR envelope & subtle vibrato
   */
  function schedulePulseNote(freq, startTime, duration, channelType = 'lead') {
    if (!freq || freq <= 0 || !audioCtx || !musicGain) return;

    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, startTime);

      // Game Boy vibrato on longer notes
      if (duration > 0.20) {
        const vibrato = audioCtx.createOscillator();
        const vibratoGain = audioCtx.createGain();
        vibrato.frequency.setValueAtTime(6.0, startTime);
        vibratoGain.gain.setValueAtTime(freq * 0.015, startTime); // Subtle 1.5% pitch variation
        vibrato.connect(osc.frequency);
        vibrato.start(startTime + 0.08);
        vibrato.stop(startTime + duration);
      }

      // Classic Game Boy envelope (Crisp attack, fast decay to sustain level)
      const peakAmp = channelType === 'lead' ? 0.22 : 0.14;
      const sustainAmp = peakAmp * 0.70;
      const attackTime = 0.005;
      const decayTime = 0.04;
      const releaseTime = 0.015;
      const playDuration = Math.max(0.02, duration - 0.01);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peakAmp, startTime + attackTime);
      gain.gain.linearRampToValueAtTime(sustainAmp, startTime + attackTime + decayTime);
      gain.gain.setValueAtTime(sustainAmp, startTime + playDuration - releaseTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + playDuration);

      osc.connect(gain);
      gain.connect(musicGain);

      osc.start(startTime);
      osc.stop(startTime + playDuration);
    } catch {}
  }

  /**
   * Channel 3: Wave Bass (Triangle / Low-pass filtered wave for authentic bouncy bassline)
   */
  function scheduleBassNote(freq, startTime, duration) {
    if (!freq || freq <= 0 || !audioCtx || !musicGain) return;

    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      // Lowpass filter for smooth 4-bit Game Boy wave channel timbre
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, startTime);

      // Bouncy staccato bass envelope
      const peakAmp = 0.32;
      const playDuration = Math.max(0.03, duration * 0.85);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peakAmp, startTime + 0.004);
      gain.gain.exponentialRampToValueAtTime(peakAmp * 0.40, startTime + playDuration - 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + playDuration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(musicGain);

      osc.start(startTime);
      osc.stop(startTime + playDuration);
    } catch {}
  }

  /**
   * Channel 4: Noise Drums (Game Boy 8-bit Noise bursts)
   */
  function scheduleDrum(drumType, startTime) {
    if (!drumType || !audioCtx || !musicGain) return;

    try {
      if (drumType === D_KICK) {
        // 8-bit Kick: Quick pitch-drop pulse + soft noise thump
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, startTime);
        osc.frequency.exponentialRampToValueAtTime(32, startTime + 0.06);

        gain.gain.setValueAtTime(0.35, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.06);

        osc.connect(gain);
        gain.connect(musicGain);
        osc.start(startTime);
        osc.stop(startTime + 0.06);
      } else if (drumType === D_SNARE) {
        // 8-bit Snare: Snappy mid-frequency noise burst
        const bufferSize = Math.floor(audioCtx.sampleRate * 0.08);
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, startTime);
        filter.Q.setValueAtTime(1.5, startTime);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.26, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(musicGain);

        noise.start(startTime);
        noise.stop(startTime + 0.08);
      } else if (drumType === D_HAT) {
        // 8-bit Closed Hi-Hat: Crisp high-frequency tick
        const bufferSize = Math.floor(audioCtx.sampleRate * 0.025);
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(6500, startTime);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.025);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(musicGain);

        noise.start(startTime);
        noise.stop(startTime + 0.025);
      } else if (drumType === D_CRASH) {
        // 8-bit Crash cymbal
        const bufferSize = Math.floor(audioCtx.sampleRate * 0.22);
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(4500, startTime);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.24, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(musicGain);

        noise.start(startTime);
        noise.stop(startTime + 0.22);
      }
    } catch {}
  }

  // ---------------------------------------------------------------------------
  // SAMPLE-ACCURATE LOOKAHEAD SCHEDULER
  // ---------------------------------------------------------------------------
  function scheduleNextStep() {
    if (!currentTrack || !isPlaying || isPaused || !audioCtx) return;

    const secondsPerStep = (60 / currentTrack.bpm) / currentTrack.stepsPerBeat;
    const totalSteps = currentTrack.lead.length;

    // While there are notes that need scheduling before the lookahead window ends
    while (nextStepTime < audioCtx.currentTime + SCHEDULE_AHEAD_TIME) {
      const stepIdx = currentStep % totalSteps;

      // 1. Lead note
      const leadNoteName = currentTrack.lead[stepIdx];
      if (leadNoteName && leadNoteName !== '-') {
        const freq = N[leadNoteName] || 0;
        schedulePulseNote(freq, nextStepTime, secondsPerStep * 1.5, 'lead');
      }

      // 2. Harmony note
      if (currentTrack.harmony) {
        const harmNoteName = currentTrack.harmony[stepIdx];
        if (harmNoteName && harmNoteName !== '-') {
          const freq = N[harmNoteName] || 0;
          schedulePulseNote(freq, nextStepTime, secondsPerStep * 1.2, 'harmony');
        }
      }

      // 3. Bass note
      if (currentTrack.bass) {
        const bassNoteName = currentTrack.bass[stepIdx];
        if (bassNoteName && bassNoteName !== '-') {
          const freq = N[bassNoteName] || 0;
          scheduleBassNote(freq, nextStepTime, secondsPerStep);
        }
      }

      // 4. Drum hit
      if (currentTrack.drums) {
        const drum = currentTrack.drums[stepIdx];
        if (drum) {
          scheduleDrum(drum, nextStepTime);
        }
      }

      // Advance step and timeline
      nextStepTime += secondsPerStep;
      currentStep++;

      // Seamless loop handling
      if (currentStep >= totalSteps) {
        currentStep = currentTrack.loopStartStep || 0;
      }
    }
  }

  function startScheduler() {
    stopScheduler();
    scheduleTimerId = setInterval(() => {
      scheduleNextStep();
    }, LOOKAHEAD_MS);
  }

  function stopScheduler() {
    if (scheduleTimerId) {
      clearInterval(scheduleTimerId);
      scheduleTimerId = null;
    }
  }

  // ---------------------------------------------------------------------------
  // PUBLIC CONTROLLER API
  // ---------------------------------------------------------------------------

  /**
   * Start or switch background music track ('battle', 'title', 'bugmon')
   */
  function playBgm(trackName = 'battle') {
    const ctx = getAudioContext();
    if (!ctx) return;

    const targetTrack = TRACKS[trackName] || TRACKS.battle;
    if (currentTrackName === targetTrack.name && isPlaying && !isPaused) {
      return; // Already playing this track
    }

    currentTrackName = targetTrack.name;
    currentTrack = targetTrack;
    isPlaying = true;
    isPaused = false;
    currentStep = 0;
    nextStepTime = ctx.currentTime + 0.05;

    // Apply volume
    if (musicGain) {
      musicGain.gain.setValueAtTime(musicEnabled ? musicVolume : 0.0, ctx.currentTime);
    }

    startScheduler();
    updateMusicUI();
  }

  /**
   * Stop background music playback completely
   */
  function stopBgm() {
    stopScheduler();
    isPlaying = false;
    isPaused = false;
    currentStep = 0;
    currentTrack = null;
    currentTrackName = null;
    updateMusicUI();
  }

  /**
   * Pause background music
   */
  function pauseBgm() {
    if (!isPlaying || isPaused) return;
    isPaused = true;
    stopScheduler();
    if (musicGain && audioCtx) {
      musicGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
    }
    updateMusicUI();
  }

  /**
   * Resume paused background music
   */
  function resumeBgm() {
    if (!isPlaying || !isPaused) {
      if (!isPlaying) {
        playBgm(currentTrackName || 'battle');
      }
      return;
    }
    const ctx = getAudioContext();
    if (!ctx) return;

    isPaused = false;
    nextStepTime = ctx.currentTime + 0.05;
    if (musicGain) {
      musicGain.gain.setValueAtTime(musicEnabled ? musicVolume : 0.0, ctx.currentTime);
    }
    startScheduler();
    updateMusicUI();
  }

  /**
   * Toggle music on/off
   */
  function toggleBgm() {
    musicEnabled = !musicEnabled;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('codemons_music_enabled', musicEnabled ? 'true' : 'false');
      }
    } catch {}

    const ctx = getAudioContext();
    if (ctx && musicGain) {
      musicGain.gain.setValueAtTime(musicEnabled ? musicVolume : 0.0, ctx.currentTime);
    }

    // If turned ON and wasn't playing, start playing active track
    if (musicEnabled && !isPlaying) {
      playBgm(currentTrackName || 'title');
    }

    updateMusicUI();
    return musicEnabled;
  }

  /**
   * Adjust music volume (0.0 to 1.0)
   */
  function setBgmVolume(val) {
    const v = Math.max(0.0, Math.min(1.0, Number(val) || 0.0));
    musicVolume = v;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('codemons_music_volume', String(v));
      }
    } catch {}

    const ctx = getAudioContext();
    if (ctx && musicGain && musicEnabled) {
      musicGain.gain.setValueAtTime(v, ctx.currentTime);
    }
  }

  /**
   * Update UI button labels for music
   */
  function updateMusicUI() {
    if (typeof document === 'undefined') return;

    const musicBtn = document.getElementById('music-toggle-btn');
    if (musicBtn) {
      musicBtn.textContent = musicEnabled ? '🎵 BGM: ON' : '🎵 BGM: OFF';
      musicBtn.setAttribute('aria-pressed', musicEnabled ? 'true' : 'false');
      musicBtn.classList.toggle('active', musicEnabled);
    }

    const pauseMusicBtn = document.getElementById('btn-pause-music');
    if (pauseMusicBtn) {
      pauseMusicBtn.textContent = musicEnabled ? '🎵 MUSIC: ON' : '🎵 MUSIC: OFF';
      pauseMusicBtn.setAttribute('aria-pressed', musicEnabled ? 'true' : 'false');
    }
  }

  // ---------------------------------------------------------------------------
  // AUTOPLAY WORKAROUND (Browser interaction unlock)
  // ---------------------------------------------------------------------------
  function attachAutoplayUnlock() {
    if (typeof window === 'undefined') return;

    let hasInteracted = false;
    function onFirstUserInteraction() {
      if (hasInteracted) return;
      hasInteracted = true;
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      // If music is enabled and hasn't started yet, launch title or current track
      if (musicEnabled && !isPlaying) {
        const currentScreen = (window.gameState && window.gameState.currentScreen) || 'title';
        const trackToPlay = (currentScreen === 'battle') ? 'battle' : 'title';
        playBgm(trackToPlay);
      }
      window.removeEventListener('click', onFirstUserInteraction);
      window.removeEventListener('keydown', onFirstUserInteraction);
      window.removeEventListener('touchstart', onFirstUserInteraction);
    }

    window.addEventListener('click', onFirstUserInteraction, { once: true, passive: true });
    window.addEventListener('keydown', onFirstUserInteraction, { once: true, passive: true });
    window.addEventListener('touchstart', onFirstUserInteraction, { once: true, passive: true });
  }

  // Auto-bind upon DOM ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        updateMusicUI();
        attachAutoplayUnlock();
      });
    } else {
      updateMusicUI();
      attachAutoplayUnlock();
    }
  }

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------
  const MusicEngine = {
    TRACKS,
    playBgm,
    stopBgm,
    pauseBgm,
    resumeBgm,
    toggleBgm,
    setBgmVolume,
    isBgmPlaying: () => isPlaying && !isPaused,
    isBgmEnabled: () => musicEnabled,
    getCurrentTrack: () => currentTrackName,
    getAudioContext,
    updateMusicUI
  };

  if (typeof window !== 'undefined') {
    window.MusicEngine = MusicEngine;
    window.playBgm = playBgm;
    window.stopBgm = stopBgm;
    window.pauseBgm = pauseBgm;
    window.resumeBgm = resumeBgm;
    window.toggleBgm = toggleBgm;
    window.setBgmVolume = setBgmVolume;
    window.isBgmPlaying = MusicEngine.isBgmPlaying;
    window.isBgmEnabled = MusicEngine.isBgmEnabled;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MusicEngine;
  }
})();
