import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useClerk, useUser } from '@clerk/react';
import { getHealthCheckQueryKey, useGenerateMoodboard, useHealthCheck } from '@workspace/api-client-react';
import type { Moodboard, MoodboardTile } from '@workspace/api-client-react';
import { ArrowRight, Check, Clipboard, Download, History, LayoutDashboard, LogOut, Menu, RefreshCw, SlidersHorizontal, UserRound, X } from 'lucide-react';
import { Link } from 'wouter';

const STYLE_OPTIONS = ['quiet luxury', 'raw & tactile', 'cinematic', 'sun-washed', 'editorial', 'strange & tender'];
const BOARD_TYPE_OPTIONS: Array<{ value: 'moodboard' | 'brandboard'; label: string; copy: string }> = [
  { value: 'moodboard', label: 'Moodboard', copy: 'A visual reference collage of real photos, color, and tone.' },
  { value: 'brandboard', label: 'Brand board', copy: 'A structured identity board \u2014 logo direction, typography, palette, voice.' },
];
const LAYOUT_OPTIONS = ['Asymmetric collage', 'Clean grid', 'Scrapbook stack', 'Structured brand grid'];
const IMAGE_COUNT_OPTIONS = [3, 4, 5, 6, 8, 10];
const BRAND_ETHOS_OPTIONS = ['vintage', 'classy', 'modern', 'sophisticated', 'playful', 'edgy'];

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    if (typeof data === 'object' && data && 'error' in data) return String((data as { error?: string }).error);
  }
  if (typeof error === 'object' && error && 'error' in error) return String((error as { error?: string }).error);
  return 'The studio could not complete that pass. Try the thought again.';
}

