import React, { useState, useEffect, useRef, useCallback } from 'react';
import { audioPlayer, TIFFANY_DAY_TRACKS, TrackInfo } from './audioEngine';
import { usePageViews } from './usePageViews';

interface StickerItem {
  id: string;
  name: string;
  src: string;
  alt: string;
  initialSide: 'left' | 'right';
  top: number;
  rot: number;
  soundType: 'boing' | 'bubble' | 'sparkle' | 'wave';
  pitch: number;
}

const STICKERS_DATA: StickerItem[] = [
  {
    id: 'owl',
    name: 'Safety Owl',
    src: './stickers/owl.webp',
    alt: 'Late Night Combat Robotics Safety Goggles Owl Sticker',
    initialSide: 'left',
    top: 130,
    rot: -5,
    soundType: 'boing',
    pitch: 0.95,
  },
  {
    id: 'hibiscus',
    name: 'Hawaii Hibiscus',
    src: './stickers/hibiscus.webp',
    alt: 'Tropical Hawaii Hibiscus Flower Sticker with Dewdrops',
    initialSide: 'left',
    top: 380,
    rot: 8,
    soundType: 'bubble',
    pitch: 1.25,
  },
  {
    id: 'pipeline',
    name: 'Banzai Pipeline',
    src: './stickers/pipeline.webp',
    alt: 'Banzai Pipeline Surfing Tube Wave Sticker',
    initialSide: 'left',
    top: 640,
    rot: -6,
    soundType: 'wave',
    pitch: 1.1,
  },
  {
    id: 'moon',
    name: 'Late Night Moon',
    src: './stickers/moon.webp',
    alt: 'Smiling Late Night Crescent Moon Glass Sticker',
    initialSide: 'right',
    top: 130,
    rot: 6,
    soundType: 'sparkle',
    pitch: 1.45,
  },
  {
    id: 'palm',
    name: 'Tropical Island Orb',
    src: './stickers/palm.webp',
    alt: 'Hawaiian Island and Palm Tree Glass Bubble Sticker',
    initialSide: 'right',
    top: 380,
    rot: -5,
    soundType: 'bubble',
    pitch: 0.85,
  },
  {
    id: 'owl-surfer',
    name: 'Pipeline Owl Surfer',
    src: './stickers/owl-surfer.webp',
    alt: 'Funny Night Owl Surfing on a Surfboard Sticker',
    initialSide: 'right',
    top: 640,
    rot: 7,
    soundType: 'boing',
    pitch: 1.35,
  },
];

const BUBBLES = [
  { size: 36, left: 6, duration: 12, delay: 0, sway: '25px' },
  { size: 22, left: 18, duration: 15, delay: 3, sway: '-20px' },
  { size: 52, left: 32, duration: 18, delay: 1, sway: '35px' },
  { size: 18, left: 45, duration: 14, delay: 6, sway: '-15px' },
  { size: 44, left: 58, duration: 16, delay: 2, sway: '28px' },
  { size: 28, left: 71, duration: 13, delay: 5, sway: '-30px' },
  { size: 60, left: 84, duration: 20, delay: 0.5, sway: '40px' },
  { size: 24, left: 93, duration: 11, delay: 4, sway: '-22px' },
];

const STARS = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: (i * 3.65 + (i % 5) * 2.3) % 98,
  top: (i * 4.2 + (i % 7) * 3.1) % 65,
  delay: ((i * 0.37) % 3).toFixed(1),
  size: i % 3 === 0 ? 3 : 2,
}));

interface FruityDecorProps {
  seriousMode: boolean;
  onToggleSeriousMode: () => void;
}

