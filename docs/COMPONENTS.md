# 컴포넌트 인벤토리

<!-- 이 파일은 scripts/gen-components.mjs 가 생성합니다. 직접 수정하지 마세요. -->
<!-- 갱신: npm run docs:components -->

`@crefle/web-ui` v0.1.0 — 모듈 34개에서 컴포넌트 41개 · 훅 3 · 유틸 1

와이어프레임을 이 목록과 대조하는 방법, 없는 것을 어디에 어떻게 요청하는지는
[컴포넌트 요청 가이드](./component-requests.md)를 보세요.

- 모듈 하나가 여러 컴포넌트를 내보내기도 합니다 (`Card` → `Card`, `CardHeader`, `CardBody`, `CardFooter`).
- 네이티브 HTML 속성(`onClick`, `aria-*`, `className` 등)은 생략했습니다. 아래 props 는 각 컴포넌트가 **직접 정의한** 것입니다.

## Core

### cx

`src/utils/cx.ts`

**cx** _(유틸)_

### ThemeProvider

`src/theme/ThemeProvider.tsx`

**ThemeProvider**
- props `ThemeProviderProps`: defaultTheme, children

**useTheme** _(훅)_

- `Theme`: `light` `dark`

### Icon

`src/components/Icon/Icon.tsx` · 스토리 ✓

**Icon**
- props `IconProps`: name, size, label _(+ 네이티브 HTML 속성)_

### Button

`src/components/Button/Button.tsx` · 스토리 ✓

**Button**
- props `ButtonProps`: variant, size, loading, leadingIcon, trailingIcon _(+ 네이티브 HTML 속성)_

- `ButtonVariant`: `filled` `tonal` `outlined` `text`
- `ButtonSize`: `sm` `md` `lg`

## Phase 2 — Tier 1 components

### IconButton

`src/components/IconButton/IconButton.tsx` · 스토리 ✓

**IconButton**
- props `IconButtonProps`: icon, selectedIcon, variant, size, toggle, pressed, defaultPressed, onPressedChange, 'aria-label' _(+ 네이티브 HTML 속성)_

- `IconButtonVariant`: `standard` `filled` `tonal`
- `IconButtonSize`: `sm` `md` `lg`

### TextField

`src/components/TextField/TextField.tsx` · 스토리 ✓

**TextField**
- props `TextFieldProps`: label, helperText, error, size, leadingIcon, trailingIcon, fullWidth, containerClassName _(+ 네이티브 HTML 속성)_

- `TextFieldSize`: `sm` `md` `lg`

### Select

`src/components/Select/Select.tsx` · 스토리 ✓

**Select**
- props `SelectProps`: options, value, defaultValue, onChange, placeholder, size, disabled, invalid, name, id, leadingIcon, 'aria-label', 'aria-labelledby' _(+ 네이티브 HTML 속성)_

- `SelectSize`: `sm` `md` `lg`
- 기타 타입: `SelectOption`, `SelectOptionGroup`, `SelectItems`

### Checkbox

`src/components/Checkbox/Checkbox.tsx` · 스토리 ✓

**Checkbox**
- props `CheckboxProps`: indeterminate, children _(+ 네이티브 HTML 속성)_

### Radio

`src/components/Radio/Radio.tsx` · 스토리 ✓

**Radio**
- props `RadioProps`: value, children _(+ 네이티브 HTML 속성)_

### RadioGroup

`src/components/Radio/RadioGroup.tsx`

**RadioGroup**
- props `RadioGroupProps`: name, value, defaultValue, onChange, disabled, orientation, 'aria-labelledby', 'aria-label' _(+ 네이티브 HTML 속성)_

- `RadioOrientation`: `vertical` `horizontal`

### Switch

`src/components/Switch/Switch.tsx` · 스토리 ✓

**Switch**
- props `SwitchProps`: label, labelPlacement _(+ 네이티브 HTML 속성)_

- `SwitchLabelPlacement`: `start` `end`

### Chip

`src/components/Chip/Chip.tsx` · 스토리 ✓

**Chip**
- props `ChipProps` = `StatusChipProps` | `FilterChipProps`
  - `StatusChipProps`: size, leadingIcon, children, variant, status, onRemove, removeLabel _(+ 네이티브 HTML 속성)_
  - `FilterChipProps`: size, leadingIcon, children, variant, selected, onSelectedChange _(+ 네이티브 HTML 속성)_

