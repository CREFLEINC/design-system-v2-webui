import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function systemTheme(): Theme {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function')
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  return 'light'
}

export interface ThemeProviderProps {
  defaultTheme?: Theme | 'system'
  children: ReactNode
}

export function ThemeProvider({ defaultTheme = 'system', children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() =>
    defaultTheme === 'system' ? systemTheme() : defaultTheme
  )
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme은 <ThemeProvider> 안에서만 사용할 수 있습니다')
  return ctx
}