export const FruityDecor: React.FC<FruityDecorProps> = ({
  seriousMode,
  onToggleSeriousMode,
}) => {
  const [boingId, setBoingId] = useState<string | null>(null);
  const [positions, setPositions] = useState<{ [id: string]: { x: number; y: number } }>({});

  const dragRef = useRef<{
    id: string | null;
    startX: number;
    startY: number;
    elemStartX: number;
    elemStartY: number;
    hasMoved: boolean;
  }>({
    id: null,
    startX: 0,
    startY: 0,
    elemStartX: 0,
    elemStartY: 0,
    hasMoved: false,
  });

  const sparkleContainerRef = useRef<HTMLDivElement | null>(null);
  const lastSparkleRef = useRef<number>(0);

  // Sparkle cursor trail
  useEffect(() => {
    if (seriousMode) return;

    const sparkles = ['✨', '⭐', '💫', '✦', '🌺', '💖'];
    const colors = ['#38bdf8', '#4ade80', '#f472b6', '#facc15', '#a78bfa', '#22d3ee'];

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastSparkleRef.current < 55) return;
      lastSparkleRef.current = now;

      const container = sparkleContainerRef.current;
      if (!container) return;

      const star = document.createElement('span');
      star.className = 'fa-sparkle';
      const char = sparkles[Math.floor(Math.random() * sparkles.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const dx = (Math.random() * 40 - 20).toFixed(0);
      const size = Math.floor(Math.random() * 10 + 12);

      star.textContent = char;
      star.style.left = `${e.clientX}px`;
      star.style.top = `${e.clientY}px`;
      star.style.color = color;
      star.style.fontSize = `${size}px`;
      star.style.setProperty('--dx', `${dx}px`);

      container.appendChild(star);
      setTimeout(() => {
        star.remove();
      }, 820);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [seriousMode]);

  // Dragging support for stickers
  const handlePointerDown = (id: string, e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      elemStartX: rect.left,
      elemStartY: rect.top,
      hasMoved: false,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.id) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      drag.hasMoved = true;
    }

    setPositions((prev) => ({
      ...prev,
      [drag.id!]: {
        x: drag.elemStartX + dx,
        y: drag.elemStartY + dy,
      },
    }));
  }, []);

  const handlePointerUp = (id: string, e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag.id === id) {
      if (!drag.hasMoved) {
        setBoingId(id);
        const item = STICKERS_DATA.find((s) => s.id === id);
        if (item) {
          audioPlayer.playStickerPop(item.pitch, item.soundType);
        } else {
          audioPlayer.playStickerPop(1.0, 'boing');
        }
        setTimeout(() => setBoingId(null), 700);
      }
      drag.id = null;
    }
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  return (
    <>
      {/* Floating Side Toggle Button */}
      <button
        type="button"
        onClick={onToggleSeriousMode}
        className="fa-toggle"
        title={seriousMode ? 'Enable 2000s Frutiger Aero aesthetic' : 'Reset UI to normal (Serious Mode)'}
        aria-label="Toggle Frutiger Aero Theme"
      >
        {!seriousMode ? '✨ AERO 2000s: ON' : 'SERIOUS MODE: ON'}
      </button>

      {!seriousMode && (
        <>
          {/* Sparkle cursor trail container */}
          <div ref={sparkleContainerRef} className="fa-sparkle-layer" aria-hidden="true" />

          {/* Scrolling Dolphin-Owl Surfing Wallpaper */}
          <div className="fa-wallpaper" aria-hidden="true" />

          {/* Background Atmosphere */}
          <div className="fa-bg" aria-hidden="true">
            <div className="fa-swoosh fa-swoosh--a" />
            <div className="fa-swoosh fa-swoosh--b" />
            <div className="fa-ground" />

            {/* Rising glassy bubbles */}
            {BUBBLES.map((b, i) => (
              <div
                key={i}
                className="fa-bubble"
                style={
                  {
                    width: b.size,
                    height: b.size,
                    left: `${b.left}%`,
                    animationDuration: `${b.duration}s`,
                    animationDelay: `${b.delay}s`,
                    '--sway': b.sway,
                  } as React.CSSProperties
                }
              />
            ))}

            {/* Night sky twinkling stars */}
            {STARS.map((s) => (
              <div
                key={s.id}
                className="fa-star"
                style={{
                  left: `${s.left}%`,
                  top: `${s.top}%`,
                  width: s.size,
                  height: s.size,
                  animationDelay: `${s.delay}s`,
                }}
              />
            ))}
          </div>

          {/* Interactive Floating Stickers */}
          <aside className="fa-sticker-layer" aria-label="Frutiger Aero Stickers">
            {STICKERS_DATA.map((s, idx) => {
              const customPos = positions[s.id];
              const isBoing = boingId === s.id;

              const style: React.CSSProperties & Record<string, string | number> = customPos
                ? {
                    left: customPos.x,
                    top: customPos.y,
                    right: 'auto',
                    '--rot': `${s.rot}deg`,
                    '--delay': `${idx * 0.4}s`,
                  }
                : {
                    top: s.top,
                    '--rot': `${s.rot}deg`,
                    '--delay': `${idx * 0.4}s`,
                  };

              const sideClass = s.initialSide === 'left' ? 'fa-sticker--left' : 'fa-sticker--right';

              return (
                <div
                  key={s.id}
                  className={`fa-sticker ${!customPos ? sideClass : ''} ${isBoing ? 'fa-boing' : ''}`}
                  style={style}
                  onPointerDown={(e) => handlePointerDown(s.id, e)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={(e) => handlePointerUp(s.id, e)}
                  title={`${s.name} (Drag me anywhere or click to boing!)`}
                  role="img"
                  aria-label={s.alt}
                >
                  <img src={s.src} alt={s.alt} draggable={false} />
                </div>
              );
            })}
          </aside>
        </>
      )}
    </>
  );
};