- `ChipStatus`: `success` `error` `warning` `info` `idle`
- `ChipSize`: `sm` `md`

### Badge

`src/components/Chip/Badge.tsx` · 스토리 ✓

**Badge**
- props `BadgeProps`: count, max, dot, showZero, tone _(+ 네이티브 HTML 속성)_

- `BadgeTone`: `primary` `neutral` `error`

### Card

`src/components/Card/Card.tsx` · 스토리 ✓

**Card**
- props `CardProps`: surface, elevation, bordered, interactive, disabled, children _(+ 네이티브 HTML 속성)_

**CardHeader**

**CardBody**

**CardFooter**

- `CardSurface`: `base` `low` `default` `high`
- 기타 타입: `CardSectionProps`, `CardElevation`

### Dialog

`src/components/Dialog/Dialog.tsx` · 스토리 ✓

**Dialog**
- props `DialogProps`: open, onClose, title, size, closeOnBackdropClick, showCloseButton, footer, children _(+ 네이티브 HTML 속성)_

- `DialogSize`: `sm` `md` `lg`

### Tooltip

`src/components/Tooltip/Tooltip.tsx` · 스토리 ✓

**Tooltip**
- props `TooltipProps`: content, placement, delay, children _(+ 네이티브 HTML 속성)_

- `TooltipPlacement`: `top` `bottom` `left` `right`

### Tabs

`src/components/Tabs/Tabs.tsx` · 스토리 ✓

**Tabs**
- props `TabsProps`: items, value, defaultValue, onChange, size, 'aria-label' _(+ 네이티브 HTML 속성)_

- `TabsSize`: `sm` `md`
- 기타 타입: `TabItem`

## Phase 3 — Tier 2 components

### Table

`src/components/Table/Table.tsx` · 스토리 ✓

**Table**
- props `TableProps`: columns, rows, getRowId, caption, density, zebra, sort, defaultSort, onSortChange, selectable, selectedIds, onSelectionChange, empty _(+ 네이티브 HTML 속성)_

- `ColumnAlign`: `start` `center` `end`
- `SortDirection`: `ascending` `descending`
- `TableDensity`: `comfortable` `compact`
- 기타 타입: `Column`, `SortState`

### StatCard

`src/components/StatCard/StatCard.tsx` · 스토리 ✓

**StatCard**
- props `StatCardProps`: label, value, unit, delta, status, statusLabel, children, surface, elevation, bordered _(+ 네이티브 HTML 속성)_

- `StatCardStatus`: `success` `error` `warning` `info` `idle`
- `DeltaDirection`: `up` `down` `flat`
- 기타 타입: `StatCardDelta`

### Progress

`src/components/Progress/Progress.tsx` · 스토리 ✓

**Progress**
- props `ProgressProps`: value, indeterminate, min, max, size, tone, thresholds, valueText, label, showValue _(+ 네이티브 HTML 속성)_

- `ProgressSize`: `sm` `md`
- `ProgressTone`: `primary` `success` `error` `warning` `info` `idle`
- 기타 타입: `ThresholdStop`

### Gauge

`src/components/Progress/Gauge.tsx`

**Gauge**
- props `GaugeProps`: value, min, max, size, thickness, tone, thresholds, valueText, label, showValue _(+ 네이티브 HTML 속성)_

- `GaugeSize`: `sm` `md` `lg`

### AlertBanner

`src/components/AlertBanner/AlertBanner.tsx` · 스토리 ✓

**AlertBanner**
- props `AlertBannerProps`: variant, title, children, icon, onDismiss, dismissLabel, action, assertive _(+ 네이티브 HTML 속성)_

- `AlertVariant`: `success` `error` `warning` `info`

### Toast

`src/components/Toast/Toast.tsx` · 스토리 ✓

**ToastProvider**
- props `ToastProviderProps`: children, position, duration, max, label

**useToast** _(훅)_

- `ToastVariant`: `success` `error` `warning` `info` `idle`
- `ToastPosition`: `top-left` `top-center` `top-right` `bottom-left` `bottom-center` `bottom-right`
- 기타 타입: `ToastOptions`, `ToastInstance`, `ToastApi`, `ToastAction`

### Navigation

`src/components/Navigation/Navigation.tsx` · 스토리 ✓

**Sidebar**
- props `SidebarProps`: 'aria-label', header, footer, collapsible, collapsed, defaultCollapsed, onCollapsedChange, children _(+ 네이티브 HTML 속성)_

