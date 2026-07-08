// CAPSTONE 데모 — OnMyFactory 모니터링 대시보드.
// @crefle/web-ui 를 실제 소비 앱처럼 배럴(../index)에서만 import 해 조립한다.
// 새 컴포넌트를 만들지 않고, 배포된 DS 컴포넌트 + 얇은 그리드 래퍼만 사용한다.
import {
  AppShell,
  Sidebar,
  SidebarItem,
  SidebarSection,
  Topbar,
  Breadcrumb,
  PageHeader,
  StatCard,
  Gauge,
  AlertBanner,
  Table,
  LineChart,
  BarChart,
  PieChart,
  Chip,
  Badge,
  Button,
  IconButton,
  Icon,
  Card,
  Tabs,
  type Column,
} from '../index'
import {
  stats,
  utilizationSeries,
  throughputSeries,
  statusMix,
  statusMixTotal,
  eventRows,
  type EventRow,
} from './fixtures'
import styles from './OnMyFactoryDashboard.module.css'

/** CREFLE 9-dot 브랜드 마크 — 3×3 도트 그리드. 레드 단일 액센트(currentColor). */
function CrefleMark({ size = 20 }: { size?: number }) {
  const coords = [5, 12, 19]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label="CREFLE"
      style={{ color: 'var(--primary)', flex: 'none' }}
    >
      {coords.map((cy) =>
        coords.map((cx) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.1} fill="currentColor" />)
      )}
    </svg>
  )
}

const percent = (v: number) => `${v}%`
const count = (v: number) => `${v}대`

/** 이벤트 로그 테이블 컬럼 — 상태 열은 Chip으로 시맨틱 렌더. 시각 열은 정렬 가능. */
const eventColumns: Column<EventRow>[] = [
  {
    key: 'time',
    header: '시각',
    sortable: true,
    width: '88px',
    sortAccessor: (row) => row.time,
    render: (row) => <span style={{ color: 'var(--on-surface-variant)' }}>{row.time}</span>,
  },
  { key: 'equipment', header: '설비', width: '128px' },
  {
    key: 'status',
    header: '상태',
    width: '96px',
    render: (row) => (
      <Chip size="sm" status={row.status}>
        {row.statusLabel}
      </Chip>
    ),
  },
  { key: 'message', header: '메시지' },
]