export const FruityMySpaceBar: React.FC<{ seriousMode: boolean }> = ({ seriousMode }) => {
  const { formattedDigits, isCloudflare } = usePageViews();
  const [isPlaying, setIsPlaying] = useState<boolean>(() => audioPlayer.getIsPlaying());

  useEffect(() => {
    return audioPlayer.onPlayStateChange((playing) => {
      setIsPlaying(playing);
    });
  }, []);

  const [currentTrack, setCurrentTrack] = useState<TrackInfo>(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('lncr_music_track');
      if (savedId) {
        const found = TIFFANY_DAY_TRACKS.find((t) => t.id === savedId);
        if (found) {
          audioPlayer.selectTrack(found.id);
          return found;
        }
      }
    }
    return audioPlayer.getCurrentTrack();
  });

  // Handle track display and seamless background autoplay
  useEffect(() => {
    if (seriousMode) {
      audioPlayer.pause();
      return;
    }

    const unsubTrack = (t: TrackInfo) => {
      setCurrentTrack(t);
      try {
        localStorage.setItem('lncr_music_track', t.id);
      } catch {}
    };

    const unsub = audioPlayer.onTrackChange(unsubTrack);
    audioPlayer.play().catch(() => {});

    return () => {
      unsub();
    };
  }, [seriousMode]);

  if (seriousMode) return null;

  return (
    <div className="fa-myspace" role="region" aria-label="LNCR 2000s MySpace Profile Banner">
      <div className="fa-myspace-inner">
        {/* Profile Avatar inside glossy glass bubble */}
        <div className="fa-pfp" title="LNCR Profile Avatar">
          <img src="./stickers/owl.webp" alt="LNCR mascot owl" />
        </div>

        {/* Profile Details */}
        <div className="fa-profile">
          <div className="flex items-center gap-2">
            <span className="fa-name">Late Night Combat Robotics</span>
            <span className="fa-online" title="Online right now!">
              ● ONLINE!
            </span>
          </div>
          <span className="fa-mood">
            Mood: <strong>Jamming to Kevin MacLeod - Cipher 🎵 2000s Web Anthem 🌸🤙</strong>
          </span>
          <span className="text-[10px] text-[#64748B] dark:text-[#8fd2ee] fa-hide-sm">
            &quot;In your extended combat robotics network&quot;
          </span>
        </div>

        {/* Scrolling Glitter Marquee */}
        <div className="fa-marquee">
          <div className="fa-marquee-track">
            <div className="fa-marquee-item">
              <span className="fa-glitter">
                ✨ Thanks 4 the Add! ✨ 🎵 Now Playing: Kevin MacLeod - Cipher (2000s Royalty Free Web Anthem) 💿 Dial in your Weapon Tip Speed, MOI, Spin-Up & Drivetrain! ⚔️ SPARC v1.7 Compliant 🌺 Aloha! 🐬🦉 🏄‍♂️ 🤙
              </span>
            </div>
            <div className="fa-marquee-item">
              <span className="fa-glitter">
                ✨ Thanks 4 the Add! ✨ 🎵 Now Playing: Kevin MacLeod - Cipher (2000s Royalty Free Web Anthem) 💿 Dial in your Weapon Tip Speed, MOI, Spin-Up & Drivetrain! ⚔️ SPARC v1.7 Compliant 🌺 Aloha! 🐬🦉 🏄‍♂️ 🤙
              </span>
            </div>
          </div>
        </div>

        {/* Retro 2000s Audio Player Widget */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-white/80 dark:border-cyan-500/30 shadow-xs shrink-0">
          <button
            onClick={() => audioPlayer.togglePlayPause()}
            className="w-7 h-7 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            title={isPlaying ? 'Pause Cipher.mp3' : 'Play Cipher.mp3'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <div className="flex flex-col text-[10px] leading-tight">
            <span className="font-extrabold text-cyan-800 dark:text-cyan-300">Kevin MacLeod</span>
            <span className="text-slate-500 dark:text-slate-400 font-medium">Cipher (2000s Anthem)</span>
          </div>
        </div>

        {/* Retro MySpace Cloudflare Hit Counter */}
        <div className="fa-stats">
          <div className="flex items-center gap-1.5" title={isCloudflare ? 'Live Cloudflare KV Visitor Counter' : 'Page Views Counter'}>
            <span className="text-[10px] font-bold text-[#64748B] dark:text-[#8fd2ee] flex items-center gap-1">
              {isCloudflare && <span className="text-orange-500 font-bold" title="Cloudflare KV Verified">⚡</span>}
              PAGE VIEWS:
            </span>
            <div className="fa-odometer" aria-label="Page views hit counter">
              {formattedDigits.map((digit, i) => (
                <span key={i} className="fa-digit">
                  {digit}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