**SidebarItem**
- props `SidebarItemProps`: icon, children, href, active, disabled, badge _(+ 네이티브 HTML 속성)_

**SidebarSection**
- props `SidebarSectionProps`: label, children _(+ 네이티브 HTML 속성)_

**Topbar**
- props `TopbarProps`: brand, breadcrumb, actions, 'aria-label' _(+ 네이티브 HTML 속성)_

### Breadcrumb

`src/components/Breadcrumb/Breadcrumb.tsx` · 스토리 ✓

**Breadcrumb**
- props `BreadcrumbProps`: items, maxItems, separatorIcon, expandLabel, 'aria-label' _(+ 네이티브 HTML 속성)_

- 기타 타입: `BreadcrumbItem`

### EmptyState

`src/components/EmptyState/EmptyState.tsx` · 스토리 ✓

**EmptyState**
- props `EmptyStateProps`: size, icon, title, description, action, secondaryAction, live _(+ 네이티브 HTML 속성)_

- `EmptyStateSize`: `sm` `md` `lg`

### Skeleton

`src/components/Skeleton/Skeleton.tsx` · 스토리 ✓

**Skeleton**
- props `SkeletonProps`: variant, width, height, size _(+ 네이티브 HTML 속성)_

**SkeletonText**
- props `SkeletonTextProps`: lines, width, lastLineWidth _(+ 네이티브 HTML 속성)_

- `SkeletonVariant`: `text` `rect` `circle`

### SearchInput

`src/components/SearchInput/SearchInput.tsx` · 스토리 ✓

**SearchInput**
- props `SearchInputProps`: label, helperText, error, size, fullWidth, loading, value, defaultValue, onSearch, onClear, clearLabel, containerClassName _(+ 네이티브 HTML 속성)_

- `SearchInputSize`: `sm` `md` `lg`

### Stepper

`src/components/Stepper/Stepper.tsx` · 스토리 ✓

**Stepper**
- props `StepperProps`: steps, orientation, size _(+ 네이티브 HTML 속성)_

- `StepStatus`: `complete` `current` `pending` `rejected`
- `StepperOrientation`: `horizontal` `vertical`
- `StepperSize`: `sm` `md`
- 기타 타입: `StepperItem`

## Phase 4 — Tier 3 (composition + visualization)

### AppShell

`src/components/AppShell/AppShell.tsx` · 스토리 ✓

**AppShell**
- props `AppShellProps`: topbar, sidebar, children, collapsed, defaultCollapsed, onCollapsedChange, mainId, skipLinkLabel, mainLabel _(+ 네이티브 HTML 속성)_

**useAppShell** _(훅)_

### Chart

`src/components/Chart/Chart.tsx` · 스토리 ✓

**Chart**
- props `ChartProps`: `| ({ type: 'line' } & LineChartProps)
  | ({ type: 'bar' } & BarChartProps)
  | ({ type: 'pie' } & PieChartProps)`

- `ChartType`: `line` `bar` `pie`
- 기타 타입: `ChartPoint`, `ChartSeries`, `ChartBaseProps`, `ReferenceLine`, `ReferenceLineTone`

### LineChart

`src/components/Chart/LineChart.tsx`

**LineChart**
- props `LineChartProps`: title, caption, ariaLabel, width, height, showLegend, showTable, formatValue, series, min, max, yTicks, showGrid, area, showPoints, referenceLines _(+ 네이티브 HTML 속성)_

### BarChart

`src/components/Chart/BarChart.tsx`

**BarChart**
- props `BarChartProps`: title, caption, ariaLabel, width, height, showLegend, showTable, formatValue, series, min, max, yTicks, showGrid, stacked _(+ 네이티브 HTML 속성)_

### PieChart

`src/components/Chart/PieChart.tsx`

**PieChart**
- props `PieChartProps`: title, caption, ariaLabel, width, height, showLegend, showTable, formatValue, data, donut, centerLabel, centerValue _(+ 네이티브 HTML 속성)_

### PageHeader

`src/components/PageHeader/PageHeader.tsx` · 스토리 ✓

**PageHeader**
- props `PageHeaderProps`: title, headingLevel, breadcrumb, description, actions, tabs, size _(+ 네이티브 HTML 속성)_

- `PageHeaderSize`: `compact` `default`
- 기타 타입: `HeadingLevel`