export function OnMyFactoryDashboard() {
  return (
    <div style={{ height: '100vh' }}>
      <AppShell
        mainLabel="설비 모니터링"
        topbar={
          <Topbar
            aria-label="OnMyFactory 상단 바"
            brand={
              <span className={styles.brandMark}>
                <CrefleMark size={22} />
                <span className={styles.brandName}>OnMyFactory</span>
              </span>
            }
            breadcrumb={
              <Breadcrumb items={[{ label: '홈', href: '/' }, { label: '설비 모니터링' }]} />
            }
            actions={
              <>
                <IconButton
                  icon="notifications"
                  aria-label="알림 3건"
                  variant="standard"
                />
                <Badge count={3} aria-label="읽지 않은 알림 3건" />
                <Button variant="text" leadingIcon={<Icon name="account_circle" size={20} />}>
                  프로필
                </Button>
              </>
            }
          />
        }
        sidebar={
          <Sidebar
            aria-label="주요 탐색"
            collapsible
            header={
              <span className={styles.brandMark}>
                <CrefleMark size={22} />
                <span className={styles.sideBrand}>
                  <span className={styles.brandName}>CREFLE</span>
                  <span className={styles.brandSub}>스마트 팩토리</span>
                </span>
              </span>
            }
          >
            <SidebarSection label="워크스페이스">
              <SidebarItem icon="dashboard" href="/" active>
                대시보드
              </SidebarItem>
              <SidebarItem icon="precision_manufacturing" href="/equipment" badge={<Badge count={3} tone="error" />}>
                설비
              </SidebarItem>
              <SidebarItem icon="smart_toy" href="/agents">
                에이전트
              </SidebarItem>
              <SidebarItem icon="list" href="/events">
                이벤트 로그
              </SidebarItem>
            </SidebarSection>
            <SidebarSection label="설정">
              <SidebarItem icon="settings" href="/settings">
                설정
              </SidebarItem>
            </SidebarSection>
          </Sidebar>
        }
      >
        <div className={styles.page}>
          <PageHeader
            title="설비 모니터링"
            description="AI Agent가 실시간으로 설비 상태를 감시합니다."
            actions={
              <>
                <Button variant="outlined" leadingIcon={<Icon name="download" size={20} />}>
                  내보내기
                </Button>
                <Button variant="filled" leadingIcon={<Icon name="settings" size={20} />}>
                  설정
                </Button>
              </>
            }
            tabs={
              <Tabs
                aria-label="모니터링 보기"
                defaultValue="live"
                items={[
                  { value: 'live', label: '실시간', content: null },
                  { value: 'history', label: '이력', content: null },
                  { value: 'alerts', label: '알림', content: null },
                ]}
              />
            }
          />

          {/* KPI — StatCard 4종 */}
          <section className={styles.statGrid} aria-label="핵심 지표">
            {stats.map((s) => (
              <StatCard
                key={s.label}
                label={s.label}
                value={s.value}
                unit={s.unit}
                delta={s.delta}
                status={s.status}
                statusLabel={s.statusLabel}
                bordered
              >
                {s.gauge !== undefined && (
                  <span className={styles.gaugeSpark}>
                    <Gauge value={s.gauge} size="sm" label={`${s.label} ${s.gauge}%`} />
                    <span style={{ font: 'var(--type-label-sm)', color: 'var(--on-surface-muted)' }}>
                      목표 90%
                    </span>
                  </span>
                )}
              </StatCard>
            ))}
          </section>

          {/* 경고 배너 */}
          <AlertBanner
            variant="warning"
            title="압축기 D 온도 임계값 초과"
            action={
              <Button variant="tonal" size="sm" leadingIcon={<Icon name="build" size={18} />}>
                점검 예약
              </Button>
            }
          >
            점검이 필요합니다. AI 에이전트가 자동으로 대응 시나리오를 준비했습니다.
          </AlertBanner>

          {/* 차트 3종 */}
          <section className={styles.chartsGrid} aria-label="추이 및 구성">
            <Card surface="low" bordered style={{ padding: 'var(--space-5)' }}>
              <div className={styles.panel}>
                <h2 className={styles.panelTitle}>시간별 가동률 추이</h2>
                <LineChart
                  series={utilizationSeries}
                  min={60}
                  max={100}
                  width={640}
                  height={300}
                  showPoints
                  formatValue={percent}
                  ariaLabel="라인별 시간대별 가동률 추이"
                />
              </div>
            </Card>

            <Card surface="low" bordered style={{ padding: 'var(--space-5)' }}>
              <div className={styles.panel}>
                <h2 className={styles.panelTitle}>라인별 처리량 (개/시)</h2>
                <BarChart
                  series={throughputSeries}
                  width={440}
                  height={300}
                  ariaLabel="라인별 시간당 처리량"
                />
              </div>
            </Card>

            <Card surface="low" bordered style={{ padding: 'var(--space-5)' }}>
              <div className={styles.panel}>
                <h2 className={styles.panelTitle}>설비 상태 구성비</h2>
                <PieChart
                  data={statusMix}
                  donut
                  width={360}
                  height={300}
                  centerValue={String(statusMixTotal)}
                  centerLabel="총 설비"
                  formatValue={count}
                  ariaLabel="설비 상태 구성비: 정상, 경고, 점검, 정지"
                />
              </div>
            </Card>
          </section>

          {/* 이벤트 로그 테이블 */}
          <Card surface="low" bordered style={{ padding: 'var(--space-5)' }}>
            <div className={styles.tableHead}>
              <h2 className={styles.panelTitle}>설비 이벤트 로그</h2>
              <Button variant="text" size="sm" trailingIcon={<Icon name="open_in_new" size={18} />}>
                전체 보기
              </Button>
            </div>
            <Table<EventRow>
              columns={eventColumns}
              rows={eventRows}
              getRowId={(row) => row.id}
              caption="설비 이벤트 로그 — 시각 기준 정렬 가능"
              defaultSort={{ key: 'time', direction: 'descending' }}
              density="comfortable"
            />
          </Card>
        </div>
      </AppShell>
    </div>
  )
}
