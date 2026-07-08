/** truthy한 클래스명만 공백으로 이어붙인다 (외부 의존성 없는 clsx 대체) */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
