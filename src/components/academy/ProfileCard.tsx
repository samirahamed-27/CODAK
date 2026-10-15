'use client';

import React, { useState, useRef } from 'react';
import { Camera, Trash2, Shield, AlertTriangle } from 'lucide-react';
import { StudentProfile } from '@/data/studentDashboardData';

interface ProfileCardProps {
  profile: StudentProfile;
  onUpdateAvatar?: (newUrl: string | null) => void;
}

const STORAGE_KEY = 'academy_student_avatar';

export function ProfileCard({ profile, onUpdateAvatar }: ProfileCardProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return saved;
      } catch {
        // Storage access blocked or unavailable
      }
    }
    return profile.avatarUrl;
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Please upload a JPG, PNG, or WebP image.');
      return;
    }

    // Validate size (< 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      setErrorMsg('Image file size must be less than 2 MB.');
      return;
    }

    // Read and preview immediately via FileReader (Base64 data URL)
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAvatarUrl(result);
      try {
        localStorage.setItem(STORAGE_KEY, result);
      } catch {
        console.warn('LocalStorage limit reached for avatar image.');
      }
      onUpdateAvatar?.(result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setErrorMsg(null);
    setAvatarUrl(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onUpdateAvatar?.(null);
  };

  return (
    <article
      aria-label="Student Profile Card"
      className="game-card p-6 flex flex-col items-center justify-between text-center relative overflow-hidden animate-card-pop"
    >
      {/* Background ambient glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#7CC4FF]/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top Title */}
      <div className="w-full flex items-center justify-between mb-4">
        <span className="font-pixel text-[11px] font-bold uppercase tracking-wider text-[#A9B8D6]">
          HERO PROFILE
        </span>
        <div className="flex items-center gap-1 text-[11px] font-bold text-[#FFB27A]">
          <Shield className="w-3.5 h-3.5" />
          <span>RANKED</span>
        </div>
      </div>

      {/* Avatar Container with Glowing Gradient Ring (from #7CC4FF to #FFB27A) */}
      <div className="relative my-2">
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full p-[3px] bg-gradient-to-tr from-[#7CC4FF] via-[#A9B8D6] to-[#FFB27A] shadow-[0_0_20px_rgba(124,196,255,0.3)] flex items-center justify-center">
          <div className="w-full h-full rounded-full overflow-hidden bg-[#081534] flex items-center justify-center">
            {avatarUrl ? (
              // User uploaded custom photo
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={`${profile.name}'s avatar`}
                className="w-full h-full object-cover"
              />
            ) : (
              // Default Retro Arcade Gamer Avatar
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#122452] to-[#081534] text-white">
                <svg
                  className="w-16 h-16 text-[#7CC4FF]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="8" r="5" />
                  <path d="M20 21a8 8 0 1 0-16 0" />
                  <circle cx="9" cy="7" r="1" fill="#7CC4FF" />
                  <circle cx="15" cy="7" r="1" fill="#7CC4FF" />
                  <path d="M10 11c.7.5 1.8.5 2.5 0" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Level Corner Badge (Pastel Orange #FFB27A) */}
        <div
          className="absolute -bottom-1 -right-1 px-2.5 py-1 rounded-xl bg-[#050B1E] border-2 border-[#FFB27A] text-[#FFB27A] font-pixel text-[11px] font-bold shadow-lg shadow-black/60"
          title={`Level ${profile.level}`}
        >
          LVL {profile.level}
        </div>
      </div>

      {/* Name and Rank */}
      <div className="mt-4 mb-5">
        <h2 className="font-extrabold text-lg sm:text-xl text-white font-body leading-tight">
          {profile.name}
        </h2>
        <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#081534] border border-[#1E3A78] text-xs font-semibold text-[#FFB27A]">
          <span>🏆 {profile.rank}</span>
        </div>
      </div>

      {/* Error Message if Validation Fails */}
      {errorMsg && (
        <div className="w-full mb-3 p-2 rounded-xl bg-[#FFB27A]/15 border border-[#FFB27A]/30 text-[#FFB27A] text-[11px] flex items-center gap-1.5 text-left">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Photo Controls */}
      <div className="w-full space-y-2 mt-auto">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
          id="profile-photo-upload"
          aria-label="Upload profile photo"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-2.5 px-3 rounded-xl btn-arcade-primary text-xs flex items-center justify-center gap-2"
        >
          <Camera className="w-3.5 h-3.5 text-[#06080F]" />
          <span>{avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
        </button>

        {avatarUrl && (
          <button
            type="button"
            onClick={handleRemoveAvatar}
            className="w-full py-2 px-3 text-[11px] font-medium text-[#A9B8D6] hover:text-[#FFB27A] hover:bg-[#FFB27A]/10 rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove photo</span>
          </button>
        )}
      </div>
    </article>
  );
}
