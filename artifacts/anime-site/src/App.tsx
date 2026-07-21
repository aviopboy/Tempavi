import { useEffect, useRef, useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, useClerk } from "@clerk/react";
import { App as CapApp } from "@capacitor/app";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/Navbar";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Anime from "@/pages/anime";
import Movies from "@/pages/movies";
import Series from "@/pages/series";
import Watch from "@/pages/watch";
import Genre from "@/pages/genre";
import Account from "@/pages/account";
import Onboarding from "@/pages/onboarding";
import { useTheme, ThemeContext, applyTheme } from "@/hooks/use-theme";
import { UserDataProvider } from "@/hooks/use-user-data";
import { OfflineBanner } from "@/components/OfflineBanner";
import { SmartAppBanner } from "@/components/SmartAppBanner";

const queryClient = new QueryClient();

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// REQUIRED — resolves the key from the current hostname so the same build
// works across Replit dev, Replit prod, Netlify, and APK WebViews.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — empty in dev (Clerk hits FAPI directly), auto-set in prod.
// Must be unconditional — do NOT gate on host or NODE_ENV.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

// Hide social/OAuth buttons inside the native Capacitor app —
// Google blocks OAuth in embedded WebViews so they'd open Chrome anyway.
const isNativeApp = typeof (window as any).Capacitor !== "undefined";

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#FF6B35",
    colorForeground: "#f8f8f8",
    colorMutedForeground: "rgba(255,255,255,0.45)",
    colorDanger: "#ef4444",
    colorBackground: "#0d0d10",
    colorInput: "#1c1c22",
    colorInputForeground: "#f8f8f8",
    colorNeutral: "rgba(255,255,255,0.12)",
    fontFamily: "system-ui, -apple-system, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl",
    card: "!shadow-none !border-0 !bg-[#0d0d10] !rounded-none",
    footer: "!shadow-none !border-0 !bg-[#0d0d10] !rounded-none",
    headerTitle: "text-white font-bold",
    headerSubtitle: "text-white/50",
    socialButtonsBlockButtonText: "text-white/80 font-medium",
    socialButtonsBlockButton: "border-white/10 hover:bg-white/5 bg-white/[0.03]",
    formFieldLabel: "text-white/60 text-sm",
    formFieldInput: "bg-[#1c1c22] border-white/10 text-white placeholder:text-white/20 focus:border-[#FF6B35]/60",
    formButtonPrimary: "bg-[#FF6B35] hover:bg-[#e55a25] text-white font-semibold",
    footerActionLink: "text-[#FF6B35] hover:text-[#FF6B35]/80 font-semibold",
    footerActionText: "text-white/40",
    footerAction: "bg-[#0d0d10]",
    dividerText: "text-white/30",
    dividerLine: "bg-white/10",
    identityPreviewEditButton: "text-[#FF6B35]",
    formFieldSuccessText: "text-green-400",
    alertText: "text-white/80",
    alert: "border-white/10 bg-white/5",
    otpCodeFieldInput: "bg-[#1c1c22] border-white/10 text-white",
    formFieldRow: "",
    logoBox: "flex justify-center",
    logoImage: "h-10 w-auto",
    main: "",
  },
};

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location]);
  return null;
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

// Invalidates React Query cache on user change
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function AuthPageWrapper({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, #060608 0%, #0f0f14 50%, #060608 100%)" }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255,107,53,0.06) 0%, transparent 70%)" }} />
      {/* Close button — always visible so users can exit the auth page */}
      <button
        onClick={() => { if (window.history.length > 1) { window.history.back(); } else { setLocation("/"); } }}
        aria-label="Close"
        style={{
          position: "fixed", top: 16, right: 16, zIndex: 100,
          width: 36, height: 36, borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "rgba(255,255,255,0.7)",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      {children}
    </div>
  );
}

function SignInPage() {
  return (
    <AuthPageWrapper>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </AuthPageWrapper>
  );
}

function SignUpPage() {
  return (
    <AuthPageWrapper>
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        fallbackRedirectUrl={`${basePath}/onboarding`}
      />
    </AuthPageWrapper>
  );
}

function Layout() {
  const [location] = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isAuthPage = location.startsWith("/sign-in") || location.startsWith("/sign-up") || location.startsWith("/onboarding");
  const watchPage = location.startsWith("/watch/");

  return (
    <>
      <ScrollToTop />
      {!watchPage && !isAuthPage && (
        <Navbar
          settingsOpen={settingsOpen}
          onSettingsToggle={() => setSettingsOpen((v) => !v)}
          onSettingsClose={() => setSettingsOpen(false)}
        />
      )}
      <div className={!watchPage && !isAuthPage ? "pt-[60px]" : ""}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/anime" component={Anime} />
          <Route path="/movies" component={Movies} />
          <Route path="/series/:slug" component={Series} />
          <Route path="/watch/:episodeId" component={Watch} />
          <Route path="/genre/:name" component={Genre} />
          <Route path="/genre" component={Genre} />
          <Route path="/account" component={Account} />
          <Route path="/onboarding" component={Onboarding} />
          {/* REQUIRED — /*? matches bare URL + Clerk OAuth sub-paths */}
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  // Handle deep-link callbacks in the native app (e.g. email verification
  // links that Android opens in Chrome then hands back via App Links).
  // We extract the path + query string and push it into wouter's router so
  // the Clerk component can finish the flow inside the WebView.
  useEffect(() => {
    if (!isNativeApp) return;
    const sub = CapApp.addListener("appUrlOpen", ({ url }) => {
      try {
        const parsed = new URL(url);
        const dest = parsed.pathname + parsed.search + parsed.hash;
        const stripped = stripBase(dest);
        if (stripped) setLocation(stripped);
      } catch { /* malformed URL — ignore */ }
    });
    return () => { sub.then(h => h.remove()); };
  }, [setLocation]);

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: { title: "Welcome back", subtitle: "Sign in to your AviStream account" },
          emailCode: {
            subtitle: "Enter the code sent to your email address. Can't find it? Check your spam or junk folder.",
          },
        },
        signUp: {
          start: { title: "Join AviStream", subtitle: "Create your free account to get started" },
          emailCode: {
            formSubtitle: "Enter the verification code sent to your email address. Can't find it? Check your spam or junk folder.",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <ThemeProvider>
            <UserDataProvider>
              <SmartAppBanner />
              <Layout />
              <Toaster />
              <OfflineBanner />
            </UserDataProvider>
          </ThemeProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  useEffect(() => {
    try {
      const r = localStorage.getItem("avistream_theme");
      if (r) applyTheme(JSON.parse(r) as Parameters<typeof applyTheme>[0]);
    } catch { /* ignore */ }
  }, []);

  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
