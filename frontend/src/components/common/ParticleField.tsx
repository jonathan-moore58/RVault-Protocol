import { useMemo } from 'react';

export function ParticleField() {
    const stars = useMemo(() => {
        return Array.from({ length: 40 }, (_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            duration: `${3 + Math.random() * 5}s`,
            delay: `${Math.random() * 5}s`,
        }));
    }, []);

    return (
        <div className="particles">
            {stars.map((s) => (
                <div
                    key={s.id}
                    className="star"
                    style={{
                        left: s.left,
                        top: s.top,
                        '--duration': s.duration,
                        '--delay': s.delay,
                    } as React.CSSProperties}
                />
            ))}
        </div>
    );
}