function BriefCard({
  step,
  boardType,
  setBoardType,
  purpose,
  setPurpose,
  logoDescription,
  setLogoDescription,
  logoImageDataUrl,
  setLogoImageDataUrl,
  layoutStyle,
  setLayoutStyle,
  imageCount,
  setImageCount,
  styles,
  toggleStyle,
  onAdvance,
  onGenerate,
  isExiting,
  isEntering,
  isGenerating,
  error,
}: {
  step: number;
  boardType: 'moodboard' | 'brandboard' | null;
  setBoardType: (value: 'moodboard' | 'brandboard') => void;
  purpose: string;
  setPurpose: (value: string) => void;
  logoDescription: string;
  setLogoDescription: (value: string) => void;
  logoImageDataUrl: string | null;
  setLogoImageDataUrl: (value: string | null) => void;
  layoutStyle: string;
  setLayoutStyle: (value: string) => void;
  imageCount: number;
  setImageCount: (value: number) => void;
  styles: string[];
  toggleStyle: (style: string) => void;
  onAdvance: () => void;
  onGenerate: () => void;
  isExiting: boolean;
  isEntering: boolean;
  isGenerating: boolean;
  error: unknown;
}) {
  const isBrand = boardType === 'brandboard';
  const [notice, setNotice] = useState('');
  const advance = () => {
    if (step === 1 && !boardType) {
      setNotice('Choose a board type to continue.');
      return;
    }
    if (step === 2 && purpose.trim().length < 3) {
      setNotice(isBrand ? 'Describe the brand a little more \u2014 three characters is enough.' : 'Give the idea a little more room \u2014 three characters is enough.');
      return;
    }
    if (step === 3 && isBrand && logoDescription.trim().length < 3 && !logoImageDataUrl) {
      setNotice('Describe the logo or attach an image to continue.');
      return;
    }
    if (step === 3 && !isBrand && !layoutStyle) {
      setNotice('Pick a layout to continue.');
      return;
    }
    if (step === 4 && styles.length === 0) {
      setNotice(isBrand ? 'Choose at least one ethos word.' : 'Choose at least one visual instinct.');
      return;
    }
    setNotice('');
    onAdvance();
  };
  const handleLogoFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoImageDataUrl(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
  };

  return (
    <div className={`flashcard ${isExiting ? 'exit' : isEntering ? 'entering' : ''} relative w-full max-w-[620px]`} data-testid={`card-brief-step-${step}`}>
      <div className="absolute inset-x-5 -bottom-3 top-4 rotate-[2deg] border border-[#390404]/20 bg-[#fef7e5]/80" />
      <div className="absolute inset-x-2 -bottom-1 top-2 rotate-[-1.2deg] border border-[#13273f]/20 bg-[#fef7e5]/70" />
      <div className="relative border border-[#13273f]/30 bg-[#fef7e5]/95 p-7 shadow-[0_22px_50px_rgba(38,61,73,.18)] sm:p-12">
        <div className="flex items-center justify-between border-b border-[#390404]/20 pb-4">
          <span className="eyebrow text-[#788240]">{step === 0 ? 'A note before we begin' : `Fragment 0${step}`}</span>
          <span className="text-[11px] font-bold text-[#13273f]">{step + 1} / 5</span>
        </div>
        {step === 0 && (
            <div className="py-10 sm:py-12">
            <h1 className="serif italic max-w-[530px] text-[clamp(2.8rem,6vw,5rem)] leading-[.9] tracking-[-.06em] text-[#13273f]">Let the first thought be <em>unfinished.</em></h1>
            <p className="mt-7 max-w-[430px] text-[14px] leading-7 text-[#13273f]">We will turn a hunch into a visual direction. There is no right answer here, only what keeps catching your eye.</p>
          </div>
        )}
        {step === 1 && (
          <div className="py-10 sm:py-12">
            <h2 className="serif italic max-w-[530px] text-[clamp(2.35rem,5.5vw,4.5rem)] leading-[.95] tracking-[-.06em] text-[#13273f]">What are you <em>building?</em></h2>
            <p className="mt-5 max-w-[390px] text-[13px] leading-6 text-[#13273f]">Choose the kind of board that fits what you need right now.</p>
            <div className="mt-9 grid gap-3 sm:grid-cols-2">
              {BOARD_TYPE_OPTIONS.map((option) => {
                const selected = boardType === option.value;
                return (
                  <button type="button" key={option.value} onClick={() => setBoardType(option.value)} className={`rounded-lg border p-4 text-left transition-all ${selected ? 'border-[#13273f] bg-[#13273f] text-[#fef7e5]' : 'border-[#13273f]/30 text-[#13273f] hover:-translate-y-0.5 hover:border-[#788240]'}`} data-testid={`button-board-type-${option.value}`} aria-pressed={selected}>
                    <span className="flex items-center gap-2 text-[13px] font-bold">{selected && <Check size={14} />}{option.label}</span>
                    <span className={`mt-1.5 block text-[11px] leading-5 ${selected ? 'text-[#fef7e5]/75' : 'text-[#13273f]/80'}`}>{option.copy}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="py-10 sm:py-12">
            <label htmlFor="purpose" className="serif italic block max-w-[560px] text-[clamp(2.35rem,5.5vw,4.5rem)] leading-[.95] tracking-[-.06em] text-[#13273f]">{isBrand ? <>Describe your <em>brand.</em></> : <>What are you <em>making?</em></>}</label>
            <p className="mt-5 max-w-[360px] text-[13px] leading-6 text-[#13273f]">{isBrand ? 'What does it do, who is it for, what does it stand for?' : 'A sentence, a secret, a working title. Follow the thread rather than polishing it.'}</p>
            <textarea id="purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder={isBrand ? 'Our brand is...' : 'I want to make...'} rows={3} className="mt-9 w-full resize-none border-0 border-b border-[#13273f]/35 bg-transparent px-0 py-3 text-[18px] leading-7 text-[#13273f] outline-none placeholder:text-[#13273f]/50 focus:border-[#788240]" data-testid="input-purpose" />
          </div>
        )}
        {step === 3 && isBrand && (
          <div className="py-10 sm:py-12">
            <h2 className="serif italic max-w-[530px] text-[clamp(2.35rem,5.5vw,4.5rem)] leading-[.95] tracking-[-.06em] text-[#13273f]">Insert the <em>logo.</em></h2>
            <p className="mt-5 max-w-[390px] text-[13px] leading-6 text-[#13273f]">Describe it, attach an image, or both.</p>
            <textarea value={logoDescription} onChange={(event) => setLogoDescription(event.target.value)} placeholder="Describe the logo..." rows={3} className="mt-8 w-full resize-none border-0 border-b border-[#13273f]/35 bg-transparent px-0 py-3 text-[16px] leading-7 text-[#13273f] outline-none placeholder:text-[#13273f]/50 focus:border-[#788240]" data-testid="input-logo-description" />
            <div className="mt-6 flex items-center gap-4">
              <label className="cursor-pointer rounded-full border border-[#13273f]/30 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[.14em] text-[#13273f] transition-colors hover:border-[#788240] hover:text-[#788240]" data-testid="input-logo-image">
                Attach image
                <input type="file" accept="image/*" className="hidden" onChange={(event) => handleLogoFile(event.target.files?.[0])} />
              </label>
              {logoImageDataUrl && (
                <span className="flex items-center gap-2 text-[12px] text-[#13273f]">
                  <img src={logoImageDataUrl} alt="Logo preview" className="h-10 w-10 rounded border border-[#13273f]/25 object-cover" />
                  <button type="button" onClick={() => setLogoImageDataUrl(null)} className="underline hover:text-[#788240]">remove</button>
                </span>
              )}
            </div>
          </div>
        )}
        {step === 3 && !isBrand && (
          <div className="py-10 sm:py-12">
            <h2 className="serif italic max-w-[530px] text-[clamp(2.35rem,5.5vw,4.5rem)] leading-[.95] tracking-[-.06em] text-[#13273f]">Pick a <em>layout.</em></h2>
            <p className="mt-5 max-w-[390px] text-[13px] leading-6 text-[#13273f]">How should the board be composed?</p>
            <div className="mt-9 flex flex-wrap gap-2.5">
              {LAYOUT_OPTIONS.map((option) => {
                const selected = layoutStyle === option;
                return (
                  <button type="button" key={option} onClick={() => setLayoutStyle(option)} className={`rounded-full border px-4 py-2.5 text-[12px] transition-all ${selected ? 'border-[#13273f] bg-[#13273f] text-[#fef7e5]' : 'border-[#13273f]/30 text-[#13273f] hover:-translate-y-0.5 hover:border-[#788240] hover:text-[#788240]'}`} data-testid={`button-layout-${option.replaceAll(' ', '-').toLowerCase()}`} aria-pressed={selected}>
                    {selected && <Check size={13} className="mr-1.5 inline" />}{option}
                  </button>
                );
              })}
            </div>
            <div className="mt-8 max-w-[260px] border-t border-[#13273f]/15 pt-6">
              <label htmlFor="image-count" className="block text-[11px] font-bold uppercase tracking-[.14em] text-[#13273f]">Number of images</label>
              <select id="image-count" value={imageCount} onChange={(event) => setImageCount(Number(event.target.value))} className="mt-3 w-full appearance-none border border-[#13273f]/30 bg-[#fef7e5]/40 px-4 py-2.5 text-[13px] text-[#13273f] outline-none focus:border-[#788240]" data-testid="select-image-count">
                {IMAGE_COUNT_OPTIONS.map((count) => <option key={count} value={count}>{count} images</option>)}
              </select>
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="py-10 sm:py-12">
            <h2 className="serif italic max-w-[530px] text-[clamp(2.35rem,5.5vw,4.5rem)] leading-[.95] tracking-[-.06em] text-[#13273f]">{isBrand ? <>The brand <em>ethos.</em></> : <>What is the <em>weather?</em></>}</h2>
            <p className="mt-5 max-w-[390px] text-[13px] leading-6 text-[#13273f]">{isBrand ? 'Which words already describe it? You can hold more than one.' : 'Choose the instincts that already belong to the idea. You can hold more than one.'}</p>
            <div className="mt-9 flex flex-wrap gap-2.5">
              {(isBrand ? BRAND_ETHOS_OPTIONS : STYLE_OPTIONS).map((style) => {
                const selected = styles.includes(style);
                return (
                  <button type="button" key={style} onClick={() => toggleStyle(style)} className={`rounded-full border px-4 py-2.5 text-[12px] transition-all ${selected ? 'border-[#13273f] bg-[#13273f] text-[#fef7e5]' : 'border-[#13273f]/30 text-[#13273f] hover:-translate-y-0.5 hover:border-[#788240] hover:text-[#788240]'}`} data-testid={`button-style-${style.replaceAll(' ', '-')}`} aria-pressed={selected}>
                  {selected && <Check size={13} className="mr-1.5 inline" />}{style}
                </button>
                );
              })}
            </div>
          </div>
        )}
        {notice && <p className="mb-5 text-[12px] font-medium text-[#a25242]" data-testid="status-brief-validation">{notice}</p>}
        {Boolean(error) && <p className="mb-5 border-l-2 border-[#a25242] pl-3 text-[12px] leading-5 text-[#a25242]" data-testid="status-generation-error">{getErrorMessage(error)}</p>}
        <div className="flex items-center justify-between border-t border-[#13273f]/20 pt-5">
          <span className="hidden text-[11px] uppercase tracking-[.14em] text-[#13273f]/70 sm:block">{step === 0 ? 'Take a breath' : step === 4 ? 'Trust your eye' : 'Keep it close'}</span>
          <button type="button" onClick={step === 4 ? onGenerate : advance} disabled={isGenerating} className="group ml-auto flex items-center gap-3 rounded-full bg-[#13273f] px-5 py-3 text-[11px] font-bold uppercase tracking-[.15em] text-[#fef7e5] transition-all hover:bg-[#788240] disabled:cursor-wait disabled:opacity-60" data-testid={step === 4 ? 'button-generate-moodboard' : 'button-advance-brief'}>
            {isGenerating ? 'Developing the board' : step === 4 ? 'Develop my board' : 'Continue'} {isGenerating ? <span className="loading-dashes" aria-hidden="true"><i /><i /><i /></span> : <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />}
          </button>
        </div>
      </div>
    </div>
  );
}



function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

function drawCoverImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 6) {
  const words = text.split(/\s+/);
  let line = '';
  let lines = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
      lines += 1;
      if (lines >= maxLines) return y;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
  return y + lineHeight;
}

function getExportColumns(layoutStyle: string) {
  if (layoutStyle === 'Clean grid') return 4;
  if (layoutStyle === 'Structured brand grid') return 2;
  return 3;
}

interface TileFrame { x: number; y: number; w: number; h: number; rotation?: number; }
const CANVAS_WIDTH = 1040;
const MIN_TILE_SIZE = 90;

function buildGridFrames(tileCount: number, layoutStyle: string): TileFrame[] {
  const cols = getExportColumns(layoutStyle);
  const gap = 14;
  const colW = (CANVAS_WIDTH - gap * (cols - 1)) / cols;
  const rowH = 190;
  const frames: TileFrame[] = [];
  for (let i = 0; i < tileCount; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    frames.push({ x: col * (colW + gap), y: row * (rowH + gap), w: colW, h: rowH });
  }
  return frames;
}

function buildAsymmetricFrames(tileCount: number): TileFrame[] {
  const cols = 3;
  const gap = 14;
  const colW = (CANVAS_WIDTH - gap * (cols - 1)) / cols;
  const rowUnit = 170;
  const spanPattern: Array<{ c: number; r: number }> = [
    { c: 2, r: 2 }, { c: 1, r: 1 }, { c: 1, r: 1 },
    { c: 1, r: 2 }, { c: 2, r: 1 }, { c: 1, r: 1 },
  ];
  const colHeights = new Array(cols).fill(0);
  const frames: TileFrame[] = [];
  for (let i = 0; i < tileCount; i += 1) {
    const span = spanPattern[i % spanPattern.length];
    const colSpan = Math.min(span.c, cols);
    let bestCol = 0;
    let bestHeight = Infinity;
    for (let start = 0; start <= cols - colSpan; start += 1) {
      const maxH = Math.max(...colHeights.slice(start, start + colSpan));
      if (maxH < bestHeight) { bestHeight = maxH; bestCol = start; }
    }
    const x = bestCol * (colW + gap);
    const y = bestHeight;
    const w = colW * colSpan + gap * (colSpan - 1);
    const h = rowUnit * span.r + gap * (span.r - 1);
    frames.push({ x, y, w, h });
    for (let c = bestCol; c < bestCol + colSpan; c += 1) {
      colHeights[c] = y + h + gap;
    }
  }
  return frames;
}

function buildScrapbookFrames(tileCount: number): TileFrame[] {
  const baseSize = 230;
  const cols = Math.ceil(Math.sqrt(tileCount));
  const spacingX = baseSize * 0.62;
  const spacingY = baseSize * 0.55;
  const frames: TileFrame[] = [];
  for (let i = 0; i < tileCount; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const jitterX = (Math.random() - 0.5) * 40;
    const jitterY = (Math.random() - 0.5) * 40;
    const sizeJitter = Math.random() * 60 - 20;
    const w = Math.max(MIN_TILE_SIZE, baseSize + sizeJitter);
    const h = Math.max(MIN_TILE_SIZE, baseSize + sizeJitter * 0.85);
    frames.push({
      x: col * spacingX + jitterX,
      y: row * spacingY + jitterY,
      w,
      h,
      rotation: Math.random() * 12 - 6,
    });
  }
  return frames;
}

function buildInitialFrames(tileCount: number, layoutStyle: string): TileFrame[] {
  if (layoutStyle === 'Scrapbook stack') return buildScrapbookFrames(tileCount);
  if (layoutStyle === 'Asymmetric collage') return buildAsymmetricFrames(tileCount);
  return buildGridFrames(tileCount, layoutStyle);
}

function buildBrandInitialFrames(): TileFrame[] {
  const gap = 14;
  const col3W = (CANVAS_WIDTH - gap * 2) / 3;
  const col2W = (CANVAS_WIDTH - gap) / 2;
  const row1H = 220;
  const row2H = 160;
  const row3H = 140;
  const row4H = 160;
  const row5H = 190;
  const row2Y = row1H + gap;
  const row3Y = row2Y + row2H + gap;
  const row4Y = row3Y + row3H + gap;
  const row5Y = row4Y + row4H * 2 + gap * 2;
  return [
    { x: 0, y: 0, w: CANVAS_WIDTH, h: row1H }, // 0 Logo direction
    { x: 0, y: row2Y, w: col3W, h: row2H }, // 1 Sticker mark
    { x: col3W + gap, y: row2Y, w: col3W, h: row2H }, // 2 Logo alt
    { x: (col3W + gap) * 2, y: row2Y, w: col3W, h: row2H }, // 3 Icon mark
    { x: 0, y: row4Y, w: col2W, h: row4H * 2 + gap }, // 4 Mockup
    { x: col2W + gap, y: row4Y, w: col2W, h: row4H }, // 5 Pattern
    { x: col2W + gap, y: row4Y + row4H + gap, w: col2W, h: row4H }, // 6 Fonts
    { x: 0, y: row5Y, w: col2W, h: row5H }, // 7 Mockup
    { x: col2W + gap, y: row5Y, w: col2W, h: row5H }, // 8 Mockup
    { x: 0, y: row3Y, w: CANVAS_WIDTH, h: row3H }, // 9 Palette
  ];
}

function FreeformFrame({ frame, onMove, onResize, onClick, children, testId }: {
  frame: TileFrame;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number) => void;
  onClick?: () => void;
  children: ReactNode;
  testId: string;
}) {
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeState = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);
  const movedRef = useRef(false);

  return (
    <div
      className="group absolute overflow-hidden border border-[#13273f]/25 bg-[#fef7e5] cursor-move select-none"
     style={{ left: frame.x, top: frame.y, width: frame.w, height: frame.h, transform: frame.rotation ? `rotate(${frame.rotation}deg)` : undefined }}
      data-testid={testId}
      onPointerDown={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest('[data-resize-handle]') || target.closest('[data-no-drag]')) return;
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        movedRef.current = false;
        dragState.current = { startX: event.clientX, startY: event.clientY, origX: frame.x, origY: frame.y };
      }}
      onPointerMove={(event) => {
        if (!dragState.current) return;
        const dx = event.clientX - dragState.current.startX;
        const dy = event.clientY - dragState.current.startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true;
        onMove(Math.max(0, dragState.current.origX + dx), Math.max(0, dragState.current.origY + dy));
      }}
      onPointerUp={() => { dragState.current = null; }}
      onClick={() => {
        if (movedRef.current) { movedRef.current = false; return; }
        onClick?.();
      }}
    >
      {children}
      <div
        data-resize-handle="true"
        className="absolute bottom-0 right-0 z-20 h-5 w-5 cursor-nwse-resize border-l-2 border-t-2 border-[#fef7e5] bg-[#13273f] opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        data-testid={`${testId}-resize-handle`}
        onPointerDown={(event) => {
          event.stopPropagation();
          (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
          resizeState.current = { startX: event.clientX, startY: event.clientY, origW: frame.w, origH: frame.h };
        }}
        onPointerMove={(event) => {
          if (!resizeState.current) return;
          event.stopPropagation();
          const dx = event.clientX - resizeState.current.startX;
          const dy = event.clientY - resizeState.current.startY;
          onResize(Math.max(MIN_TILE_SIZE, resizeState.current.origW + dx), Math.max(MIN_TILE_SIZE, resizeState.current.origH + dy));
        }}
        onPointerUp={(event) => { event.stopPropagation(); resizeState.current = null; }}
      />
    </div>
  );
}

function TileImageSearch({ onSelect }: { onSelect: (url: string) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ url: string; source: string }>>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number>();

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/moodboards/search-images?query=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(Array.isArray(data.results) ? data.results : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 450);
    return () => window.clearTimeout(debounceRef.current);
  }, [query]);

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search for an image..."
        className="w-full border border-[#fef7e5]/30 bg-transparent px-2 py-1.5 text-[10px] text-[#fef7e5] outline-none placeholder:text-[#fef7e5]/50 focus:border-[#788240]"
        data-testid="input-tile-search"
      />
      {loading && <p className="text-[9px] text-[#fef7e5]/50">Searching…</p>}
      {results.length > 0 && (
        <div className="grid max-h-28 grid-cols-4 gap-1.5 overflow-y-auto">
          {results.map((result, i) => (
            <button
              type="button"
              key={`${result.url}-${i}`}
              onClick={() => onSelect(result.url)}
              className="aspect-square overflow-hidden border border-[#fef7e5]/20 hover:border-[#788240]"
              data-testid={`button-search-result-${i}`}
            >
              <img src={result.url} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ImageReplacePanel({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) {
  const [mode, setMode] = useState<'menu' | 'search'>('menu');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ url: string; source: string }>>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number>();

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/moodboards/search-images?query=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(Array.isArray(data.results) ? data.results : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 450);
    return () => window.clearTimeout(debounceRef.current);
  }, [query]);

  const handleUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onSelect(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed bottom-5 left-5 z-50 w-[300px] border border-[#13273f]/30 bg-[#fef7e5] shadow-[0_12px_32px_rgba(38,61,73,.25)]" data-testid="panel-image-replace">
      <div className="flex items-center justify-between border-b border-[#13273f]/15 px-3 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#13273f]">
          {mode === 'menu' ? 'Replace image' : 'Search images'}
        </span>
        <button type="button" onClick={onClose} className="text-[#13273f]" data-testid="button-close-replace-panel"><X size={14} /></button>
      </div>
      <div className="p-3">
        {mode === 'menu' && (
          <div className="space-y-2">
            <button type="button" onClick={() => setMode('search')} className="block w-full border border-[#13273f]/30 px-3 py-2 text-left text-[11px] text-[#13273f] hover:border-[#788240] hover:text-[#788240]" data-testid="button-mode-search">
              New (search Cosmos)
            </button>
            <label className="block cursor-pointer border border-[#13273f]/30 px-3 py-2 text-left text-[11px] text-[#13273f] hover:border-[#788240] hover:text-[#788240]" data-testid="input-panel-upload">
              Upload your own
              <input type="file" accept="image/*" className="hidden" onChange={(event) => handleUpload(event.target.files?.[0])} />
            </label>
          </div>
        )}
        {mode === 'search' && (
          <div className="space-y-2">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search images..."
              autoFocus
              className="w-full border border-[#13273f]/30 bg-transparent px-2 py-1.5 text-[11px] text-[#13273f] outline-none placeholder:text-[#13273f]/50 focus:border-[#788240]"
              data-testid="input-tile-search"
            />
            {loading && <p className="text-[10px] text-[#13273f]/60">Searching…</p>}
            {results.length > 0 && (
              <div className="grid max-h-40 grid-cols-3 gap-1.5 overflow-y-auto">
                {results.map((result, i) => (
                  <button
                    type="button"
                    key={`${result.url}-${i}`}
                    onClick={() => onSelect(result.url)}
                    className="aspect-square overflow-hidden border border-[#13273f]/20 hover:border-[#788240]"
                    data-testid={`button-search-result-${i}`}
                  >
                    <img src={result.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
            <label className="block cursor-pointer border border-[#13273f]/30 px-3 py-2 text-center text-[10px] uppercase tracking-[.08em] text-[#13273f] hover:border-[#788240] hover:text-[#788240]" data-testid="input-panel-upload-fallback">
              Upload your own instead
              <input type="file" accept="image/*" className="hidden" onChange={(event) => handleUpload(event.target.files?.[0])} />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

function FreeformTile({ tile, index, frame, onMove, onResize, onImageChange, onDelete, onRequestReplace }: {
  tile: MoodboardTile;
  index: number;
  frame: TileFrame;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number) => void;
  onImageChange: (url: string) => void;
  onDelete: () => void;
  onRequestReplace: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <FreeformFrame frame={frame} onMove={onMove} onResize={onResize} onClick={() => setOpen((v) => !v)} testId={`card-moodboard-tile-${index}`}>
      <TileArt tile={tile} />
      {open && (
        <div data-no-drag className="absolute inset-0 z-30 flex flex-col justify-between gap-2 bg-[#13273f]/95 p-3 text-[#fef7e5]" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[.12em]">Edit tile</span>
            <button type="button" onClick={() => setOpen(false)} data-testid={`button-close-edit-${index}`}><X size={14} /></button>
          </div>
          <button type="button" onClick={() => { onRequestReplace(); setOpen(false); }} className="block w-full border border-[#fef7e5]/30 px-2 py-1.5 text-center text-[9px] uppercase tracking-[.08em] hover:bg-[#fef7e5]/10" data-testid={`button-replace-image-${index}`}>
            Replace image
          </button>
          <button type="button" onClick={onDelete} className="block w-full border border-[#a25242]/60 px-2 py-1.5 text-center text-[9px] uppercase tracking-[.08em] text-[#e0a598] hover:bg-[#a25242]/20" data-testid={`button-delete-tile-${index}`}>
            Delete tile
          </button>
          <p className="text-[9px] leading-4 text-[#fef7e5]/60">Drag the tile to move it. Drag the bottom-right corner to resize.</p>
        </div>
      )}
    </FreeformFrame>
  );
}
async function drawTileCell(ctx: CanvasRenderingContext2D, tile: MoodboardTile, x: number, y: number, w: number, h: number) {
  if (tile.type === 'image') {
    if (tile.imageUrl) {
      try {
        const img = await loadImageElement(tile.imageUrl);
        drawCoverImage(ctx, img, x, y, w, h);
      } catch {
        ctx.fillStyle = tile.accent ?? '#8295a0';
        ctx.fillRect(x, y, w, h);
      }
    } else {
      ctx.fillStyle = tile.accent ?? '#8295a0';
      ctx.fillRect(x, y, w, h);
    }
  } else if (tile.type === 'color') {
    ctx.fillStyle = tile.accent ?? tile.value ?? '#8295a0';
    ctx.fillRect(x, y, w, h);
  } else {
    ctx.fillStyle = '#fef7e5';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#390404';
    ctx.font = tile.type === 'quote' ? 'italic 19px Georgia, serif' : '15px Arial';
    wrapCanvasText(ctx, tile.value, x + 18, y + 40, w - 36, tile.type === 'quote' ? 26 : 22, 7);
  }
  ctx.fillStyle = 'rgba(38,61,73,0.88)';
  ctx.fillRect(x, y + h - 28, w, 28);
  ctx.fillStyle = '#fef7e5';
  ctx.font = 'bold 11px Arial';
  ctx.fillText(tile.label.toUpperCase(), x + 12, y + h - 9);
}

function drawPaletteCell(ctx: CanvasRenderingContext2D, board: Moodboard, x: number, y: number, w: number, h: number, perRow: number) {
  ctx.fillStyle = '#fef7e5';
  ctx.fillRect(x, y, w, h);
  const swatchSize = 26;
  const swatchGap = 10;
  board.palette.forEach((color, index) => {
    const sc = index % perRow;
    const sr = Math.floor(index / perRow);
    const sx = x + 16 + sc * (w / perRow);
    const sy = y + 40 + sr * (swatchSize + swatchGap + 20);
    ctx.fillStyle = color.hex;
    ctx.fillRect(sx, sy, swatchSize, swatchSize);
    ctx.fillStyle = '#13273f';
    ctx.font = 'bold 10px Arial';
    ctx.fillText(color.name, sx + swatchSize + 8, sy + 12);
    ctx.font = '9px Arial';
    ctx.fillStyle = '#390404';
    ctx.fillText(color.hex, sx + swatchSize + 8, sy + 24);
  });
  ctx.fillStyle = 'rgba(38,61,73,0.88)';
  ctx.fillRect(x, y + h - 28, w, 28);
  ctx.fillStyle = '#fef7e5';
  ctx.font = 'bold 11px Arial';
  ctx.fillText('PALETTE', x + 12, y + h - 9);
}

function drawHeader(ctx: CanvasRenderingContext2D, board: Moodboard, padding: number, width: number) {
  ctx.fillStyle = '#390404';
  ctx.fillRect(0, 0, width, ctx.canvas.height);
  ctx.fillStyle = '#13273f';
  ctx.font = 'bold 40px Georgia, serif';
  ctx.fillText(board.title, padding, padding + 42);
  ctx.font = '16px Arial';
  ctx.fillStyle = '#13273f';
  wrapCanvasText(ctx, board.tagline, padding, padding + 78, width - padding * 2, 22, 2);
}

async function renderFreeformBoardToCanvas(board: Moodboard, frames: TileFrame[]): Promise<HTMLCanvasElement> {
  const padding = 48;
  const headerH = 150;
  const contentWidth = Math.max(...frames.map((f) => f.x + f.w), CANVAS_WIDTH);
  const contentHeight = Math.max(...frames.map((f) => f.y + f.h), 400);
  const width = contentWidth + padding * 2;
  const height = contentHeight + padding * 2 + headerH;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  drawHeader(ctx, board, padding, width);

for (let i = 0; i < board.layout.length; i += 1) {
  const tile = board.layout[i];
  const frame = frames[i];
  if (!frame) continue;
  const px = padding + frame.x;
  const py = padding + headerH + frame.y;
  if (frame.rotation) {
    ctx.save();
    ctx.translate(px + frame.w / 2, py + frame.h / 2);
    ctx.rotate((frame.rotation * Math.PI) / 180);
    await drawTileCell(ctx, tile, -frame.w / 2, -frame.h / 2, frame.w, frame.h);
    ctx.restore();
  } else {
    await drawTileCell(ctx, tile, px, py, frame.w, frame.h);
  }
}
  const paletteFrame = frames[board.layout.length];
  if (paletteFrame) {
    drawPaletteCell(ctx, board, padding + paletteFrame.x, padding + headerH + paletteFrame.y, paletteFrame.w, paletteFrame.h, 2);
  }
  return canvas;
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create image'))), 'image/png');
  });
}

function TileArt({ tile }: { tile: MoodboardTile }) {
  if (tile.type === 'color') return <div className="h-full min-h-[100px] w-full" style={{ backgroundColor: tile.value }} />;
  if (tile.type === 'image') {
    if (tile.imageUrl) {
      return <img src={tile.imageUrl} alt={tile.label} className="h-full min-h-[170px] w-full object-cover" loading="lazy" />;
    }
    return <div className="tile-image-art h-full min-h-[170px] w-full overflow-hidden" />;
  }
  if (tile.type === 'quote') return <div className="flex h-full min-h-[120px] items-center justify-center bg-[#390404] p-6 text-center text-[#fef7e5]"><span className="serif text-2xl leading-tight">“{tile.value}”</span></div>;
  return <div className="flex h-full min-h-[100px] items-end bg-[#d9c6a0] p-5"><span className="serif text-2xl leading-tight text-[#390404]">{tile.value}</span></div>;
}

function PaletteTileCard({ board, copied, onCopyColor, sizeClass, extraClass }: { board: Moodboard; copied: string; onCopyColor: (hex: string) => void; sizeClass: string; extraClass: string }) {
  return (
    <article className={`relative overflow-hidden border border-[#13273f]/25 bg-[#fef7e5] p-4 ${sizeClass} ${extraClass}`} data-testid="card-palette-tile">
      <div className="flex items-center justify-between"><span className="eyebrow text-[#788240]">Palette / {board.palette.length} tones</span><SlidersHorizontal size={14} className="text-[#13273f]" /></div>
      <div className="mt-4 grid grid-cols-2 gap-2.5 overflow-y-auto">
        {board.palette.map((color) => (
          <button type="button" key={color.hex} onClick={() => onCopyColor(color.hex)} className="group flex items-center gap-2 text-left" data-testid={`button-copy-color-${color.hex.slice(1)}`}>
            <span className="h-7 w-7 shrink-0 border border-[#13273f]/20" style={{ backgroundColor: color.hex }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-semibold text-[#13273f]">{color.name}</span>
              <span className="block text-[9px] uppercase tracking-[.08em] text-[#13273f] group-hover:text-[#788240]">{copied === color.hex ? 'Copied' : color.hex}</span>
            </span>
          </button>
        ))}
      </div>
    </article>
  );
}

function MoodboardEditor({ board, boardType, layoutStyle, onReset, onBoardChange }: { board: Moodboard; boardType: 'moodboard' | 'brandboard'; layoutStyle: string; onReset: () => void; onBoardChange: (board: Moodboard) => void }) {
  const [replacePanelIndex, setReplacePanelIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState('');
  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      setCopied('');
    }
  };
  const [exporting, setExporting] = useState<'download' | 'copy' | null>(null);
  const [frames, setFrames] = useState<TileFrame[]>(() => (boardType === 'brandboard' ? buildBrandInitialFrames() : buildInitialFrames(board.layout.length + 1, layoutStyle)));
  useEffect(() => {
    setFrames(boardType === 'brandboard' ? buildBrandInitialFrames() : buildInitialFrames(board.layout.length + 1, layoutStyle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.id, layoutStyle, boardType]);
  const download = async () => {
    setExporting('download');
    try {
      const canvas = await renderFreeformBoardToCanvas(board, frames);
      const blob = await canvasToPngBlob(canvas);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${board.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'morrow-board'}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Board export failed:', error);
    } finally {
      setExporting(null);
    }
  };
  const copyBoardImage = async () => {
    setExporting('copy');
    try {
      const canvas = await renderFreeformBoardToCanvas(board, frames);
      const blob = await canvasToPngBlob(canvas);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied('board');
      window.setTimeout(() => setCopied(''), 1800);
    } catch (error) {
      console.error('Board copy failed:', error);
    } finally {
      setExporting(null);
    }
  };

  const updateTileImage = (index: number, imageUrl: string) => {
    const nextLayout = board.layout.map((tile, i) => (i === index ? { ...tile, type: 'image' as const, imageUrl } : tile));
    onBoardChange({ ...board, layout: nextLayout });
  };
  const deleteTile = (index: number) => {
    const nextLayout = board.layout.filter((_, i) => i !== index);
    onBoardChange({ ...board, layout: nextLayout });
    setFrames((current) => current.filter((_, i) => i !== index));
  };
  const updateFrame = (index: number, patch: Partial<TileFrame>) => {
    setFrames((current) => current.map((frame, i) => (i === index ? { ...frame, ...patch } : frame)));
  };
  const canvasHeight = useMemo(() => Math.max(400, ...frames.map((frame) => frame.y + frame.h)) + 40, [frames]);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-7 sm:px-8 lg:px-12">
      <div className="mb-8 flex flex-col gap-5 border-b border-[#13273f]/20 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow text-[#788240]">A living direction / {board.id.slice(0, 8)}</span>
          <p className="mt-3 max-w-[600px] text-[15px] leading-7 text-[#390404]" data-testid="text-moodboard-tagline">{board.tagline}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={copyBoardImage} disabled={exporting !== null} className="flex items-center gap-2 border border-[#13273f]/30 px-3 py-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#390404] transition-colors hover:border-[#788240] hover:text-[#788240] disabled:opacity-60" data-testid="button-copy-moodboard">{copied === 'board' ? <Check size={14} /> : <Clipboard size={14} />} {exporting === 'copy' ? 'Copying…' : copied === 'board' ? 'Copied' : 'Copy'}</button>
          <button type="button" onClick={download} disabled={exporting !== null} className="flex items-center gap-2 border border-[#13273f]/30 px-3 py-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#390404] transition-colors hover:border-[#788240] hover:text-[#788240] disabled:opacity-60" data-testid="button-download-moodboard"><Download size={14} /> {exporting === 'download' ? 'Preparing…' : 'Download'}</button>
        </div>
      </div>
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_310px]">
        <section className="studio-grid overflow-x-auto border border-[#fef7e5] bg-[#13273f] p-3 sm:p-5" data-testid="panel-moodboard-canvas">
          <div className="relative" style={{ width: CANVAS_WIDTH, height: canvasHeight, maxWidth: 'none' }}>
              {board.layout.map((tile, index) => frames[index] && (
                <FreeformTile
                  key={`${tile.label}-${index}`}
                  tile={tile}
                  index={index}
                  frame={frames[index]}
                  onMove={(x, y) => updateFrame(index, { x, y })}
                  onResize={(w, h) => updateFrame(index, { w, h })}
                  onImageChange={(url) => updateTileImage(index, url)}
                  onDelete={() => deleteTile(index)}
                  onRequestReplace={() => setReplacePanelIndex(index)}
                />
              ))}
              {frames[board.layout.length] && (
                <FreeformFrame
                  frame={frames[board.layout.length]}
                  onMove={(x, y) => updateFrame(board.layout.length, { x, y })}
                  onResize={(w, h) => updateFrame(board.layout.length, { w, h })}
                  testId="card-palette-tile"
                >
                  <PaletteTileCard board={board} copied={copied} onCopyColor={(hex) => copy(hex, hex)} sizeClass="h-full w-full" extraClass="" />
                </FreeformFrame>
              )}
          </div>
        </section>
        <aside className="space-y-5">
          <div className="border border-[#13273f] bg-[#13273f] p-5">
            <div className="flex items-center gap-2 text-[#788240]"><SlidersHorizontal size={16} strokeWidth={1.5} /><span className="eyebrow">Edit the board</span></div>
            <p className="mt-4 text-[13px] leading-6 text-[#788240]">Drag any tile to move it. Drag its bottom-right corner to resize freely. Click a tile to replace its image or delete it.</p>
          </div>
          <div className="border-t border-[#390404]/20 pt-4">
            <p className="text-[14px] leading-5 text-[#13273f]">Direction: <span className="text-[#13273f]" data-testid="text-moodboard-direction">{board.direction}</span></p>
            <button type="button" onClick={onReset} className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#13273f] transition-colors hover:text-[#788240]" data-testid="button-new-brief"><RefreshCw size={14} /> Start another brief</button>
          </div>
        </aside>
      </div>
      {replacePanelIndex !== null && (
  <ImageReplacePanel
    onSelect={(url) => { updateTileImage(replacePanelIndex, url); setReplacePanelIndex(null); }}
    onClose={() => setReplacePanelIndex(null)}
  />
)}
    </div>
  );
}

type StudioSection = 'dashboard' | 'history' | 'profile';

function StudioSidebar({
  activeSection,
  history,
  isOpen,
  onClose,
  onSelect,
  onOpenBoard,
}: {
  activeSection: StudioSection;
  history: Moodboard[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (section: StudioSection) => void;
  onOpenBoard: (board: Moodboard) => void;
}) {
  return (
    <>
      {isOpen && <button type="button" className="studio-sidebar-backdrop lg:hidden" onClick={onClose} aria-label="Close sidebar" data-testid="button-close-sidebar" />}
      <aside className={`studio-sidebar ${isOpen ? 'studio-sidebar-open' : ''}`} aria-label="Studio navigation">
        <div className="flex items-center justify-between lg:hidden">
          <span className="eyebrow text-[#788240]">Your studio</span>
          <button type="button" onClick={onClose} className="p-2 text-[#13273f]" aria-label="Close sidebar" data-testid="button-sidebar-close"><X size={17} /></button>
        </div>
        <div className="hidden lg:block">
          <span className="eyebrow text-[#788240]">Your studio</span>
          <p className="mt-3 serif text-2xl italic text-[#390404]">Keep the thread.</p>
        </div>
        <nav className="mt-6 space-y-1" aria-label="Studio sections">
          {[
            { id: 'dashboard' as const, label: 'Current dashboard', icon: LayoutDashboard },
            { id: 'history' as const, label: 'Previous moodboards', icon: History },
            { id: 'profile' as const, label: 'Profile', icon: UserRound },
          ].map(({ id, label, icon: Icon }) => (
            <button type="button" key={id} onClick={() => { onSelect(id); onClose(); }} className={`studio-nav-item ${activeSection === id ? 'studio-nav-item-active' : ''}`} data-testid={`button-sidebar-${id}`}>
              <Icon size={15} strokeWidth={1.6} /><span>{label}</span>
              {id === 'history' && <span className="ml-auto text-[10px] opacity-60">{history.length}</span>}
            </button>
          ))}
        </nav>
        {history.length > 0 && (
          <div className="mt-8 border-t border-[#13273f]/15 pt-5">
            <span className="eyebrow text-[#13273f]/70">Recent threads</span>
            <div className="mt-3 space-y-1.5">
              {history.slice(0, 3).map((item) => (
                <button type="button" key={item.id} onClick={() => { onOpenBoard(item); onClose(); }} className="studio-history-link" data-testid={`button-sidebar-board-${item.id}`}>
                  <span className="block truncate text-left">{item.title}</span>
                  <span className="mt-0.5 block truncate text-left text-[10px] opacity-60">{item.tagline}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function HistoryPanel({ history, onOpen }: { history: Moodboard[]; onOpen: (board: Moodboard) => void }) {
  return (
    <section className="mx-auto max-w-[1100px] px-5 py-10 sm:px-8 lg:px-12" data-testid="panel-previous-moodboards">
      <span className="eyebrow text-[#788240]">The shelf / {history.length} saved directions</span>
      <h1 className="serif mt-4 max-w-[700px] text-[clamp(3rem,6vw,6rem)] italic leading-[.86] tracking-[-.06em] text-[#13273f]">Previous <em>moodboards.</em></h1>
      {history.length === 0 ? (
        <div className="mt-10 border border-dashed border-[#13273f]/30 bg-[#fef7e5]/55 p-8 text-[13px] leading-6 text-[#13273f]" data-testid="empty-previous-moodboards">Your first direction will live here after you develop it.</div>
      ) : (
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {history.map((item, index) => (
            <button type="button" key={item.id} onClick={() => onOpen(item)} className="card-lift border border-[#13273f]/25 bg-[#fef7e5]/80 p-5 text-left" data-testid={`card-previous-moodboard-${index}`}>
              <div className="flex items-start justify-between gap-4">
                <span className="eyebrow text-[#788240]">{String(index + 1).padStart(2, '0')} / direction</span>
                <span className="text-[10px] uppercase tracking-[.12em] text-[#390404]">{item.palette.length} tones</span>
              </div>
              <h2 className="serif mt-9 text-3xl italic leading-none text-[#390404]">{item.title}</h2>
              <p className="mt-3 line-clamp-2 text-[13px] leading-6 text-[#390404]">{item.tagline}</p>
              <div className="mt-6 flex gap-1.5">
                {item.palette.slice(0, 5).map((color) => <span key={color.hex} className="h-5 w-5 border border-[#390404]/15" style={{ backgroundColor: color.hex }} aria-label={color.name} />)}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function ProfilePanel({ user, boardCount }: { user: ReturnType<typeof useUser>['user']; boardCount: number }) {
  const email = user?.primaryEmailAddress?.emailAddress || 'No email on file';
  return (
    <section className="mx-auto max-w-[760px] px-5 py-10 sm:px-8 lg:px-12" data-testid="panel-profile">
      <span className="eyebrow text-[#788240]">A little about you</span>
      <h1 className="serif mt-4 text-[clamp(3rem,6vw,5.8rem)] italic leading-[.86] tracking-[-.06em] text-[#390404]">Your <em>profile.</em></h1>
      <div className="mt-10 border border-[#390404]/25 bg-[#fef7e5]/80 p-6 sm:p-8">
        <div className="flex items-center gap-4 border-b border-[#13273f]/15 pb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#13273f] serif text-2xl italic text-[#fef7e5]" data-testid="text-profile-initial">{(user?.firstName?.[0] || user?.username?.[0] || 'M').toUpperCase()}</div>
          <div>
            <p className="serif text-2xl italic text-[#13273f]" data-testid="text-profile-name">{user?.fullName || user?.username || 'Maker'}</p>
            <p className="mt-1 text-[12px] text-[#13273f]" data-testid="text-profile-email">{email}</p>
          </div>
        </div>
        <div className="grid gap-5 pt-6 sm:grid-cols-2">
          <div><span className="eyebrow text-[#13273f]/70">Directions developed</span><p className="mt-2 serif text-3xl italic text-[#13273f]" data-testid="text-profile-board-count">{boardCount}</p></div>
          <div><span className="eyebrow text-[#13273f]/70">Studio mode</span><p className="mt-2 serif text-3xl italic text-[#13273f]">Private</p></div>
        </div>
      </div>
    </section>
  );
}

export default function StudioPage() {
  const { user } = useUser();
  const { signOut } = useClerk();

  // TEMPORARY DIAGNOSTIC — remove once Unsplash fetching is confirmed working.
  useEffect(() => {
    (async () => {
      console.log('%c[DIAGNOSTIC] starting checks...', 'color: #788240; font-weight: bold;');
      try {
        const healthRes = await fetch('/api/healthz');
        console.log('[DIAGNOSTIC] /api/healthz status:', healthRes.status, 'ok:', healthRes.ok);
        console.log('[DIAGNOSTIC] /api/healthz body:', await healthRes.text());
      } catch (err) {
        console.error('[DIAGNOSTIC] /api/healthz request threw:', err);
      }
      try {
        const unsplashRes = await fetch('/api/moodboards/debug/unsplash');
        console.log('[DIAGNOSTIC] /api/moodboards/debug/unsplash status:', unsplashRes.status, 'ok:', unsplashRes.ok);
        const text = await unsplashRes.text();
        console.log('[DIAGNOSTIC] /api/moodboards/debug/unsplash raw body:', text);
        try {
          console.log('[DIAGNOSTIC] parsed JSON:', JSON.parse(text));
        } catch {
          console.log('[DIAGNOSTIC] body was not valid JSON (likely an HTML error page)');
        }
      } catch (err) {
        console.error('[DIAGNOSTIC] /api/moodboards/debug/unsplash request threw:', err);
      }
      console.log('%c[DIAGNOSTIC] done \u2014 send Claude everything above.', 'color: #788240; font-weight: bold;');
    })();
  }, []);

  const [step, setStep] = useState(0);
  const [boardType, setBoardType] = useState<'moodboard' | 'brandboard' | null>(null);
  const [purpose, setPurpose] = useState('');
  const [logoDescription, setLogoDescription] = useState('');
  const [logoImageDataUrl, setLogoImageDataUrl] = useState<string | null>(null);
  const [layoutStyle, setLayoutStyle] = useState('');
  const [imageCount, setImageCount] = useState(6);
  const [styles, setStyles] = useState<string[]>([]);
  const [board, setBoard] = useState<Moodboard | null>(null);
  const [history, setHistory] = useState<Moodboard[]>([]);
  const [activeSection, setActiveSection] = useState<StudioSection>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isEntering, setIsEntering] = useState(true);
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), staleTime: 30_000 } });
  const generate = useGenerateMoodboard({ mutation: { onSuccess: (nextBoard) => setBoard(nextBoard) } });
  const toggleStyle = (style: string) => setStyles((current) => current.includes(style) ? current.filter((item) => item !== style) : [...current, style]);
  const advance = () => {
    setIsExiting(true);
    window.setTimeout(() => { setStep((current) => Math.min(current + 1, 4)); setIsExiting(false); }, 400);
  };
  const submit = () => {
    if (!boardType || purpose.trim().length < 3 || styles.length === 0) return;
    if (boardType === 'moodboard' && !layoutStyle) return;
    if (boardType === 'brandboard' && logoDescription.trim().length < 3 && !logoImageDataUrl) return;
    generate.mutate({ data: { boardType, purpose: purpose.trim(), logoDescription: boardType === 'brandboard' ? logoDescription.trim() : undefined, logoImageDataUrl: boardType === 'brandboard' ? logoImageDataUrl ?? undefined : undefined, layoutStyle: boardType === 'moodboard' ? layoutStyle : 'brand template', imageCount, styles } });
  };
  const reset = () => { setBoard(null); setStep(0); setBoardType(null); setPurpose(''); setLogoDescription(''); setLogoImageDataUrl(null); setLayoutStyle(''); setImageCount(6); setStyles([]); };
  const healthLabel = useMemo(() => health.data?.status === 'ok' ? 'studio connected' : health.isLoading ? 'checking studio' : 'quiet mode', [health.data?.status, health.isLoading]);

  if (board) {
    return (
      <main className="grain min-h-[100dvh] bg-[#fef7e5] text-[#13273f]">
        <StudioHeader healthLabel={healthLabel} userName={user?.firstName || 'maker'} signOut={() => signOut({ redirectUrl: import.meta.env.BASE_URL || '/' })} />
        <MoodboardEditor board={board} boardType={boardType ?? 'moodboard'} layoutStyle={layoutStyle} onReset={reset} onBoardChange={setBoard} />
      </main>
    );
  }
  return (
    <main className="grain min-h-[100dvh] bg-[#13273f] text-[#fef7e5]">
      <StudioHeader healthLabel={healthLabel} userName={user?.firstName || 'maker'} signOut={() => signOut({ redirectUrl: import.meta.env.BASE_URL || '/' })} />
      <section className="flex min-h-[calc(100dvh-80px)] flex-col items-center justify-center px-5 py-12 sm:px-8">
        <div className="mb-8 w-full max-w-[700px]">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[.16em] text-[#bf5114]">
            <span>New visual direction</span><span data-testid="text-brief-progress">{Math.round(((step + 1) / 5) * 100)}%</span>
          </div>
          <div className="mt-3 h-[2px] w-full bg-[#c1dbe8]/15"><div className="h-full bg-[#788240] transition-all duration-500" style={{ width: `${((step + 1) / 5) * 100}%` }} /></div>
        </div>
        <BriefCard step={step} boardType={boardType} setBoardType={setBoardType} purpose={purpose} setPurpose={setPurpose} logoDescription={logoDescription} setLogoDescription={setLogoDescription} logoImageDataUrl={logoImageDataUrl} setLogoImageDataUrl={setLogoImageDataUrl} layoutStyle={layoutStyle} setLayoutStyle={setLayoutStyle} imageCount={imageCount} setImageCount={setImageCount} styles={styles} toggleStyle={toggleStyle} onAdvance={advance} onGenerate={submit} isExiting={isExiting} isGenerating={generate.isPending} error={generate.error} />
      </section>
    </main>
  );
}

function StudioHeader({ healthLabel, userName, signOut }: { healthLabel: string; userName: string; signOut: () => void }) {
  return (
    <header className="flex items-center justify-between border-b border-[#c1dbe8]/20 px-5 py-5 sm:px-8 lg:px-12">
      <Link href="/studio" className="flex items-center gap-3" data-testid="link-studio-logo">
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#bf5114]/30 bg-[#13273f] text-[#fef7e5]"><span className="serif text-2xl">M</span></span>
        <span className="hidden text-[11px] font-bold uppercase tracking-[.2em] sm:block">Morrow  studio</span>
      </Link>
      <div className="flex items-center gap-4">
        {/* <span className="flex items-center gap-2 text-[10px] uppercase tracking-[.12em] text-[#390404]" data-testid="status-studio-health"><span className={`status-pulse h-1.5 w-1.5 rounded-full ${healthLabel === 'quiet mode' ? 'bg-[#788240]' : 'bg-[#567f75]'}`} />{healthLabel}</span>
        <span className="hidden text-[11px] text-[#c1dbe8] sm:block" data-testid="text-user-name">for {userName}</span> */}
        <button type="button" onClick={signOut} className="flex items-center gap-2 border-l border-[#13273f]/20 pl-4 text-[10px] font-bold uppercase tracking-[.12em] text-[#fef7e5] transition-colors hover:text-[#788240]" data-testid="button-sign-out"><LogOut size={14} /> <span className="hidden sm:inline">Leave studio</span></button>
      </div>
    </header>
  );
}
