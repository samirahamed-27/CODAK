'use client';

import React, {
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from 'react';
import {
  motion,
  AnimatePresence,
  MotionConfig,
  Transition,
  Variant,
} from 'motion/react';
import { cn } from '@/lib/utils';
import { XIcon, Plus, ArrowRight } from 'lucide-react';

interface DialogContextType {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  uniqueId: string;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

const DialogContext = React.createContext<DialogContextType | null>(null);

function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}

type DialogProviderProps = {
  children: React.ReactNode;
  transition?: Transition;
};

function DialogProvider({ children, transition }: DialogProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const uniqueId = useId();
  const triggerRef = useRef<HTMLDivElement | null>(null);

  const contextValue = useMemo(
    () => ({ isOpen, setIsOpen, uniqueId, triggerRef }),
    [isOpen, uniqueId]
  );

  return (
    <DialogContext.Provider value={contextValue}>
      <MotionConfig transition={transition}>{children}</MotionConfig>
    </DialogContext.Provider>
  );
}

type DialogProps = {
  children: React.ReactNode;
  transition?: Transition;
};

function Dialog({ children, transition }: DialogProps) {
  return (
    <DialogProvider transition={transition}>
      <MotionConfig transition={transition}>{children}</MotionConfig>
    </DialogProvider>
  );
}

type DialogTriggerProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  triggerRef?: React.RefObject<HTMLDivElement | null>;
};

function DialogTrigger({
  children,
  className,
  style,
  triggerRef,
}: DialogTriggerProps) {
  const { setIsOpen, isOpen, uniqueId } = useDialog();

  const handleClick = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen, setIsOpen]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setIsOpen(!isOpen);
      }
    },
    [isOpen, setIsOpen]
  );

  return (
    <motion.div
      ref={triggerRef}
      layoutId={`dialog-${uniqueId}`}
      className={cn('relative cursor-pointer', className)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={style}
      role="button"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-controls={`dialog-content-${uniqueId}`}
    >
      {children}
    </motion.div>
  );
}

type DialogContentProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

function DialogContent({ children, className, style }: DialogContentProps) {
  const { setIsOpen, isOpen, uniqueId, triggerRef } = useDialog();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [firstFocusableElement, setFirstFocusableElement] =
    useState<HTMLElement | null>(null);
  const [lastFocusableElement, setLastFocusableElement] =
    useState<HTMLElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
      if (event.key === 'Tab') {
        if (!firstFocusableElement || !lastFocusableElement) return;

        if (event.shiftKey) {
          if (document.activeElement === firstFocusableElement) {
            event.preventDefault();
            lastFocusableElement.focus();
          }
        } else {
          if (document.activeElement === lastFocusableElement) {
            event.preventDefault();
            firstFocusableElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [setIsOpen, firstFocusableElement, lastFocusableElement]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('overflow-hidden');
      const focusableElements = containerRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements && focusableElements.length > 0) {
        setFirstFocusableElement(focusableElements[0] as HTMLElement);
        setLastFocusableElement(
          focusableElements[focusableElements.length - 1] as HTMLElement
        );
        (focusableElements[0] as HTMLElement).focus();
      }
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    } else {
      document.body.classList.remove('overflow-hidden');
      triggerRef.current?.focus();
    }
  }, [isOpen, triggerRef]);

  return (
    <motion.div
      ref={containerRef}
      layoutId={`dialog-${uniqueId}`}
      className={cn('overflow-hidden', className)}
      style={style}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`dialog-title-${uniqueId}`}
      aria-describedby={`dialog-description-${uniqueId}`}
    >
      {children}
    </motion.div>
  );
}

type DialogContainerProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

