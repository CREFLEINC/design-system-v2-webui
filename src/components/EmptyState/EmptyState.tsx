import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cx } from '../../utils/cx'
import styles from './EmptyState.module.css'

export type EmptyStateSize = 'sm' | 'md' | 'lg'

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** sm = 인라인(카드/패널 내부), md = 기본, lg = 전체 페이지 플레이스홀더 */
  size?: EmptyStateSize
  /** 선행 아이콘(대형·뮤트). 보통 <Icon name="inbox" size={…} /> 또는 일러스트 노드. 래퍼가 색을 on-surface-muted로, aria-hidden으로 장식 처리한다 */
  icon?: ReactNode
  /** 제목(필수). 문서 아웃라인 오염을 피하려 heading 태그가 아닌 <p>로 렌더 */
  title: ReactNode
  /** 보조 설명. on-surface-muted, 가독 폭 제한 */
  description?: ReactNode
  /** 주 액션 슬롯 — <Button>을 컴포즈(예: filled) */
  action?: ReactNode
  /** 보조 액션 슬롯 — <Button variant="text|outlined"> 등 */
  secondaryAction?: ReactNode
  /** true면 root에 role="status"(aria-live=polite 함의). 검색 결과 없음 등 "동적으로 나타나는" 빈 상태에만 사용. 정적 플레이스홀더는 기본(role 없음) */
  live?: boolean
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  { size = 'md', icon, title, description, action, secondaryAction, live = false, className, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={cx(styles.root, styles[size], className)}
      {...rest}
      role={live ? 'status' : rest.role}
    >
      {icon && (
        <div className={styles.icon} aria-hidden="true">
          {icon}
        </div>
      )}
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {(action || secondaryAction) && (
        <div className={styles.actions}>
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
})
