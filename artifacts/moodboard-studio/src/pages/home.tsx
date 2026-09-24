import { ChevronDown, ArrowRight, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import heroImage from '@assets/image_1789900858371.png';
import { Link } from 'wouter';

const tabs = [
  {
    id: 'articles',
    label: 'Articles',
    items: ['Start with a feeling', 'Build visual language', 'Make the board useful'],
  },
  {
    id: 'tools',
    label: 'Tools',
    items: ['Moodboard Studio', 'Reference search', 'Board export'],
  },
  {
    id: 'tutorials',
    label: 'Tutorials',
    items: ['HTML', 'Python', 'JavaScript'],
  },
  {
    id: 'jobs',
    label: 'Jobs',
    items: ['Open roles', 'Collaboration'],
  },
  {
    id: 'premium',
    label: 'Premium',
    items: ['What you get', 'Member access'],
  },
];

export default function HomePage() {
  const [openTab, setOpenTab] = useState<string | null>(null);
  const [pinnedTab, setPinnedTab] = useState<string | null>(null);
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!navigationRef.current?.contains(event.target as Node)) {
        setOpenTab(null);
        setPinnedTab(null);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const toggleTab = (id: string) => {
    const next = pinnedTab === id ? null : id;
    setPinnedTab(next);
    setOpenTab(next);
  };

  return (
    <main className="reference-home min-h-[100dvh] overflow-hidden bg-[#293F76] text-[#D62E2F]">
      <header className="reference-header relative z-30 bg-[#293F76] text-[#D62E2F]" ref={navigationRef}>
        <div className="mx-auto flex min-h-[82px] max-w-[1440px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <Link href="/" className="reference-brand text-[#D62E2F]" data-testid="link-home-logo">Tinge</Link>
          <nav className="reference-nav flex items-center justify-center gap-1" aria-label="Primary navigation">
            {tabs.map((tab) => {
              const isOpen = openTab === tab.id;
              return (
                <div
                  key={tab.id}
                  className="reference-tab-wrap"
                  onMouseEnter={() => setOpenTab(tab.id)}
                  onMouseLeave={() => !pinnedTab && setOpenTab(null)}
                >
                  <button
                    type="button"
                    className={`reference-nav-link text-[#D62E2F] ${isOpen ? 'reference-nav-link-active' : ''}`}
                    onClick={() => toggleTab(tab.id)}
                    aria-expanded={isOpen}
                    data-testid={`button-nav-${tab.id}`}
                  >
                    {tab.label}
                    {(tab.id === 'tools' || tab.id === 'tutorials') && <ChevronDown size={16} strokeWidth={2.5} />}
                  </button>
                  {isOpen && (
                    <div className="reference-dropdown" role="menu">
                      {tab.items.map((item) => (
                        <Link
                          key={item}
                          href={tab.id === 'tools' && item === 'Moodboard Studio' ? '/sign-up' : '#'}
                          className="reference-dropdown-item text-[#D62E2F]"
                          role="menuitem"
                          onClick={() => { setOpenTab(null); setPinnedTab(null); }}
                        >
                          <strong>{item}</strong>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/sign-in" className="reference-auth-link text-[#D62E2F] hidden sm:inline-flex" data-testid="link-sign-in">Log in</Link>
            <Link href="/sign-up" className="reference-signup" data-testid="link-sign-up">Sign up</Link>
            <Link href="/sign-in" className="reference-user-button sm:hidden" aria-label="Log in"><UserRound size={17} /></Link>
          </div>
        </div>
      </header>

      <section className="reference-hero relative mx-auto flex min-h-[calc(100dvh-82px)] max-w-[1440px] items-center bg-[#293F76] px-5 py-12 text-[#D62E2F] sm:px-8 lg:px-12">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[.88fr_1.12fr] lg:gap-16">
          <div className="relative z-10 max-w-[600px]">
            <p className="text-sm font-semibold uppercase tracking-[.18em] text-[#D62E2F]">Tinge / visual direction studio</p>
            <h1 className="mt-6 max-w-[620px] text-[clamp(3.6rem,8vw,8rem)] font-extrabold leading-[.92] tracking-[-.075em] text-[#D62E2F]">
              Build the<br /><span>feeling.</span>
            </h1>
            <p className="mt-7 max-w-[470px] text-[17px] leading-7 text-[#D62E2F]">
              Turn the first idea into a visual direction you can see, share, and keep shaping.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/sign-up" className="reference-hero-button" data-testid="link-start-ritual">
                Start a board <ArrowRight size={17} />
              </Link>
              <Link href="/sign-in" className="reference-secondary-link text-[#D62E2F]">Already have a board?</Link>
            </div>
          </div>
          <div className="reference-hero-art">
            <img src={heroImage} alt="A Tinge visual direction board" data-testid="img-hero" />
            <div className="reference-art-label">Your ideas, in view.</div>
          </div>
        </div>
      </section>
    </main>
  );
}