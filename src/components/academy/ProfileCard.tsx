'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Camera, Trash2, Shield, AlertTriangle, Sparkles, ExternalLink } from 'lucide-react';
import { StudentProfile } from '@/data/studentDashboardData';
import Shuffle from '@/components/Shuffle';
import { RankChip } from '@/components/ranks/RankChip';

interface ProfileCardProps {
  profile: StudentProfile;
  onUpdateAvatar?: (newUrl: string | null) => void;
}

const STORAGE_KEY = 'academy_student_avatar';

export function ProfileCard({ profile, onUpdateAvatar }: ProfileCardProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hydrate avatar from localStorage on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setAvatarUrl(saved);
    } catch {
      // Storage access blocked or unavailable
    }
  }, []);

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
      className="game-card p-5 flex flex-col items-center justify-between text-center relative overflow-hidden h-full"
    >
      {/* Top Title */}
      <div className="w-full flex items-center justify-between mb-3 text-xs">
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
          Student Profile
        </span>
        <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-300 font-medium">
          <Shield className="w-3.5 h-3.5" />
          <span>Active</span>
        </div>
      </div>

      {/* Avatar Container with Sleek Minimalist Ring */}
      <div className="relative my-2">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-[2px] bg-gradient-to-tr from-zinc-600 via-white to-zinc-400 shadow-md shadow-white/10 flex items-center justify-center">
          <div className="w-full h-full rounded-full overflow-hidden bg-zinc-950 flex items-center justify-center">
            {avatarUrl ? (
              // User uploaded custom photo
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={`${profile.name}'s avatar`}
                className="w-full h-full object-cover"
              />
            ) : (
              // Sleek Minimal Avatar
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-400">
                <svg
                  className="w-12 h-12 text-zinc-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="8" r="5" />
                  <path d="M20 21a8 8 0 1 0-16 0" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Level Badge */}
        <div
          className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-zinc-900 border border-white/20 text-white font-mono text-[10px] font-semibold shadow-md"
          title={`Level ${profile.level}`}
        >
          LVL {profile.level}
        </div>
      </div>

      {/* Name and Rank */}
      <div className="mt-3 mb-4">
        <Shuffle
          text={profile.name}
          tag="h2"
          effect="slide"
          duration={0.35}
          stagger={0.03}
          triggerOnHover={true}
          color="#FFFFFF"
          accentColor="#A1A1AA"
          style={{ fontSize: '1.15rem', letterSpacing: '0.02em', fontWeight: 600 }}
        />
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <RankChip level={profile.level} size="sm" showLevel />
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] font-mono text-zinc-300">
            🏆 {profile.rank}
          </span>
        </div>
      </div>

      {/* Error Message if Validation Fails */}
      {errorMsg && (
        <div className="w-full mb-3 p-2 rounded-xl bg-white/10 border border-white/20 text-zinc-200 text-[11px] flex items-center gap-1.5 text-left">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-white" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Photo Controls */}
      <div className="w-full space-y-1.5 mt-auto">
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
          className="w-full py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Camera className="w-3.5 h-3.5 text-zinc-400" />
          <span>{avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
        </button>

        <Link
          href="/student/profile"
          className="w-full py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          <span>Academic Profile Index</span>
        </Link>

        {avatarUrl && (
          <button
            type="button"
            onClick={handleRemoveAvatar}
            className="w-full py-1.5 px-3 text-[11px] text-zinc-400 hover:text-white transition-colors flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3 h-3" />
            <span>Remove photo</span>
          </button>
        )}
      </div>
    </article>
  );
}
