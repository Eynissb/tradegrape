import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';

export type SkeletonVariant = 'text' | 'title' | 'circle' | 'rect' | 'button';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string;
  height?: string;
  className?: string;
}

export default function Skeleton({
  variant = 'text',
  width,
  height,
  className,
}: SkeletonProps) {
  const style: CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <div
      aria-hidden="true"
      className={cn('skeleton', variant !== 'rect' && `skeleton-${variant}`, className)}
      style={style}
    />
  );
}
