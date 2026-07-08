import { expect, test } from 'vitest'
import { VERSION } from './index'

test('패키지 진입점이 로드된다', () => {
  expect(VERSION).toBe('0.1.0')
})
