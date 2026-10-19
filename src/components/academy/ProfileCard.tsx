'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { AlertTriangle } from 'lucide-react';
import { StudentProfile } from '@/data/studentDashboardData';
import ProfileCardReactBits from '@/components/ProfileCard';

interface ProfileCardProps {
  profile: StudentProfile;
  onUpdateAvatar?: (newUrl: string | null) => void;
}

const STORAGE_KEY = 'academy_student_avatar';
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop';

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

  const effectiveAvatar = avatarUrl || profile.avatarUrl || DEFAULT_AVATAR;
  const studentHandle = profile.name
    ? profile.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    : 'student';

  return (
    <div className="w-full flex flex-col items-center justify-center">
      {/* Hidden file input for photo change */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        id="profile-photo-upload"
        aria-label="Upload profile photo"
      />

      {/* React Bits ProfileCard Component */}
      <ProfileCardReactBits
        name={profile.name || 'Student'}
        title={`Level ${profile.level} • ${profile.rank}`}
        handle={studentHandle}
        status="Online"
        statusColor="#22c55e"
        contactText={avatarUrl ? 'Change Photo' : 'Upload Photo'}
        contactIcon={Camera01Icon}
        avatarUrl={effectiveAvatar}
        miniAvatarUrl={effectiveAvatar}
        holo={0.8}
        glare={0.5}
        tiltStrength={12}
        parallax={8}
        radius={16}
        enableTilt={true}
        intro={true}
        showUserInfo={true}
        enableMobileTilt={false}
        theme="dark"
        onContactClick={() => fileInputRef.current?.click()}
      />

      {/* Error Message if Validation Fails */}
      {errorMsg && (
        <div className="w-full max-w-[340px] mt-2.5 p-2 rounded-xl bg-white/10 border border-white/20 text-zinc-200 text-[11px] flex items-center gap-1.5 text-left">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-white" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Reset Avatar Button if Custom Photo Exists */}
      {avatarUrl && (
        <button
          type="button"
          onClick={handleRemoveAvatar}
          className="mt-2 text-[11px] text-zinc-400 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <HugeiconsIcon icon={Delete02Icon} size={13} />
          <span>Reset photo</span>
        </button>
      )}
    </div>
  );
}

export default ProfileCard;
