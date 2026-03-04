interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <div
            className={`skeleton-shimmer rounded-lg ${className}`}
            aria-hidden="true"
        />
    );
}
