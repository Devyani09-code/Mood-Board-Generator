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
import paperTexture from '@assets/moodboard-paper-blank.png';

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
    colorPrimary: '#263d49',
    colorForeground: '#263d49',
    colorMutedForeground: '#61747a',
    colorDanger: '#a25242',
    colorBackground: '#e7e2d5',
    colorInput: '#dce0dc',
    colorInputForeground: '#263d49',
    colorNeutral: '#9aa9aa',
    fontFamily: 'DM Sans, sans-serif',
    borderRadius: '2px',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#e7e2d5] rounded-none w-[440px] max-w-full overflow-hidden border border-[#263d49]/25 shadow-[0_22px_55px_rgba(38,61,73,.18)]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'font-serif text-[#263d49] text-3xl',
    headerSubtitle: 'text-[#61747a]',
    socialButtonsBlockButtonText: 'text-[#263d49]',
    formFieldLabel: 'text-[#263d49]',
    footerActionLink: 'text-[#a85f4d] hover:text-[#263d49]',
    footerActionText: 'text-[#61747a]',
    dividerText: 'text-[#61747a]',
    identityPreviewEditButton: 'text-[#a85f4d]',
    formFieldSuccessText: 'text-[#567f75]',
    alertText: 'text-[#a25242]',
    logoBox: 'h-12',
    logoImage: 'max-h-12',
    socialButtonsBlockButton: 'border-[#263d49]/25 bg-[#dce0dc] hover:bg-[#d2dadd]',
    formButtonPrimary: 'bg-[#263d49] text-[#f1e5c9] hover:bg-[#a85f4d]',
    formFieldInput: 'bg-[#dce0dc] border-[#263d49]/25 text-[#263d49]',
    footerAction: 'border-t border-[#263d49]/15',
    dividerLine: 'bg-[#263d49]/20',
    alert: 'border-[#a25242]/40 bg-[#f0ddd4]',
    otpCodeFieldInput: 'bg-[#dce0dc] border-[#263d49]/25 text-[#263d49]',
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
  return <div className="paper-surface flex min-h-[100dvh] items-center justify-center px-4 py-10" style={{ backgroundImage: `linear-gradient(rgba(30,50,60,.08), rgba(30,50,60,.08)), url(${paperTexture})` }}><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>;
}

function SignUpPage() {
  return <div className="paper-surface flex min-h-[100dvh] items-center justify-center px-4 py-10" style={{ backgroundImage: `linear-gradient(rgba(30,50,60,.08), rgba(30,50,60,.08)), url(${paperTexture})` }}><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>;
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