import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// 각 테스트 후 DOM 정리
afterEach(() => cleanup())

// vitest + @testing-library/react + user-event fake-timers 호환 심(shim).
// RTL의 asyncWrapper는 마이크로태스크 큐를 setTimeout(...,0)으로 비우는데, fake timers가 켜져 있으면
// 그 0ms 타이머를 진행시킬 때만 resolve된다. 진행 여부를 `typeof jest !== 'undefined'`로 판별하므로
// vitest에는 jest 전역이 없어 타이머가 영원히 대기 → hang. 이 심이 판별을 통과시키고 vitest 타이머로 위임한다.
// 실제 타이머 테스트는 .clock 부재로 jestFakeTimersAreEnabled가 false를 반환하므로 영향받지 않는다.
;(globalThis as unknown as { jest?: unknown }).jest ??= {
  advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms),
}

// jsdom에는 matchMedia가 없다 — ThemeProvider의 system 감지용 스텁
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false
    })
  })
}
