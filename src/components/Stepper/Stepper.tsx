import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cx } from '../../utils/cx'
import { Icon } from '../Icon/Icon'
import styles from './Stepper.module.css'

/** 단계 상태 — 완료 / 진행 중 / 대기 / 반려 */
export type StepStatus = 'complete' | 'current' | 'pending' | 'rejected'
/** 배치 방향 */
export type StepperOrientation = 'horizontal' | 'vertical'
/** 노드·타이포 크기 */
export type StepperSize = 'sm' | 'md'

export interface StepperItem {
  /** 단계명 (필수) */
  label: ReactNode
  /** 단계 상태 */
  status: StepStatus
  /** 노드 심볼 오버라이드 (기본: 상태별 글리프/번호) */
  icon?: ReactNode
  /** 노드 하단 보조 라벨 — 담당자·일자·Chip 등 임의 ReactNode, 다행 허용 */
  description?: ReactNode
}

export interface StepperProps extends HTMLAttributes<HTMLOListElement> {
  /** 단계 배열. 배열 순서 = 진행 순서 */
  steps: StepperItem[]
  /** 배치 방향. 기본 'horizontal' */
  orientation?: StepperOrientation
  /** 노드·타이포 크기. 기본 'md' */
  size?: StepperSize
}

// 상태를 색만이 아니라 텍스트로도 노출한다(접근성 요구). 라벨 뒤에 srOnly 로 붙는다.
const STATUS_LABELS: Record<StepStatus, string> = {
  complete: '완료',
  current: '진행 중',
  pending: '대기',
  rejected: '반려'
}

// 노드 글리프(Icon) px 크기 — 노드 지름(md=40 / sm=24)에 맞춘 값. CSS 가 아닌 JS 상수라 토큰 린트 대상 아님(Breadcrumb 관례).
const GLYPH_SIZE: Record<StepperSize, number> = { md: 20, sm: 16 }

// 기본 심볼: complete→check, rejected→close, current|pending→단계 번호(1-based).
function defaultSymbol(status: StepStatus, index: number, size: StepperSize): ReactNode {
  if (status === 'complete') return <Icon name="check" size={GLYPH_SIZE[size]} />
  if (status === 'rejected') return <Icon name="close" size={GLYPH_SIZE[size]} />
  return index + 1
}

// forwardRef 대상 = <ol> (HTMLOListElement). data-orientation/data-size 가 레이아웃을 구동하므로
// ...rest 를 먼저 스프레드하고 구조 속성을 뒤에 지정해 소비자 override 를 막는다(Progress 관례).
// 표시 전용 컴포넌트 — 클릭/키보드 단계 이동은 제공하지 않는다(onClick 등 rest 는 통과).
export const Stepper = forwardRef<HTMLOListElement, StepperProps>(function Stepper(
  { steps, orientation = 'horizontal', size = 'md', className, ...rest },
  ref
) {
  return (
    <ol
      {...rest}
      ref={ref}
      data-orientation={orientation}
      data-size={size}
      className={cx(styles.root, className)}
    >
      {steps.map((step, idx) => (
        <li
          key={idx}
          className={styles.step}
          data-status={step.status}
          aria-current={step.status === 'current' ? 'step' : undefined}
        >
          <span className={styles.node} aria-hidden="true">
            {step.icon ?? defaultSymbol(step.status, idx, size)}
          </span>
          <span className={styles.labelStack}>
            <span className={styles.label}>
              {step.label}
              <span className={styles.srOnly}>{' — ' + STATUS_LABELS[step.status]}</span>
            </span>
            {step.description != null && (
              <span className={styles.description}>{step.description}</span>
            )}
          </span>
          {idx < steps.length - 1 && (
            <span
              className={styles.connector}
              data-crefle-connector
              data-done={step.status === 'complete' ? '' : undefined}
              aria-hidden="true"
            />
          )}
        </li>
      ))}
    </ol>
  )
})
