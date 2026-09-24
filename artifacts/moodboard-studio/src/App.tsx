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
    colorPrimary: '#D62E2F',
    colorForeground: '#FCEEA8',
    colorMutedForeground: '#FCEEA8',
    colorDanger: '#D62E2F',
    colorBackground: '#293F76',
    colorInput: '#FCEEA8',
    colorInputForeground: '#D62E2F',
    colorNeutral: '#FCEEA8',
    fontFamily: 'Inter, Arial, sans-serif',
    borderRadius: '2px',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#293F76] rounded-none w-[440px] max-w-full overflow-hidden border border-[#FCEEA8]/25 shadow-[0_22px_55px_rgba(0,0,0,.2)]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'font-sans text-[#FCEEA8] text-3xl',
    headerSubtitle: 'text-[#FCEEA8]/75',
    socialButtonsBlockButtonText: 'text-[#D62E2F]',
    formFieldLabel: 'text-[#FCEEA8]',
    footerActionLink: 'text-[#FCEEA8] hover:text-[#D62E2F]',
    footerActionText: 'text-[#FCEEA8]/75',
    dividerText: 'text-[#FCEEA8]/75',
    identityPreviewEditButton: 'text-[#FCEEA8]',
    formFieldSuccessText: 'text-[#FCEEA8]',
    alertText: 'text-[#FCEEA8]',
    logoBox: 'h-12',
    logoImage: 'max-h-12',
    socialButtonsBlockButton: 'border-[#FCEEA8]/25 bg-[#FCEEA8] hover:bg-[#FCEEA8]/90',
    formButtonPrimary: 'bg-[#D62E2F] text-[#FCEEA8] hover:bg-[#b92329]',
    formFieldInput: 'bg-[#FCEEA8] border-[#FCEEA8]/25 text-[#D62E2F]',
    footerAction: 'border-t border-[#FCEEA8]/15',
    dividerLine: 'bg-[#FCEEA8]/20',
    alert: 'border-[#D62E2F]/40 bg-[#D62E2F]/15',
    otpCodeFieldInput: 'bg-[#FCEEA8] border-[#FCEEA8]/25 text-[#D62E2F]',
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
  return <div className="flex min-h-[100dvh] items-center justify-center bg-[#293F76] px-4 py-10 text-[#FCEEA8]"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>;
}

function SignUpPage() {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-[#293F76] px-4 py-10 text-[#FCEEA8]"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>;
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
