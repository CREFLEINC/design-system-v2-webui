import { expect, test } from 'vitest'
import { cx } from './cx'

test('truthy 클래스만 이어붙인다', () => {
  expect(cx('a', false, 'b', null, undefined, 'c')).toBe('a b c')
})