function DialogContainer({ children, className }: DialogContainerProps) {
  const { isOpen, setIsOpen, uniqueId } = useDialog();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      window.scrollTo(0, 0);
    }
    setMounted(true);
    return () => setMounted(false);
  }, [isOpen]);

  if (!mounted) return null;
  return (
    <AnimatePresence initial={false} mode="sync">
      {isOpen && (
        <>
          <motion.div
            key={`backdrop-${uniqueId}`}
            className="fixed inset-0 h-full z-50 w-full bg-black/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />
          <div className={cn(`fixed inset-0 z-50 flex items-center justify-center p-4`, className)}>
            {children}
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

type DialogTitleProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

function DialogTitle({ children, className, style }: DialogTitleProps) {
  const { uniqueId } = useDialog();

  return (
    <motion.div
      layoutId={`dialog-title-container-${uniqueId}`}
      className={className}
      style={style}
      layout
    >
      {children}
    </motion.div>
  );
}

type DialogSubtitleProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

function DialogSubtitle({ children, className, style }: DialogSubtitleProps) {
  const { uniqueId } = useDialog();

  return (
    <motion.div
      layoutId={`dialog-subtitle-container-${uniqueId}`}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

type DialogDescriptionProps = {
  children: React.ReactNode;
  className?: string;
  disableLayoutAnimation?: boolean;
  variants?: {
    initial: Variant;
    animate: Variant;
    exit: Variant;
  };
};

function DialogDescription({
  children,
  className,
  variants,
  disableLayoutAnimation,
}: DialogDescriptionProps) {
  const { uniqueId } = useDialog();

  return (
    <motion.div
      key={`dialog-description-${uniqueId}`}
      layoutId={
        disableLayoutAnimation
          ? undefined
          : `dialog-description-content-${uniqueId}`
      }
      variants={variants}
      className={className}
      initial="initial"
      animate="animate"
      exit="exit"
      id={`dialog-description-${uniqueId}`}
    >
      {children}
    </motion.div>
  );
}

type DialogImageProps = {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
};

function DialogImage({ src, alt, className, style }: DialogImageProps) {
  const { uniqueId } = useDialog();

  return (
    <motion.img
      src={src}
      alt={alt}
      className={cn(className)}
      layoutId={`dialog-img-${uniqueId}`}
      style={style}
    />
  );
}

type DialogCloseProps = {
  children?: React.ReactNode;
  className?: string;
  variants?: {
    initial: Variant;
    animate: Variant;
    exit: Variant;
  };
};

function DialogClose({ children, className, variants }: DialogCloseProps) {
  const { setIsOpen, uniqueId } = useDialog();

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  return (
    <motion.button
      onClick={handleClose}
      type="button"
      aria-label="Close dialog"
      key={`dialog-close-${uniqueId}`}
      className={cn('absolute right-6 top-6', className)}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
    >
      {children || <XIcon size={24} />}
    </motion.button>
  );
}

export interface ComponentItem {
  id: number | string;
  url: { src: string };
  title: string;
  subtitle?: string;
  description: string;
  tags?: string[];
  playAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export interface ComponentProps {
  items: ComponentItem[];
  className?: string;
}

const Component = forwardRef<HTMLDivElement, ComponentProps>(({ items, className }, ref) => {
  return (
    <div ref={ref} className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full', className)}>
      {items.map((item) => {
        return (
          <React.Fragment key={item.id}>
            <Dialog
              transition={{
                type: 'spring',
                bounce: 0.05,
                duration: 0.5,
              }}
            >
              <DialogTrigger
                style={{
                  borderRadius: '16px',
                }}
                className="group flex w-full flex-col overflow-hidden border border-white/10 bg-[#0B0F19] hover:border-sky-400/50 hover:bg-[#101726] transition-all duration-300 shadow-xl shadow-black/40"
              >
                <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-950">
                  <DialogImage
                    src={item.url.src}
                    alt={item.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-transparent to-transparent opacity-90" />
                </div>
                <div className="relative flex flex-grow flex-row items-end justify-between p-4 -mt-6 z-10">
                  <div className="pr-2">
                    {item.subtitle && (
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400 block mb-0.5">
                        {item.subtitle}
                      </span>
                    )}
                    <DialogTitle className="text-white text-base sm:text-lg font-bold tracking-tight">
                      {item.title}
                    </DialogTitle>
                  </div>
                  <div className="p-2 bg-white/10 group-hover:bg-sky-400 group-hover:text-black rounded-full text-white transition-all shadow-md shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              </DialogTrigger>

              <DialogContainer className="pt-10 sm:pt-16 pb-10">
                <DialogContent
                  style={{
                    borderRadius: '24px',
                  }}
                  className="relative flex h-full max-h-[85vh] mx-auto flex-col overflow-y-auto border border-white/15 bg-[#090D17] text-white shadow-2xl lg:w-[850px] w-full"
                >
                  <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-slate-950 shrink-0">
                    <DialogImage
                      src={item.url.src}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#090D17] via-transparent to-transparent opacity-90" />
                  </div>

                  <div className="p-6 sm:p-8 flex-1">
                    {item.subtitle && (
                      <DialogSubtitle className="text-xs font-mono font-bold uppercase tracking-widest text-sky-400 mb-1">
                        {item.subtitle}
                      </DialogSubtitle>
                    )}
                    <DialogTitle className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                      {item.title}
                    </DialogTitle>

                    <DialogDescription
                      disableLayoutAnimation
                      variants={{
                        initial: { opacity: 0, scale: 0.95, y: -20 },
                        animate: { opacity: 1, scale: 1, y: 0 },
                        exit: { opacity: 0, scale: 0.95, y: -20 },
                      }}
                    >
                      <p className="mt-4 text-sm sm:text-base leading-relaxed text-zinc-300">
                        {item.description}
                      </p>

                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-5">
                          {item.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 text-xs font-mono rounded-lg bg-sky-500/10 border border-sky-400/20 text-sky-300"
                            >
                              {tag.replace(/^#/, '')}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Play Option after the info */}
                      {(item.playAction || item.secondaryAction) && (
                        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div>
                            <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold block">
                              Interactive Play & Challenge
                            </span>
                            <span className="text-xs text-zinc-400">
                              Launch the game arena, complete quests, and claim verifiable XP
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2.5">
                            {item.playAction &&
                              (item.playAction.href ? (
                                <a
                                  href={item.playAction.href}
                                  onClick={item.playAction.onClick}
                                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-300 hover:to-sky-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-sky-500/25 active:scale-95"
                                >
                                  <span>{item.playAction.label}</span>
                                  <ArrowRight className="w-4 h-4" />
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  onClick={item.playAction.onClick}
                                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-300 hover:to-sky-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-sky-500/25 active:scale-95"
                                >
                                  <span>{item.playAction.label}</span>
                                  <ArrowRight className="w-4 h-4" />
                                </button>
                              ))}
                            {item.secondaryAction &&
                              (item.secondaryAction.href ? (
                                <a
                                  href={item.secondaryAction.href}
                                  onClick={item.secondaryAction.onClick}
                                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-200 font-bold text-xs font-mono transition-all active:scale-95"
                                >
                                  <span>{item.secondaryAction.label}</span>
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  onClick={item.secondaryAction.onClick}
                                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-200 font-bold text-xs font-mono transition-all active:scale-95"
                                >
                                  <span>{item.secondaryAction.label}</span>
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </DialogDescription>
                  </div>
                  <DialogClose className="text-white bg-slate-900/80 border border-white/20 p-2.5 hover:bg-sky-500 hover:text-black rounded-full shadow-xl transition-all" />
                </DialogContent>
              </DialogContainer>
            </Dialog>
          </React.Fragment>
        );
      })}
    </div>
  );
});

Component.displayName = 'LinearCard';

export default Component;
export { Component as LinearCard };

export {
  Dialog,
  DialogTrigger,
  DialogContainer,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogSubtitle,
  DialogDescription,
  DialogImage,
};
