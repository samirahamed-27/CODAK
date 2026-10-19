'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Camera, Trash2, ExternalLink, RotateCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { StudentProfile } from '@/data/studentDashboardData';
import Shuffle from '@/components/Shuffle';
import { RankChip } from '@/components/ranks/RankChip';
import FlipCard from '@/components/FlipCard';

interface ProfileCardProps {
  profile: StudentProfile;
  onUpdateAvatar?: (newUrl: string | null) => void;
}

const STORAGE_KEY = 'academy_student_avatar';

export function ProfileCard({ profile, onUpdateAvatar }: ProfileCardProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
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

  const handleRemoveAvatar = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  // Front Face: Clean player card without upload button, showing user's set avatar
  const frontContent = (
    <div className="w-full h-full p-4 flex flex-col justify-between select-none relative overflow-hidden bg-gradient-to-b from-[#141416] via-[#0c0c0e] to-[#08080a] border border-white/10 rounded-[22px]">
      {/* Top Header */}
      <div className="flex items-center justify-between text-xs z-10 pb-1">
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
          Student Card
        </span>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-300">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Active</span>
        </div>
      </div>

      {/* Main Avatar / Portrait Display */}
      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 my-auto shadow-inner flex items-center justify-center">
        {avatarUrl ? (
          // User uploaded custom photo
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={profile.name || 'Student'}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          // Clean monogram/student insignia if no picture uploaded yet (no dummy stock photo!)
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-zinc-800/30 to-black p-4">
            <div className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/15 flex items-center justify-center text-4xl shadow-xl shadow-black/50 mb-2">
              👨‍🎓
            </div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              CODAK Identity
            </span>
          </div>
        )}

        {/* Level badge overlay */}
        <div className="absolute bottom-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-black/75 border border-white/20 text-white font-mono text-[10px] font-bold shadow-lg backdrop-blur-md">
          LVL {profile.level}
        </div>
      </div>

      {/* Student Identity Information (No upload button on front!) */}
      <div className="w-full text-center mt-2 z-10">
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

        <div className="mt-1 flex items-center justify-center gap-2">
          <RankChip level={profile.level} size="sm" showLevel />
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-zinc-300">
            🏆 {profile.rank}
          </span>
        </div>

        {/* Interactive Flip Hint */}
        <div className="mt-3.5 pt-2 border-t border-white/5 flex items-center justify-center gap-1.5 text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors">
          <RotateCw className="w-3 h-3" />
          <span>Click or drag to flip • Edit Profile</span>
        </div>
      </div>
    </div>
  );

  // Back Face: Edit Profile options
  const backContent = (
    <div className="w-full h-full p-4 flex flex-col justify-between relative overflow-hidden bg-gradient-to-b from-[#141416] via-[#0e0e11] to-[#070709] border border-white/10 rounded-[22px] text-left">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
            <span>Edit Profile</span>
          </h3>
          <p className="text-[10px] text-zinc-400 font-mono">Avatar & Account</p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsFlipped(false);
          }}
          className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition-all text-[10px] flex items-center gap-1 cursor-pointer"
          title="Flip back to front"
        >
          <RotateCw className="w-3 h-3" />
          <span className="font-mono">Front</span>
        </button>
      </div>

      {/* Avatar Preview & Photo Editing Controls */}
      <div className="py-2.5 flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-2xl p-3">
        <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 bg-zinc-950 shrink-0 flex items-center justify-center">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="Avatar preview" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">👨‍🎓</span>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="w-full py-1.5 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-zinc-300" />
            <span>{avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
          </button>

          {avatarUrl && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              className="w-full py-1 px-2 rounded-lg text-[10px] text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Remove Photo</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Profile Summary */}
      <div className="space-y-1.5 text-xs font-mono bg-black/40 border border-white/5 p-3 rounded-2xl">
        <div className="flex justify-between items-center text-zinc-400 text-[11px]">
          <span>Player:</span>
          <span className="text-white font-medium truncate max-w-[150px]">{profile.name || 'Student'}</span>
        </div>
        <div className="flex justify-between items-center text-zinc-400 text-[11px]">
          <span>Level:</span>
          <span className="text-white font-medium">LVL {profile.level}</span>
        </div>
        <div className="flex justify-between items-center text-zinc-400 text-[11px]">
          <span>Rank Tier:</span>
          <span className="text-white font-medium">{profile.rank}</span>
        </div>
      </div>

      {/* Error Message if Validation Fails */}
      {errorMsg && (
        <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Link to Full Academic Profile */}
      <div className="space-y-2 pt-1">
        <Link
          href="/student/profile"
          onClick={(e) => e.stopPropagation()}
          className="w-full py-2 px-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <span>Full Academic Profile</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
        <p className="text-[10px] text-zinc-500 text-center font-mono">
          Click or drag card to flip back
        </p>
      </div>
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center justify-center">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        id="profile-photo-upload"
        aria-label="Upload profile photo"
      />

      {/* FlipCard Component */}
      <FlipCard
        front={frontContent}
        back={backContent}
        flipped={isFlipped}
        onFlipChange={setIsFlipped}
        axis="y"
        flipOnClick={true}
        draggable={true}
        dragDistance={0}
        tilt={true}
        tiltMax={10}
        glare={true}
        glareOpacity={0.2}
        hoverScale={1.02}
        perspective={1100}
        stiffness={180}
        damping={20}
        width="100%"
        height={415}
        radius={22}
        background="#0c0c0e"
        color="#f5f5f5"
        shadow={true}
        shadowColor="#000000"
        shadowOpacity={0.5}
        ariaLabel="Student Profile Flip Card"
      />
    </div>
  );
}

export default ProfileCard;
