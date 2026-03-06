import { useState, Component, type ReactNode, type ErrorInfo } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useWalletConnect } from '@btc-vision/walletconnect';
import { WalletConnect } from './components/wallet/WalletConnect';
import { ToastProvider } from './components/common/Toast';
import { VaultProvider } from './context/VaultContext';
import { VaultSelector } from './components/vault/VaultSelector';
import { useVaultContext } from './context/VaultContext';
import { Vaults } from './pages/Vaults';
import { Dashboard } from './pages/Dashboard';
import { Deposit } from './pages/Deposit';
import { Withdraw } from './pages/Withdraw';
import { Claim } from './pages/Claim';
import { Admin } from './pages/Admin';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
    state: { error: Error | null } = { error: null };

    static getDerivedStateFromError(error: Error) {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('React ErrorBoundary caught:', error, info.componentStack);
    }

    render() {
        if (this.state.error) {
            return (
                <div className="flex min-h-[50vh] items-center justify-center px-6">
                    <div className="max-w-lg rounded-2xl p-8 text-center" style={{
                        background: 'rgba(239,68,68,0.04)',
                        border: '1px solid rgba(239,68,68,0.15)',
                    }}>
                        <h2 className="text-xl font-bold text-red-400">Something went wrong</h2>
                        <p className="mt-3 text-sm text-gray-400 break-all">{this.state.error.message}</p>
                        <button
                            onClick={() => {
                                this.setState({ error: null });
                                window.location.reload();
                            }}
                            className="mt-5 rounded-xl bg-red-500/10 px-6 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const navItems = [
    { to: '/', label: 'Vaults', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { to: '/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1' },
    { to: '/deposit', label: 'Deposit', icon: 'M12 4v16m8-8H4' },
    { to: '/claim', label: 'Claim', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { to: '/withdraw', label: 'Withdraw', icon: 'M19 14l-7 7m0 0l-7-7m7 7V3' },
    { to: '/admin', label: 'Admin', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
];

function NetworkBadge() {
    const { network } = useWalletConnect();
    const label = network ? 'Testnet' : 'Testnet';
    return (
        <div className="hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{
            background: 'rgba(251,191,36,0.06)',
            border: '1px solid rgba(251,191,36,0.12)',
        }}>
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80">{label}</span>
        </div>
    );
}

function NavBar() {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <>
            <header className="sticky top-0 z-50" style={{
                background: 'rgba(3, 7, 18, 0.6)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}>
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                    {/* Logo + Network */}
                    <div className="flex items-center gap-3 shrink-0">
                        <NavLink to="/" className="flex items-center gap-2.5 group">
                            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden">
                                <div className="absolute inset-0" style={{
                                    background: 'linear-gradient(135deg, #00ffaa 0%, #00e5ff 100%)',
                                }} />
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
                                    background: 'linear-gradient(135deg, #00e5ff 0%, #bf5af2 100%)',
                                }} />
                                <svg className="relative h-3.5 w-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                            <span className="text-[15px] font-bold tracking-tight">
                                <span className="text-white">R</span><span className="text-gradient-animated">Vault</span>
                                <span className="ml-1.5 text-[10px] font-medium uppercase tracking-widest text-gray-500">Protocol</span>
                            </span>
                        </NavLink>
                        <NetworkBadge />
                    </div>

                    {/* Desktop nav */}
                    <nav className="hidden lg:flex items-center gap-0.5 rounded-2xl p-1" style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.04)',
                    }}>
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.to === '/'}
                                className={({ isActive }) =>
                                    `relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium transition-all duration-300 ${
                                        isActive
                                            ? 'text-black'
                                            : 'text-gray-500 hover:text-gray-300'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {isActive && (
                                            <motion.div
                                                layoutId="nav-pill"
                                                className="absolute inset-0 rounded-xl"
                                                style={{
                                                    background: 'linear-gradient(135deg, #00ffaa, #00e5ff)',
                                                }}
                                                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                            />
                                        )}
                                        <svg className="relative h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                                        </svg>
                                        <span className="relative">{item.label}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Right side */}
                    <div className="flex items-center gap-3">
                        <VaultSelector />
                        <div className="hidden md:block">
                            <WalletConnect />
                        </div>

                        {/* Hamburger */}
                        <button
                            onClick={() => setMobileOpen(true)}
                            className="flex lg:hidden h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-white/5"
                        >
                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Beam line */}
                <div className="h-px w-full beam-line" style={{ background: 'rgba(255,255,255,0.03)' }} />
            </header>

            {/* Mobile drawer */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileOpen(false)}
                            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            className="fixed right-0 top-0 z-[70] h-full w-72 lg:hidden"
                            style={{
                                background: 'linear-gradient(180deg, rgba(5,10,14,0.98), rgba(3,7,18,0.98))',
                                borderLeft: '1px solid rgba(255,255,255,0.06)',
                            }}
                        >
                            <div className="flex items-center justify-between p-4">
                                <span className="text-sm font-bold text-white">Menu</span>
                                <button
                                    onClick={() => setMobileOpen(false)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/5"
                                >
                                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="px-3 py-2">
                                <WalletConnect />
                            </div>

                            <div className="px-3 py-2">
                                <VaultSelector />
                            </div>

                            <nav className="mt-4 space-y-1 px-3">
                                {navItems.map((item, i) => (
                                    <motion.div
                                        key={item.to}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <NavLink
                                            to={item.to}
                                            end={item.to === '/'}
                                            onClick={() => setMobileOpen(false)}
                                            className={({ isActive }) =>
                                                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                                                    isActive
                                                        ? 'bg-gradient-to-r from-[#00ffaa]/10 to-[#00e5ff]/5 text-white'
                                                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'
                                                }`
                                            }
                                        >
                                            {({ isActive }) => (
                                                <>
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive ? 2.5 : 2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                                                    </svg>
                                                    <span>{item.label}</span>
                                                    {isActive && (
                                                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#00ffaa]" />
                                                    )}
                                                </>
                                            )}
                                        </NavLink>
                                    </motion.div>
                                ))}
                            </nav>

                            <div className="absolute bottom-0 left-0 right-0 p-4">
                                <div className="h-px w-full" style={{
                                    background: 'linear-gradient(90deg, transparent, rgba(0,255,170,0.1), transparent)',
                                }} />
                                <div className="mt-3 text-center text-[10px] tracking-widest text-gray-700">
                                    BUILT ON OPNET
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

