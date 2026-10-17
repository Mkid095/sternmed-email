import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import {
  getColors,
  fontFamily,
  fontSize,
  space,
  radius,
  layout,
  type Theme,
  type ThemeColors,
} from '../theme/tokens'

export type { Theme, ThemeColors }

// Re-exported so components can import scales from one place.
export { fontFamily, fontSize, space, radius, layout }

interface ThemeContextType {
  theme: Theme
  colors: ThemeColors
  toggleTheme: () => void
  setTheme: (mode: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || saved === 'light') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.style.colorScheme = theme
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const setThemeMode = (mode: Theme) => setTheme(mode)

  const colors = getColors(theme)

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, setTheme: setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  )
}
