'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Trash2, Shield, AlertTriangle, X } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import Image from 'next/image';
import { StudentProfile } from '@/data/studentDashboardData';
import Shuffle from '@/components/Shuffle';
import { RankChip } from '@/components/ranks/RankChip';

interface ProfileCardProps {
  profile: StudentProfile;
  onUpdateAvatar?: (newUrl: string | null) => void;
}

const STORAGE_KEY = 'academy_student_avatar';
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop';

export function ProfileCard({ profile, onUpdateAvatar }: ProfileCardProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl);
  const [expanded, setExpanded] = useState(false);
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

  const effectiveAvatar = avatarUrl || DEFAULT_AVATAR;

  return (
    <MotionConfig
      transition={{
        duration: 0.4,
        type: 'spring',
        bounce: 0.2,
      }}
    >
      <article
        aria-label="Student Profile Card"
        className="game-card p-5 flex flex-col items-center justify-between text-center relative overflow-hidden h-full"
      >
        {/* Top Header Row */}
        <div className="w-full flex items-center justify-between mb-3 text-xs z-30">
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
            Student Profile
          </span>
          <div className="flex items-center gap-1.5">
            {expanded ? (
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-[11px] font-mono text-white transition-all cursor-pointer"
                title="Collapse profile photo"
              >
                <X className="w-3 h-3" />
                <span>Close</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-300 font-medium">
                <Shield className="w-3.5 h-3.5" />
                <span>Active</span>
              </div>
            )}
          </div>
        </div>

        {/* Telegram Header Expanding Photo Container */}
        <div className="relative w-full flex flex-col items-center justify-center my-2">
          <motion.header
            layout
            style={{ aspectRatio: expanded ? '1/1' : '' }}
            className={`relative isolate flex flex-col w-full rounded-2xl overflow-hidden transition-all ${
              expanded
                ? 'items-start justify-end p-5 min-h-[260px]'
                : 'items-center justify-center p-2'
            }`}
          >
            {/* Collapsed Avatar Circle */}
            <motion.button
              type="button"
              layoutId="profile-avatar-reticle"
              className="relative flex aspect-square w-24 sm:w-28 items-center justify-center overflow-hidden cursor-pointer shadow-xl ring-2 ring-white/20 hover:ring-white/60 active:scale-95 transition-transform"
              onClick={() => setExpanded(!expanded)}
              style={{
                borderRadius: expanded ? 0 : 36,
              }}
              title="Click to expand profile image"
            >
              <Image
                src={effectiveAvatar}
                alt={`${profile.name}'s avatar`}
                fill
                unoptimized
                className="pointer-events-none h-full w-full object-cover"
              />
              {!expanded && (
                <div
                  className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-zinc-900 border border-white/20 text-white font-mono text-[10px] font-semibold shadow-md pointer-events-none"
                  title={`Level ${profile.level}`}
                >
                  LVL {profile.level}
                </div>
              )}
            </motion.button>

            {/* Expanded Full-Bleed Photo Overlay */}
            <AnimatePresence>
              {expanded && (
                <motion.button
                  type="button"
                  layoutId="profile-avatar-reticle"
                  className="absolute inset-0 -z-10 aspect-square overflow-hidden cursor-pointer w-full h-full"
                  style={{ borderRadius: 16 }}
                  onClick={() => setExpanded(false)}
                  title="Click to collapse photo"
                >
                  <Image
                    src={effectiveAvatar}
                    alt={`${profile.name}'s avatar`}
                    fill
                    unoptimized
                    priority
                    className="pointer-events-none h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Name and Rank displayed over image when expanded */}
            {expanded && (
              <motion.div
                layout
                className="relative z-20 flex flex-col items-start text-left mt-auto"
              >
                <h2 className="text-lg font-bold text-white tracking-tight drop-shadow-md">
                  {profile.name || 'Student'}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <RankChip level={profile.level} size="sm" showLevel />
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 border border-white/20 text-[10px] font-mono text-zinc-200 backdrop-blur-sm">
                    🏆 {profile.rank}
                  </span>
                </div>
              </motion.div>
            )}
          </motion.header>
        </div>

        {/* Collapsed Name and Rank Display */}
        {!expanded && (
          <div className="mt-2 mb-4">
            {profile.name ? (
              <Shuffle
                key={profile.name}
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
            ) : (
              <h2
                style={{ fontSize: '1.15rem', letterSpacing: '0.02em', fontWeight: 600 }}
                className="text-white"
              >
                Student
              </h2>
            )}
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <RankChip level={profile.level} size="sm" showLevel />
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] font-mono text-zinc-300">
                🏆 {profile.rank}
              </span>
            </div>
          </div>
        )}

        {/* Error Message if Validation Fails */}
        {errorMsg && (
          <div className="w-full mb-3 p-2 rounded-xl bg-white/10 border border-white/20 text-zinc-200 text-[11px] flex items-center gap-1.5 text-left">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-white" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Photo Controls (Note: Academic Profile Index button removed) */}
        <div className="w-full space-y-1.5 mt-auto z-20">
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
            className="w-full py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-zinc-400" />
            <span>{avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
          </button>

          {avatarUrl && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              className="w-full py-1.5 px-3 text-[11px] text-zinc-400 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Remove photo</span>
            </button>
          )}
        </div>
      </article>
    </MotionConfig>
  );
}
