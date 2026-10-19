'use client';

import * as React from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface TelegramHeaderProps {
  avatar: string;
  name: string;
  phone: string;
  username: string;
  actionButton?: {
    text: string;
    onClick: () => void;
    backgroundColor?: string;
  };
  expanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  className?: string;
  children?: React.ReactNode;
}

export function TelegramHeader({
  avatar,
  name,
  phone,
  username,
  actionButton = {
    text: 'Edit',
    onClick: () => {},
    backgroundColor: '#ffffff',
  },
  expanded: controlledExpanded,
  onExpandChange,
  className,
  children,
}: TelegramHeaderProps) {
  const [internalExpand, setInternalExpand] = React.useState(false);
  const isControlled = controlledExpanded !== undefined;
  const expand = isControlled ? controlledExpanded : internalExpand;

  const setExpand = (val: boolean) => {
    if (!isControlled) {
      setInternalExpand(val);
    }
    onExpandChange?.(val);
  };

  const isImageSrc =
    avatar &&
    (avatar.startsWith('http://') ||
      avatar.startsWith('https://') ||
      avatar.startsWith('/') ||
      avatar.startsWith('data:image/'));

  return (
    <MotionConfig
      transition={{
        duration: 0.4,
        type: 'spring',
        bounce: 0.2,
      }}
    >
      <div className={cn('relative w-full overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 text-white', className)}>
        {actionButton && (
          <motion.button
            className={cn(
              'absolute z-30 rounded-full px-3 py-1 text-xs font-semibold cursor-pointer transition-colors',
              expand ? 'top-4 right-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md' : 'top-4 right-4 text-zinc-400 hover:text-white bg-transparent'
            )}
            initial={{ opacity: 0.8 }}
            animate={{
              background: expand
                ? (actionButton.backgroundColor || 'rgba(255, 255, 255, 0.15)')
                : 'transparent',
              color: expand ? '#000000' : '#d4d4d8',
            }}
            onClick={actionButton.onClick}
          >
            {actionButton.text}
          </motion.button>
        )}

        <motion.header
          layout
          style={{ aspectRatio: expand ? '1/1' : '' }}
          className={cn(
            'relative isolate flex flex-col',
            expand
              ? 'mt-0 items-start justify-end p-6 min-h-[320px] sm:min-h-[380px]'
              : 'mt-5 mb-5 items-center justify-center p-4'
          )}
        >
          <motion.button
            type="button"
            layoutId="user-avatar"
            className="relative flex aspect-square w-20 sm:w-24 items-center justify-center overflow-hidden cursor-pointer shadow-2xl ring-2 ring-white/20 hover:ring-white/50 transition-all active:scale-95"
            onClick={() => setExpand(!expand)}
            style={{
              borderRadius: 36,
            }}
            title="Click to view full profile picture"
          >
            {isImageSrc ? (
              <Image
                src={avatar}
                alt={name}
                fill
                unoptimized
                className="pointer-events-none h-full w-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-4xl">
                {avatar || '👨‍🎓'}
              </div>
            )}
          </motion.button>

          <motion.div
            className={`relative z-20 flex flex-col mt-3 ${
              expand ? 'items-start' : 'items-center'
            }`}
          >
            <motion.h2
              layout
              className="inline-block text-xl sm:text-2xl font-bold tracking-tight text-white"
              animate={{
                color: '#ffffff',
              }}
            >
              {name}
            </motion.h2>
            <motion.div
              layout
              className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5 font-mono"
              animate={{ color: expand ? '#e4e4e7' : '#a1a1aa' }}
            >
              <p className="tracking-tight">{phone}</p>
              <span>•</span>
              <p>{username}</p>
            </motion.div>
          </motion.div>

          {children && (
            <motion.div
              layout
              className={`relative z-20 w-full mt-3 ${expand ? 'text-left' : 'text-center'}`}
            >
              {children}
            </motion.div>
          )}

          <AnimatePresence>
            {expand && (
              <motion.button
                type="button"
                layoutId="user-avatar"
                className="absolute inset-0 -z-10 aspect-square overflow-hidden cursor-pointer w-full h-full"
                style={{ borderRadius: 0 }}
                onClick={() => setExpand(!expand)}
                title="Click to collapse"
              >
                {isImageSrc ? (
                  <Image
                    src={avatar}
                    alt={name}
                    fill
                    unoptimized
                    priority
                    className="pointer-events-none h-full w-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-950 text-8xl">
                    {avatar || '👨‍🎓'}
                  </div>
                )}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10"
                />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.header>
      </div>
    </MotionConfig>
  );
}

export default TelegramHeader;
