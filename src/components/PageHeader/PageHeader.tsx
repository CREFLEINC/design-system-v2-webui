import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cx } from '../../utils/cx'
import styles from './PageHeader.module.css'

export type PageHeaderSize = 'compact' | 'default'
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

// title은 HTMLAttributes의 네이티브 title(string) 속성과 타입이 겹치므로 Omit — ReactNode title로 재정의.
export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** 페이지 제목 (필수). 실제 heading 요소로 렌더된다. */
  title: ReactNode
  /**
   * 제목 heading 레벨 (1~6). 문서 아웃라인/계층용 — 기본 1(h1).
   * 시각적 크기는 `size`가 결정하며 레벨과 분리(h2여도 default 크기 유지 가능).
   */
  headingLevel?: HeadingLevel
  /** 제목 위 경로 슬롯. 보통 기존 <Breadcrumb/>. 자체 nav+aria-current 시맨틱을 그대로 사용. */
  breadcrumb?: ReactNode
  /** 제목 아래 보조 설명(평문 텍스트). */
  description?: ReactNode
  /** 우측 정렬 액션 슬롯 — 보통 <Button/> 그룹. 좁은 폭에서 제목 블록 아래로 래핑. */
  actions?: ReactNode
  /** 헤더 하단 탭 슬롯. 보통 기존 <Tabs/>. */
  tabs?: ReactNode
  /** 밀도 프리셋 — 제목 타입 스케일 + 수직 간격 조절. 기본 'default'. */
  size?: PageHeaderSize
}

// forwardRef 대상 = <header> (HTMLElement). header는 네이티브 시맨틱(문맥에 따라 banner 랜드마크)이므로
// 컴포넌트가 role/aria를 얹지 않는다. rest는 마지막에 스프레드(consumer wins) — header에는
// 컴포넌트 소유 핸들러/aria가 없어 합성할 것도 없다.
export const PageHeader = forwardRef<HTMLElement, PageHeaderProps>(function PageHeader(
  { title, headingLevel = 1, breadcrumb, description, actions, tabs, size = 'default', className, ...rest },
  ref
) {
  const Heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

  return (
    <header ref={ref} data-size={size} className={cx(styles.root, className)} {...rest}>
      {breadcrumb && <div className={styles.breadcrumb}>{breadcrumb}</div>}
      <div className={styles.titleRow}>
        <div className={styles.headingBlock}>
          <Heading className={styles.title}>{title}</Heading>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {tabs && <div className={styles.tabs}>{tabs}</div>}
    </header>
  )
})