function RequireVault({ children }: { children: ReactNode }) {
    const { selectedVault } = useVaultContext();
    if (!selectedVault) return <Navigate to="/" replace />;
    return <>{children}</>;
}

function AnimatedRoutes() {
    const location = useLocation();
    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Vaults />} />
                <Route path="/dashboard" element={<RequireVault><Dashboard /></RequireVault>} />
                <Route path="/deposit" element={<RequireVault><Deposit /></RequireVault>} />
                <Route path="/claim" element={<RequireVault><Claim /></RequireVault>} />
                <Route path="/withdraw" element={<RequireVault><Withdraw /></RequireVault>} />
                <Route path="/admin" element={<RequireVault><Admin /></RequireVault>} />
            </Routes>
        </AnimatePresence>
    );
}

/* Floating ambient orbs — v2 */
function AmbientOrbs() {
    return (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
            <div className="float-slow absolute top-[15%] left-[10%] h-64 w-64 rounded-full opacity-30"
                style={{ background: 'radial-gradient(circle, rgba(0,255,170,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }} />
            <div className="float-slower absolute top-[60%] right-[5%] h-80 w-80 rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, rgba(191,90,242,0.06) 0%, transparent 70%)', filter: 'blur(80px)' }} />
            <div className="float-slow absolute bottom-[10%] left-[40%] h-48 w-48 rounded-full opacity-25"
                style={{ background: 'radial-gradient(circle, rgba(0,229,255,0.05) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <VaultProvider>
            <ToastProvider>
            <div className="noise min-h-screen bg-aurora text-gray-100">
                <AmbientOrbs />
                <NavBar />
                <main className="relative z-10 mx-auto max-w-5xl px-6 py-10">
                    <ErrorBoundary>
                        <AnimatedRoutes />
                    </ErrorBoundary>
                </main>
                <footer className="relative z-10 pb-8 pt-4">
                    <div className="mx-auto max-w-5xl px-6">
                        <div className="h-px w-full" style={{
                            background: 'linear-gradient(90deg, transparent, rgba(0,255,170,0.15), rgba(0,229,255,0.1), transparent)',
                        }} />
                        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-4 text-[11px] tracking-wider text-gray-600">
                                <span className="font-bold">RVAULT PROTOCOL</span>
                                <span>
                                    BUILT ON{' '}<span className="text-gradient-animated font-semibold">OPNET</span>{' '}BITCOIN L1
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <a href="https://github.com/JamalBanique/rv" target="_blank" rel="noopener noreferrer"
                                    className="group flex items-center gap-1.5 text-[11px] text-gray-600 transition-colors hover:text-gray-400">
                                    <svg className="h-3.5 w-3.5 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                    </svg>
                                    GitHub
                                </a>
                                <a href="https://x.com/JamalBanique" target="_blank" rel="noopener noreferrer"
                                    className="group flex items-center gap-1.5 text-[11px] text-gray-600 transition-colors hover:text-gray-400">
                                    <svg className="h-3.5 w-3.5 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                    Twitter
                                </a>
                                <a href="https://docs.opnet.org" target="_blank" rel="noopener noreferrer"
                                    className="group flex items-center gap-1.5 text-[11px] text-gray-600 transition-colors hover:text-gray-400">
                                    <svg className="h-3.5 w-3.5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                    Docs
                                </a>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
            </ToastProvider>
            </VaultProvider>
        </BrowserRouter>
    );
}
