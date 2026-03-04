import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
    value: string;
    className?: string;
    duration?: number;
}

export function AnimatedNumber({ value, className = '', duration = 600 }: AnimatedNumberProps) {
    const [display, setDisplay] = useState(value);
    const [flash, setFlash] = useState(false);
    const prevRef = useRef(value);

    useEffect(() => {
        if (prevRef.current === value) return;
        prevRef.current = value;

        // Trigger flash effect on value change
        setFlash(true);
        const flashTimer = setTimeout(() => setFlash(false), 800);

        const numericPart = parseFloat(value.replace(/[^0-9.-]/g, ''));
        const prevNumeric = parseFloat(display.replace(/[^0-9.-]/g, ''));

        if (isNaN(numericPart) || isNaN(prevNumeric)) {
            setDisplay(value);
            return () => clearTimeout(flashTimer);
        }

        const startTime = performance.now();
        const diff = numericPart - prevNumeric;

        const prefix = value.replace(/[0-9.,\-]+.*/, '');
        const suffix = value.replace(/.*[0-9.,]/, '');
        const decimals = (value.split('.')[1] || '').replace(/[^0-9]/g, '').length;

        function step(now: number) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            const current = prevNumeric + diff * eased;
            const formatted = current.toLocaleString(undefined, {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
            });

            setDisplay(`${prefix}${formatted}${suffix}`);

            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }

        requestAnimationFrame(step);
        return () => clearTimeout(flashTimer);
    }, [value, display, duration]);

    return <span className={`${className} ${flash ? 'number-flash' : ''}`}>{display}</span>;
}
