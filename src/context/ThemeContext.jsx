import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext()

const THEMES = [
  { id: 'dark', label: 'Midnight', accent: 'lime' },
  { id: 'light', label: 'Daylight', accent: 'lime' },
  { id: 'ocean', label: 'Ocean', accent: 'cyan' },
  { id: 'forest', label: 'Forest', accent: 'emerald' },
  { id: 'sunset', label: 'Sunset', accent: 'orange' },
  { id: 'royal', label: 'Royal', accent: 'purple' },
  { id: 'contrast', label: 'High Contrast', accent: 'yellow' },
]

const THEME_CLASSES = {
  dark: '',
  light: 'theme-light',
  ocean: 'theme-ocean',
  forest: 'theme-forest',
  sunset: 'theme-sunset',
  royal: 'theme-royal',
  contrast: 'theme-contrast',
}

function isDarkTheme(theme) {
  return theme !== 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem('mm_padel_theme') || 'dark'
    } catch { return 'dark' }
  })

  const applyTheme = useCallback((t) => {
    const targets = [document.documentElement, document.body]
    for (const el of targets) {
      if (!el) continue
      el.classList.remove('dark', 'theme-light', 'theme-ocean', 'theme-forest', 'theme-sunset', 'theme-royal', 'theme-contrast')
      if (isDarkTheme(t)) {
        el.classList.add('dark')
      }
      const cls = THEME_CLASSES[t]
      if (cls) el.classList.add(cls)
    }
  }, [])

  const setTheme = useCallback((t) => {
    setThemeState(t)
    try { localStorage.setItem('mm_padel_theme', t) } catch {}
    applyTheme(t)
  }, [applyTheme])

  const toggleTheme = useCallback(() => {
    setTheme(isDarkTheme(theme) ? 'light' : 'dark')
  }, [theme, setTheme])

  useEffect(() => {
    applyTheme(theme)
  }, [])

  const themeMeta = THEMES.find(t => t.id === theme) || THEMES[0]

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, themes: THEMES, themeMeta }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
