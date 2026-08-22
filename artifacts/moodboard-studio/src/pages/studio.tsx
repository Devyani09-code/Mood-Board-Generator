import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useClerk, useUser } from '@clerk/react';
import { getHealthCheckQueryKey, useGenerateMoodboard, useHealthCheck, useRefineMoodboard } from '@workspace/api-client-react';
import type { Moodboard, MoodboardTile } from '@workspace/api-client-react';
import { ArrowRight, Check, Clipboard, Download, History, LayoutDashboard, LogOut, Menu, RefreshCw, Send, SlidersHorizontal, Sparkles, UserRound, X } from 'lucide-react';
import paperTexture from '@assets/moodboard-paper-blank.png';
import { Link } from 'wouter';

const STYLE_OPTIONS = ['quiet luxury', 'raw & tactile', 'cinematic', 'sun-washed', 'editorial', 'strange & tender'];
const PROMPT_SUGGESTIONS = ['More room to breathe', 'Pull it toward midnight', 'Make it feel hand-made'];
const BOARD_TYPE_OPTIONS: Array<{ value: 'moodboard' | 'brandboard'; label: string; copy: string }> = [
  { value: 'moodboard', label: 'Moodboard', copy: 'A visual reference collage of real photos, color, and tone.' },
  { value: 'brandboard', label: 'Brand board', copy: 'A structured identity board \u2014 logo direction, typography, palette, voice.' },
];
const LAYOUT_OPTIONS = ['Asymmetric collage', 'Clean grid', 'Scrapbook stack', 'Structured brand grid'];

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
  layoutStyle,
  setLayoutStyle,
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
  layoutStyle: string;
  setLayoutStyle: (value: string) => void;
  styles: string[];
  toggleStyle: (style: string) => void;
  onAdvance: () => void;
  onGenerate: () => void;
  isExiting: boolean;
  isEntering: boolean;
  isGenerating: boolean;
  error: unknown;
}) {
  const [notice, setNotice] = useState('');
  const advance = () => {
    if (step === 1 && !boardType) {
      setNotice('Choose a board type to continue.');
      return;
    }
    if (step === 2 && purpose.trim().length < 3) {
      setNotice('Give the idea a little more room — three characters is enough.');
      return;
    }
    if (step === 3 && !layoutStyle) {
      setNotice('Pick a layout to continue.');
      return;
    }
    if (step === 4 && styles.length === 0) {
      setNotice('Choose at least one visual instinct.');
      return;
    }
    setNotice('');
    onAdvance();
  };

  return (
    <div className={`flashcard ${isExiting ? 'exit' : isEntering ? 'entering' : ''} relative w-full max-w-[620px]`} data-testid={`card-brief-step-${step}`}>
      <div className="absolute inset-x-5 -bottom-3 top-4 rotate-[2deg] border border-[#263d49]/20 bg-[#c3cdd0]/80" />
      <div className="absolute inset-x-2 -bottom-1 top-2 rotate-[-1.2deg] border border-[#263d49]/20 bg-[#e0dfd5]/70" />
      <div className="relative border border-[#263d49]/30 bg-[#e7e2d5]/95 p-7 shadow-[0_22px_50px_rgba(38,61,73,.18)] sm:p-12">
        <div className="flex items-center justify-between border-b border-[#263d49]/20 pb-4">
          <span className="eyebrow text-[#b36b57]">{step === 0 ? 'A note before we begin' : `Fragment 0${step}`}</span>
          <span className="text-[11px] font-bold text-[#435b65]">{step + 1} / 5</span>
        </div>
        {step === 0 && (
            <div className="py-10 sm:py-12">
            <h1 className="serif italic max-w-[530px] text-[clamp(2.8rem,6vw,5rem)] leading-[.9] tracking-[-.06em] text-[#263d49]">Let the first thought be <em>unfinished.</em></h1>
            <p className="mt-7 max-w-[430px] text-[14px] leading-7 text-[#435b65]">We will turn a hunch into a visual direction. There is no right answer here, only what keeps catching your eye.</p>
          </div>
        )}
        {step === 1 && (
          <div className="py-10 sm:py-12">
            <h2 className="serif italic max-w-[530px] text-[clamp(2.35rem,5.5vw,4.5rem)] leading-[.95] tracking-[-.06em] text-[#263d49]">What are you <em>building?</em></h2>
            <p className="mt-5 max-w-[390px] text-[13px] leading-6 text-[#435b65]">Choose the kind of board that fits what you need right now.</p>
            <div className="mt-9 grid gap-3 sm:grid-cols-2">
              {BOARD_TYPE_OPTIONS.map((option) => {
                const selected = boardType === option.value;
                return (
                  <button type="button" key={option.value} onClick={() => setBoardType(option.value)} className={`rounded-lg border p-4 text-left transition-all ${selected ? 'border-[#263d49] bg-[#263d49] text-[#f1e5c9]' : 'border-[#263d49]/30 text-[#435b65] hover:-translate-y-0.5 hover:border-[#b36b57]'}`} data-testid={`button-board-type-${option.value}`} aria-pressed={selected}>
                    <span className="flex items-center gap-2 text-[13px] font-bold">{selected && <Check size={14} />}{option.label}</span>
                    <span className={`mt-1.5 block text-[11px] leading-5 ${selected ? 'text-[#f1e5c9]/75' : 'text-[#435b65]/80'}`}>{option.copy}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="py-10 sm:py-12">
            <label htmlFor="purpose" className="serif italic block max-w-[560px] text-[clamp(2.35rem,5.5vw,4.5rem)] leading-[.95] tracking-[-.06em] text-[#263d49]">What are you <em>making?</em></label>
            <p className="mt-5 max-w-[360px] text-[13px] leading-6 text-[#435b65]">A sentence, a secret, a working title. Follow the thread rather than polishing it.</p>
            <textarea id="purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="I want to make..." rows={3} className="mt-9 w-full resize-none border-0 border-b border-[#263d49]/35 bg-transparent px-0 py-3 text-[18px] leading-7 text-[#263d49] outline-none placeholder:text-[#435b65]/50 focus:border-[#b36b57]" data-testid="input-purpose" />
          </div>
        )}
        {step === 3 && (
          <div className="py-10 sm:py-12">
            <h2 className="serif italic max-w-[530px] text-[clamp(2.35rem,5.5vw,4.5rem)] leading-[.95] tracking-[-.06em] text-[#263d49]">Pick a <em>layout.</em></h2>
            <p className="mt-5 max-w-[390px] text-[13px] leading-6 text-[#435b65]">How should the board be composed?</p>
            <div className="mt-9 flex flex-wrap gap-2.5">
              {LAYOUT_OPTIONS.map((option) => {
                const selected = layoutStyle === option;
                return (
                  <button type="button" key={option} onClick={() => setLayoutStyle(option)} className={`rounded-full border px-4 py-2.5 text-[12px] transition-all ${selected ? 'border-[#263d49] bg-[#263d49] text-[#f1e5c9]' : 'border-[#263d49]/30 text-[#435b65] hover:-translate-y-0.5 hover:border-[#b36b57] hover:text-[#b36b57]'}`} data-testid={`button-layout-${option.replaceAll(' ', '-').toLowerCase()}`} aria-pressed={selected}>
                    {selected && <Check size={13} className="mr-1.5 inline" />}{option}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="py-10 sm:py-12">
            <h2 className="serif italic max-w-[530px] text-[clamp(2.35rem,5.5vw,4.5rem)] leading-[.95] tracking-[-.06em] text-[#263d49]">What is the <em>weather?</em></h2>
            <p className="mt-5 max-w-[390px] text-[13px] leading-6 text-[#435b65]">Choose the instincts that already belong to the idea. You can hold more than one.</p>
            <div className="mt-9 flex flex-wrap gap-2.5">
              {STYLE_OPTIONS.map((style) => {
                const selected = styles.includes(style);
                return (
                  <button type="button" key={style} onClick={() => toggleStyle(style)} className={`rounded-full border px-4 py-2.5 text-[12px] transition-all ${selected ? 'border-[#263d49] bg-[#263d49] text-[#f1e5c9]' : 'border-[#263d49]/30 text-[#435b65] hover:-translate-y-0.5 hover:border-[#b36b57] hover:text-[#b36b57]'}`} data-testid={`button-style-${style.replaceAll(' ', '-')}`} aria-pressed={selected}>
                    {selected && <Check size={13} className="mr-1.5 inline" />}{style}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {notice && <p className="mb-5 text-[12px] font-medium text-[#a25242]" data-testid="status-brief-validation">{notice}</p>}
        {Boolean(error) && <p className="mb-5 border-l-2 border-[#a25242] pl-3 text-[12px] leading-5 text-[#a25242]" data-testid="status-generation-error">{getErrorMessage(error)}</p>}
        <div className="flex items-center justify-between border-t border-[#263d49]/20 pt-5">
          <span className="hidden text-[11px] uppercase tracking-[.14em] text-[#435b65]/70 sm:block">{step === 0 ? 'Take a breath' : step === 4 ? 'Trust your eye' : 'Keep it close'}</span>
          <button type="button" onClick={step === 4 ? onGenerate : advance} disabled={isGenerating} className="group ml-auto flex items-center gap-3 rounded-full bg-[#263d49] px-5 py-3 text-[11px] font-bold uppercase tracking-[.15em] text-[#f1e5c9] transition-all hover:bg-[#b36b57] disabled:cursor-wait disabled:opacity-60" data-testid={step === 4 ? 'button-generate-moodboard' : 'button-advance-brief'}>
            {isGenerating ? 'Developing the board' : step === 4 ? 'Develop my board' : 'Continue'} {isGenerating ? <span className="loading-dashes" aria-hidden="true"><i /><i /><i /></span> : <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function getLayoutConfig(layoutStyle: string) {
  switch (layoutStyle) {
    case 'Clean grid':
      return {
        container: 'grid auto-rows-[160px] grid-cols-2 gap-4 sm:auto-rows-[170px] sm:grid-cols-4',
        tileSize: () => '',
        tileExtra: () => 'rounded-sm',
      };
    case 'Scrapbook stack':
      return {
        container: 'grid auto-rows-[150px] grid-cols-2 gap-6 sm:auto-rows-[160px] sm:grid-cols-3',
        tileSize: (tile: MoodboardTile) => tile.size === 'large' ? 'sm:col-span-2 sm:row-span-2' : tile.size === 'medium' ? 'sm:row-span-2' : '',
        tileExtra: (index: number) => `${['rotate-[-2deg]', 'rotate-[1.5deg]', 'rotate-[-1deg]'][index % 3]} shadow-xl`,
      };
    case 'Structured brand grid':
      return {
        container: 'grid auto-rows-[170px] grid-cols-2 gap-2',
        tileSize: (_tile: MoodboardTile, index: number) => index === 0 ? 'col-span-2 row-span-2' : '',
        tileExtra: () => 'rounded-none',
      };
    case 'Asymmetric collage':
    default:
      return {
        container: 'grid auto-rows-[135px] grid-cols-1 gap-3 sm:auto-rows-[150px] sm:grid-cols-3',
        tileSize: (tile: MoodboardTile) => tile.size === 'large' ? 'sm:col-span-2 sm:row-span-2' : tile.size === 'medium' ? 'sm:row-span-2' : '',
        tileExtra: () => '',
      };
  }
}

function TileArt({ tile }: { tile: MoodboardTile }) {
  if (tile.type === 'color') return <div className="h-full min-h-[100px] w-full" style={{ backgroundColor: tile.value }} />;
  if (tile.type === 'image') {
    if (tile.imageUrl) {
      return <img src={tile.imageUrl} alt={tile.label} className="h-full min-h-[170px] w-full object-cover" loading="lazy" />;
    }
    return <div className="tile-image-art h-full min-h-[170px] w-full overflow-hidden" />;
  }
  if (tile.type === 'quote') return <div className="flex h-full min-h-[120px] items-center justify-center bg-[#263d49] p-6 text-center text-[#f1e5c9]"><span className="serif text-2xl leading-tight">“{tile.value}”</span></div>;
  return <div className="flex h-full min-h-[100px] items-end bg-[#d9c6a0] p-5"><span className="serif text-2xl leading-tight text-[#263d49]">{tile.value}</span></div>;
}

function MoodboardTileCard({ tile, index, layoutConfig }: { tile: MoodboardTile; index: number; layoutConfig: ReturnType<typeof getLayoutConfig> }) {
  const sizeClass = layoutConfig.tileSize(tile, index);
  const extraClass = layoutConfig.tileExtra(index);
  return (
    <article className={`group relative overflow-hidden border border-[#263d49]/25 bg-[#e8e1d2] ${sizeClass} ${extraClass}`} data-testid={`card-moodboard-tile-${index}`}>
      <TileArt tile={tile} />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-[#263d49]/85 px-3 py-2 text-[9px] font-bold uppercase tracking-[.14em] text-[#f1e5c9]">
        <span>{tile.label}</span><span className="text-[#d7a491]">{tile.type}</span>
      </div>
    </article>
  );
}

function MoodboardEditor({ board, boardType, purpose, layoutStyle, styles, promptHistory, onReset, onRefined }: { board: Moodboard; boardType: 'moodboard' | 'brandboard'; purpose: string; layoutStyle: string; styles: string[]; promptHistory: string[]; onReset: () => void; onRefined: (board: Moodboard, prompt: string) => void }) {
  const refine = useRefinement(board, boardType, purpose, layoutStyle, styles, promptHistory, onRefined);
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
  const download = () => {
    const blob = new Blob([JSON.stringify(board, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${board.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'morrow-board'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="mx-auto max-w-[1400px] px-5 py-7 sm:px-8 lg:px-12">
      <div className="mb-8 flex flex-col gap-5 border-b border-[#263d49]/20 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow text-[#b36b57]">A living direction / {board.id.slice(0, 8)}</span>
          <h1 className="serif mt-3 max-w-[700px] text-[clamp(3rem,6vw,6.7rem)] leading-[.86] tracking-[-.065em] text-[#263d49]" data-testid="text-moodboard-title">{board.title}</h1>
          <p className="mt-4 max-w-[600px] text-[15px] leading-7 text-[#435b65]" data-testid="text-moodboard-tagline">{board.tagline}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => copy(JSON.stringify(board, null, 2), 'board')} className="flex items-center gap-2 border border-[#263d49]/30 px-3 py-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#263d49] transition-colors hover:border-[#b36b57] hover:text-[#b36b57]" data-testid="button-copy-moodboard">{copied === 'board' ? <Check size={14} /> : <Clipboard size={14} />} {copied === 'board' ? 'Copied' : 'Copy'}</button>
          <button type="button" onClick={download} className="flex items-center gap-2 border border-[#263d49]/30 px-3 py-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#263d49] transition-colors hover:border-[#b36b57] hover:text-[#b36b57]" data-testid="button-download-moodboard"><Download size={14} /> Download</button>
        </div>
      </div>
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_310px]">
        <section className="studio-grid border border-[#263d49]/15 bg-[#dce0dc]/45 p-3 sm:p-5" data-testid="panel-moodboard-canvas">
          <div className={getLayoutConfig(layoutStyle).container}>
            {board.layout.map((tile, index) => <MoodboardTileCard key={`${tile.label}-${index}`} tile={tile} index={index} layoutConfig={getLayoutConfig(layoutStyle)} />)}
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-[#263d49]/15 pt-4">
            {board.keywords.map((keyword, index) => <span key={keyword} className="rounded-full border border-[#263d49]/25 px-3 py-1.5 text-[10px] uppercase tracking-[.12em] text-[#435b65]" data-testid={`text-keyword-${index}`}>{keyword}</span>)}
          </div>
        </section>
        <aside className="space-y-5">
          <form onSubmit={refine.submit} className="border border-[#263d49]/25 bg-[#ebe6da]/75 p-5" data-testid="form-refine-moodboard">
            <div className="flex items-center gap-2 text-[#b36b57]"><Sparkles size={16} strokeWidth={1.5} /><span className="eyebrow">Nudge the direction</span></div>
            <p className="mt-4 text-[13px] leading-6 text-[#435b65]">Say what is missing. The board will move with you.</p>
            <textarea value={refine.prompt} onChange={(event) => refine.setPrompt(event.target.value)} placeholder="Make the type feel more..." rows={4} className="mt-4 w-full resize-none border border-[#263d49]/25 bg-[#dce0dc]/50 p-3 text-[13px] leading-6 text-[#263d49] outline-none placeholder:text-[#435b65]/55 focus:border-[#b36b57]" data-testid="input-refine-prompt" />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {PROMPT_SUGGESTIONS.map((suggestion) => <button type="button" key={suggestion} onClick={() => refine.setPrompt(suggestion)} className="border border-[#263d49]/20 px-2 py-1.5 text-[10px] text-[#435b65] transition-colors hover:border-[#b36b57] hover:text-[#b36b57]" data-testid={`button-suggestion-${suggestion.replaceAll(' ', '-').toLowerCase()}`}>{suggestion}</button>)}
            </div>
            {refine.error && <p className="mt-3 text-[12px] leading-5 text-[#a25242]" data-testid="status-refine-error">{getErrorMessage(refine.error)}</p>}
            <button type="submit" disabled={refine.isPending || refine.prompt.trim().length < 3} className="mt-5 flex w-full items-center justify-center gap-2 bg-[#263d49] px-4 py-3 text-[10px] font-bold uppercase tracking-[.15em] text-[#f1e5c9] transition-colors hover:bg-[#b36b57] disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-refine-moodboard">{refine.isPending ? 'Reworking the thread' : 'Apply direction'} {refine.isPending ? <span className="loading-dashes" aria-hidden="true"><i /><i /><i /></span> : <Send size={14} />}</button>
          </form>
          <div className="border border-[#263d49]/20 bg-[#dbe0dd]/50 p-5" data-testid="panel-palette">
            <div className="flex items-center justify-between"><span className="eyebrow text-[#b36b57]">Palette / {board.palette.length} tones</span><SlidersHorizontal size={16} className="text-[#435b65]" /></div>
            <div className="mt-5 space-y-3">
              {board.palette.map((color) => <button type="button" key={color.hex} onClick={() => copy(color.hex, color.hex)} className="group flex w-full items-center gap-3 text-left" data-testid={`button-copy-color-${color.hex.slice(1)}`}><span className="h-8 w-8 border border-[#263d49]/20" style={{ backgroundColor: color.hex }} /><span className="min-w-0 flex-1"><span className="block text-[12px] font-semibold text-[#263d49]">{color.name}</span><span className="block text-[10px] uppercase tracking-[.1em] text-[#435b65]">{color.role}</span></span><span className="text-[10px] text-[#435b65] group-hover:text-[#b36b57]">{copied === color.hex ? 'Copied' : color.hex}</span></button>)}
            </div>
          </div>
          <div className="border-t border-[#263d49]/20 pt-4">
            <p className="text-[11px] leading-5 text-[#435b65]">Direction: <span className="text-[#263d49]" data-testid="text-moodboard-direction">{board.direction}</span></p>
            <button type="button" onClick={onReset} className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#435b65] transition-colors hover:text-[#b36b57]" data-testid="button-new-brief"><RefreshCw size={14} /> Start another brief</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function useRefinement(board: Moodboard, boardType: 'moodboard' | 'brandboard', purpose: string, layoutStyle: string, styles: string[], promptHistory: string[], onRefined: (board: Moodboard, prompt: string) => void) {
  const [prompt, setPrompt] = useState('');
  const mutation = useRefineMoodboard({
    mutation: {
      onSuccess: (nextBoard) => {
        onRefined(nextBoard, prompt.trim());
        setPrompt('');
      },
    },
  });
  return {
    ...mutation,
    prompt,
    setPrompt,
    submit: (event: FormEvent) => {
      event.preventDefault();
      if (prompt.trim().length < 3 || mutation.isPending) return;
      mutation.mutate({ data: { boardType, purpose, layoutStyle, styles, prompt: prompt.trim(), promptHistory, moodboard: board } });
    },
  };
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
          <span className="eyebrow text-[#b36b57]">Your studio</span>
          <button type="button" onClick={onClose} className="p-2 text-[#435b65]" aria-label="Close sidebar" data-testid="button-sidebar-close"><X size={17} /></button>
        </div>
        <div className="hidden lg:block">
          <span className="eyebrow text-[#b36b57]">Your studio</span>
          <p className="mt-3 serif text-2xl italic text-[#263d49]">Keep the thread.</p>
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
          <div className="mt-8 border-t border-[#263d49]/15 pt-5">
            <span className="eyebrow text-[#435b65]/70">Recent threads</span>
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
      <span className="eyebrow text-[#b36b57]">The shelf / {history.length} saved directions</span>
      <h1 className="serif mt-4 max-w-[700px] text-[clamp(3rem,6vw,6rem)] italic leading-[.86] tracking-[-.06em] text-[#263d49]">Previous <em>moodboards.</em></h1>
      {history.length === 0 ? (
        <div className="mt-10 border border-dashed border-[#263d49]/30 bg-[#e7e2d5]/55 p-8 text-[13px] leading-6 text-[#435b65]" data-testid="empty-previous-moodboards">Your first direction will live here after you develop it.</div>
      ) : (
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {history.map((item, index) => (
            <button type="button" key={item.id} onClick={() => onOpen(item)} className="card-lift border border-[#263d49]/25 bg-[#e7e2d5]/80 p-5 text-left" data-testid={`card-previous-moodboard-${index}`}>
              <div className="flex items-start justify-between gap-4">
                <span className="eyebrow text-[#b36b57]">{String(index + 1).padStart(2, '0')} / direction</span>
                <span className="text-[10px] uppercase tracking-[.12em] text-[#435b65]">{item.palette.length} tones</span>
              </div>
              <h2 className="serif mt-9 text-3xl italic leading-none text-[#263d49]">{item.title}</h2>
              <p className="mt-3 line-clamp-2 text-[13px] leading-6 text-[#435b65]">{item.tagline}</p>
              <div className="mt-6 flex gap-1.5">
                {item.palette.slice(0, 5).map((color) => <span key={color.hex} className="h-5 w-5 border border-[#263d49]/15" style={{ backgroundColor: color.hex }} aria-label={color.name} />)}
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
      <span className="eyebrow text-[#b36b57]">A little about you</span>
      <h1 className="serif mt-4 text-[clamp(3rem,6vw,5.8rem)] italic leading-[.86] tracking-[-.06em] text-[#263d49]">Your <em>profile.</em></h1>
      <div className="mt-10 border border-[#263d49]/25 bg-[#e7e2d5]/80 p-6 sm:p-8">
        <div className="flex items-center gap-4 border-b border-[#263d49]/15 pb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#263d49] serif text-2xl italic text-[#f1e5c9]" data-testid="text-profile-initial">{(user?.firstName?.[0] || user?.username?.[0] || 'M').toUpperCase()}</div>
          <div>
            <p className="serif text-2xl italic text-[#263d49]" data-testid="text-profile-name">{user?.fullName || user?.username || 'Maker'}</p>
            <p className="mt-1 text-[12px] text-[#435b65]" data-testid="text-profile-email">{email}</p>
          </div>
        </div>
        <div className="grid gap-5 pt-6 sm:grid-cols-2">
          <div><span className="eyebrow text-[#435b65]/70">Directions developed</span><p className="mt-2 serif text-3xl italic text-[#263d49]" data-testid="text-profile-board-count">{boardCount}</p></div>
          <div><span className="eyebrow text-[#435b65]/70">Studio mode</span><p className="mt-2 serif text-3xl italic text-[#263d49]">Private</p></div>
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
      console.log('%c[DIAGNOSTIC] starting checks...', 'color: #b36b57; font-weight: bold;');
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
      console.log('%c[DIAGNOSTIC] done \u2014 send Claude everything above.', 'color: #b36b57; font-weight: bold;');
    })();
  }, []);

  const [step, setStep] = useState(0);
  const [boardType, setBoardType] = useState<'moodboard' | 'brandboard' | null>(null);
  const [purpose, setPurpose] = useState('');
  const [layoutStyle, setLayoutStyle] = useState('');
  const [styles, setStyles] = useState<string[]>([]);
  const [board, setBoard] = useState<Moodboard | null>(null);
  const [history, setHistory] = useState<Moodboard[]>([]);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
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
    if (!boardType || purpose.trim().length < 3 || !layoutStyle || styles.length === 0) return;
    generate.mutate({ data: { boardType, purpose: purpose.trim(), layoutStyle, styles } });
  };
  const reset = () => { setBoard(null); setStep(0); setBoardType(null); setPurpose(''); setLayoutStyle(''); setStyles([]); };
  const healthLabel = useMemo(() => health.data?.status === 'ok' ? 'studio connected' : health.isLoading ? 'checking studio' : 'quiet mode', [health.data?.status, health.isLoading]);

  if (board) {
    return (
      <main className="grain min-h-[100dvh] bg-[#d2dadd] text-[#263d49]" style={{ backgroundImage: `linear-gradient(rgba(210,218,221,.82), rgba(210,218,221,.82)), url(${paperTexture})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
        <StudioHeader healthLabel={healthLabel} userName={user?.firstName || 'maker'} signOut={() => signOut({ redirectUrl: import.meta.env.BASE_URL || '/' })} />
        <MoodboardEditor board={board} boardType={boardType ?? 'moodboard'} purpose={purpose} layoutStyle={layoutStyle} styles={styles} promptHistory={promptHistory} onReset={reset} onRefined={(nextBoard, prompt) => { setBoard(nextBoard); setPromptHistory((current) => [...current, prompt].slice(-8)); }} />
      </main>
    );
  }
  return (
    <main className="grain min-h-[100dvh] bg-[#d2dadd] text-[#263d49]" style={{ backgroundImage: `linear-gradient(rgba(210,218,221,.82), rgba(210,218,221,.82)), url(${paperTexture})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
      <StudioHeader healthLabel={healthLabel} userName={user?.firstName || 'maker'} signOut={() => signOut({ redirectUrl: import.meta.env.BASE_URL || '/' })} />
      <section className="flex min-h-[calc(100dvh-80px)] flex-col items-center justify-center px-5 py-12 sm:px-8">
        <div className="mb-8 w-full max-w-[700px]">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[.16em] text-[#435b65]">
            <span>New visual direction</span><span data-testid="text-brief-progress">{Math.round(((step + 1) / 5) * 100)}%</span>
          </div>
          <div className="mt-3 h-[2px] w-full bg-[#263d49]/15"><div className="h-full bg-[#b36b57] transition-all duration-500" style={{ width: `${((step + 1) / 5) * 100}%` }} /></div>
        </div>
        <BriefCard step={step} boardType={boardType} setBoardType={setBoardType} purpose={purpose} setPurpose={setPurpose} layoutStyle={layoutStyle} setLayoutStyle={setLayoutStyle} styles={styles} toggleStyle={toggleStyle} onAdvance={advance} onGenerate={submit} isExiting={isExiting} isGenerating={generate.isPending} error={generate.error} />
      </section>
    </main>
  );
}

function StudioHeader({ healthLabel, userName, signOut }: { healthLabel: string; userName: string; signOut: () => void }) {
  return (
    <header className="flex items-center justify-between border-b border-[#263d49]/20 px-5 py-5 sm:px-8 lg:px-12">
      <Link href="/studio" className="flex items-center gap-3" data-testid="link-studio-logo">
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#263d49] text-[#f1e5c9]"><span className="serif text-2xl">M</span></span>
        <span className="hidden text-[11px] font-bold uppercase tracking-[.2em] sm:block">Morrow / studio</span>
      </Link>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-[.12em] text-[#435b65]" data-testid="status-studio-health"><span className={`status-pulse h-1.5 w-1.5 rounded-full ${healthLabel === 'quiet mode' ? 'bg-[#b36b57]' : 'bg-[#567f75]'}`} />{healthLabel}</span>
        <span className="hidden text-[11px] text-[#435b65] sm:block" data-testid="text-user-name">for {userName}</span>
        <button type="button" onClick={signOut} className="flex items-center gap-2 border-l border-[#263d49]/20 pl-4 text-[10px] font-bold uppercase tracking-[.12em] text-[#435b65] transition-colors hover:text-[#b36b57]" data-testid="button-sign-out"><LogOut size={14} /> <span className="hidden sm:inline">Leave studio</span></button>
      </div>
    </header>
  );
}