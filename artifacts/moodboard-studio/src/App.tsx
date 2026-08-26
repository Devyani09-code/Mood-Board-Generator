import { useClerk, ClerkLoaded, ClerkProvider, Show, SignIn, SignUp } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, type ReactNode } from 'react';
import { Redirect, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import HomePage from '@/pages/home';
import NotFound from '@/pages/not-found';
import StudioPage from '@/pages/studio';
import velvetTexture from '@assets/download.jpg';

const queryClient = new QueryClient();
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: 'top' as const,
    socialButtonsVariant: 'blockButton' as const,
  },
  variables: {
    colorPrimary: '#13273f',
    colorForeground: '#13273f',
    colorMutedForeground: '#8a5a45',
    colorDanger: '#a25242',
    colorBackground: '#fef7e5',
    colorInput: '#fef7e5',
    colorInputForeground: '#13273f',
    colorNeutral: '#9aa9aa',
    fontFamily: 'DM Sans, sans-serif',
    borderRadius: '2px',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fef7e5] rounded-none w-[440px] max-w-full overflow-hidden border border-[#13273f]/25 shadow-[0_22px_55px_rgba(92,26,3,.18)]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'font-serif text-[#13273f] text-3xl',
    headerSubtitle: 'text-[#8a5a45]',
    socialButtonsBlockButtonText: 'text-[#13273f]',
    formFieldLabel: 'text-[#13273f]',
    footerActionLink: 'text-[#bca106] hover:text-[#13273f]',
    footerActionText: 'text-[#8a5a45]',
    dividerText: 'text-[#8a5a45]',
    identityPreviewEditButton: 'text-[#bca106]',
    formFieldSuccessText: 'text-[#567f75]',
    alertText: 'text-[#a25242]',
    logoBox: 'h-12',
    logoImage: 'max-h-12',
    socialButtonsBlockButton: 'border-[#13273f]/25 bg-[#fef7e5] hover:bg-[#13273f]/10',
    formButtonPrimary: 'bg-[#13273f] text-[#fef7e5] hover:bg-[#bca106] hover:text-[#13273f]',
    formFieldInput: 'bg-[#fef7e5] border-[#13273f]/25 text-[#13273f]',
    footerAction: 'border-t border-[#13273f]/15',
    dividerLine: 'bg-[#13273f]/20',
    alert: 'border-[#a25242]/40 bg-[#f0ddd4]',
    otpCodeFieldInput: 'bg-[#fef7e5] border-[#13273f]/25 text-[#13273f]',
    formFieldRow: 'gap-2',
    main: 'gap-5',
  },
};

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/studio" /></Show>
      <Show when="signed-out"><HomePage /></Show>
    </>
  );
}

function StudioRoute() {
  return (
    <>
      <Show when="signed-in"><StudioPage /></Show>
      <Show when="signed-out"><Redirect to="/" /></Show>
    </>
  );
}

function SignInPage() {
  return <div className="paper-surface flex min-h-[100dvh] items-center justify-center px-4 py-10" style={{ backgroundImage: `linear-gradient(rgba(92,26,3,.15), rgba(92,26,3,.15)), url(${velvetTexture})` }}><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>;
}

function SignUpPage() {
  return <div className="paper-surface flex min-h-[100dvh] items-center justify-center px-4 py-10" style={{ backgroundImage: `linear-gradient(rgba(92,26,3,.15), rgba(92,26,3,.15)), url(${velvetTexture})` }}><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== userId) client.clear();
      previousUserId.current = userId;
    });
    return unsubscribe;
  }, [addListener, client]);
  return null;
}

function AppRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: 'Return to the page', subtitle: 'Your private visual studio is waiting.' } },
        signUp: { start: { title: 'Make room for the idea', subtitle: 'A private studio for early directions.' } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <ClerkLoaded>
          <RoutedErrorBoundary>
            <Switch>
              <Route path="/" component={HomeRedirect} />
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />
              <Route path="/studio" component={StudioRoute} />
              <Route component={NotFound} />
            </Switch>
          </RoutedErrorBoundary>
        </ClerkLoaded>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <AppRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
