import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react'
import { cx } from '../../utils/cx'
import styles from './Skeleton.module.css'

export type SkeletonVariant = 'text' | 'rect' | 'circle'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** text=단일 라인(높이 1em, 기본 width 100%), rect=박스, circle=원(size=지름) */
  variant?: SkeletonVariant
  /** text·rect 너비. number→px, string→그대로. */
  width?: number | string
  /** rect 높이. number→px, string→그대로. */
  height?: number | string
  /** circle 지름(width=height). number→px, string→그대로. */
  size?: number | string
}

function toDimension(value: number | string | undefined): string | undefined {
  if (value === undefined) return undefined
  return typeof value === 'number' ? `${value}px` : value
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  { variant = 'text', width, height, size, className, style, ...rest },
  ref
) {
  const dimStyle: CSSProperties = {}
  if (variant === 'circle') {
    const d = toDimension(size)
    if (d !== undefined) {
      dimStyle.width = d
      dimStyle.height = d
    }
  } else {
    const w = toDimension(width)
    const h = toDimension(height)
    if (w !== undefined) dimStyle.width = w
    if (h !== undefined) dimStyle.height = h
  }

  return (
    <div
      ref={ref}
      className={cx(styles.skeleton, styles[variant], className)}
      style={{ ...dimStyle, ...style }}
      {...rest}
      aria-hidden="true"
    />
  )
})

export interface SkeletonTextProps extends HTMLAttributes<HTMLDivElement> {
  /** 렌더할 라인 수. */
  lines?: number
  /** 각 라인 너비(마지막 제외). number→px, string→그대로. */
  width?: number | string
  /** 마지막 라인 너비 — 실제 문단처럼 짧게. */
  lastLineWidth?: number | string
}

export const SkeletonText = forwardRef<HTMLDivElement, SkeletonTextProps>(function SkeletonText(
  { lines = 3, width = '100%', lastLineWidth = '60%', className, ...rest },
  ref
) {
  return (
    <div ref={ref} className={cx(styles.textGroup, className)} {...rest} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 ? lastLineWidth : width} />
      ))}
    </div>
  )
})
