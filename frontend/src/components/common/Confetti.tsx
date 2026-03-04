import { useEffect, useState } from 'react';

const COLORS = ['#00ffaa', '#00e5ff', '#bf5af2', '#5e5ce6', '#ffffff'];

interface ConfettiPiece {
    id: number;
    left: string;
    color: string;
    fallDuration: string;
    shakeDuration: string;
    delay: string;
    size: number;
    shape: 'square' | 'circle';
}

interface ConfettiProps {
    active: boolean;
    duration?: number;
}

export function Confetti({ active, duration = 3000 }: ConfettiProps) {
    const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

    useEffect(() => {
        if (!active) {
            setPieces([]);
            return;
        }

        const newPieces: ConfettiPiece[] = Array.from({ length: 50 }, (_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            fallDuration: `${2 + Math.random() * 2}s`,
            shakeDuration: `${0.5 + Math.random() * 1}s`,
            delay: `${Math.random() * 0.5}s`,
            size: 4 + Math.random() * 6,
            shape: Math.random() > 0.5 ? 'square' : 'circle',
        }));

        setPieces(newPieces);

        const timer = setTimeout(() => setPieces([]), duration);
        return () => clearTimeout(timer);
    }, [active, duration]);

    if (pieces.length === 0) return null;

    return (
        <>
            {pieces.map((p) => (
                <div
                    key={p.id}
                    className="confetti-piece"
                    style={{
                        left: p.left,
                        width: p.size,
                        height: p.size,
                        background: p.color,
                        borderRadius: p.shape === 'circle' ? '50%' : '2px',
                        '--fall-duration': p.fallDuration,
                        '--shake-duration': p.shakeDuration,
                        animationDelay: p.delay,
                    } as React.CSSProperties}
                />
            ))}
        </>
    );
}
