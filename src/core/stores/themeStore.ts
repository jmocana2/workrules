import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

// Helper to get system preference
const getSystemTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark'

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

// Helper to apply theme to DOM
const applyThemeToDOM = (theme: Theme) => {
  if (typeof document === 'undefined') return

  document.documentElement.dataset.theme = theme
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(theme)
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark', // Default, will be overwritten by persist or system preference

      setTheme: (theme: Theme) => {
        applyThemeToDOM(theme)
        set({ theme })
      },

      toggleTheme: () => {
        set((state) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light'
          applyThemeToDOM(newTheme)
          return { theme: newTheme }
        })
      },
    }),
    {
      name: 'workrules-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Apply theme from storage
          applyThemeToDOM(state.theme)
        } else {
          // No stored preference, use system preference
          const systemTheme = getSystemTheme()
          applyThemeToDOM(systemTheme)
        }
      },
    }
  )
)

// Initialize theme on load
if (typeof window !== 'undefined') {
  const storedTheme = localStorage.getItem('workrules-theme')

  if (!storedTheme) {
    // No stored preference, use system preference
    const systemTheme = getSystemTheme()
    useThemeStore.setState({ theme: systemTheme })
    applyThemeToDOM(systemTheme)
  }
}
