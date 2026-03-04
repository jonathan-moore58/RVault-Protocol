import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVaultContext } from '../../context/VaultContext';

export function VaultSelector() {
    const { selectedVault, availableVaults, selectVault } = useVaultContext();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    if (availableVaults.length <= 1) return null;

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-[12px] font-medium transition-all hover:bg-white/5"
                style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                }}
            >
                <div
                    className="h-2 w-2 rounded-full"
                    style={{ background: selectedVault?.symbol === 'MOTO' ? '#00ffaa' : selectedVault?.symbol === 'PILL' ? '#ff6b6b' : '#bf5af2' }}
                />
                <span className="text-gray-300">{selectedVault?.symbol ?? 'Select'} Vault</span>
                <svg
                    className={`h-3 w-3 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-xl"
                        style={{
                            background: 'rgba(10,14,20,0.98)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                        }}
                    >
                        <div className="px-3 py-2">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-600">
                                Select Vault
                            </span>
                        </div>
                        {availableVaults.map((vault) => {
                            const isActive = vault.id === selectedVault?.id;
                            const dotColor = vault.symbol === 'MOTO' ? '#00ffaa' : vault.symbol === 'PILL' ? '#ff6b6b' : '#bf5af2';
                            return (
                                <button
                                    key={vault.id}
                                    onClick={() => { selectVault(vault.id); setOpen(false); }}
                                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                                        isActive ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                                    }`}
                                >
                                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: dotColor }} />
                                    <div className="flex-1">
                                        <div className="text-[13px] font-medium text-white">{vault.name}</div>
                                        <div className="text-[11px] text-gray-500">{vault.symbol} token</div>
                                    </div>
                                    {isActive && (
                                        <svg className="h-4 w-4 text-[#00ffaa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
