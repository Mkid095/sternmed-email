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
  searchFocus: string
  selected: string
  shadow: string
  divider: string
}

const lightColors: ThemeColors = {
  background: '#f6f8fc',
  surface: '#ffffff',
  surfaceHover: '#f1f3f4',
  border: '#e0e0e0',
  textPrimary: '#202124',
  textSecondary: '#5f6368',
  textTertiary: '#9aa0a6',
  primary: '#1a73e8',
  primaryHover: '#1765cc',
  accent: '#c2e7ff',
  searchBackground: '#eaf1fb',
  searchFocus: '#e2ecf9',
  selected: '#d3e3fd',
  shadow: 'rgba(0,0,0,0.1)',
  divider: '#e8eaed',
}

const darkColors: ThemeColors = {
  background: '#0d1117',
  surface: '#161b22',
  surfaceHover: '#21262d',
  border: '#30363d',
  textPrimary: '#e6edf3',
  textSecondary: '#8b949e',
  textTertiary: '#6e7681',
  primary: '#58a6ff',
  primaryHover: '#79b8ff',
  accent: '#1f6feb',
  searchBackground: '#21262d',
  searchFocus: '#30363d',
  selected: '#1f6feb40',
  shadow: 'rgba(0,0,0,0.3)',
  divider: '#30363d',
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
