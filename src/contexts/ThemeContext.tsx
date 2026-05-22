import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeColors {
  background: string
  surface: string
  surfaceHover: string
  border: string
  textPrimary: string
  textSecondary: string
  textTertiary: string
  primary: string
  primaryHover: string
  accent: string
  searchBackground: string
  selected: string
  divider: string
  success: string
  error: string
}

// Sternmed Afrika Brand Colors
const brandPrimary = '#17487a'
const brandPrimaryHover = '#123a62'
const brandAccent = '#f59e0b'

const lightColors: ThemeColors = {
  background: '#ffffff',
  surface: '#ffffff',
  surfaceHover: '#f8fafc',
  border: '#e2e8f0',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  primary: brandPrimary,
  primaryHover: brandPrimaryHover,
  accent: brandAccent,
  searchBackground: '#f1f5f9',
  selected: '#e8f0f7',
  divider: '#e2e8f0',
  success: '#34a853',
  error: '#ea4335',
}

const darkColors: ThemeColors = {
  background: '#0f172a',
  surface: '#1e293b',
  surfaceHover: '#334155',
  border: '#334155',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textTertiary: '#64748b',
  primary: brandPrimary,
  primaryHover: brandPrimaryHover,
  accent: brandAccent,
  searchBackground: '#1e293b',
  selected: '#17487a40',
  divider: '#334155',
  success: '#34a853',
  error: '#ea4335',
}

interface ThemeContextType {
  theme: Theme
  colors: ThemeColors
  toggleTheme: () => void
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
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const colors = theme === 'light' ? lightColors : darkColors

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
