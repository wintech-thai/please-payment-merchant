export type ThemeName =
  | 'ORANGE_DEFAULT'
  | 'BLUE_OCEAN'
  | 'GREEN_NATURAL'
  | 'PURPLE_ROYAL'
  | 'RED_BOLD'
  | 'TEAL_MODERN'
  | 'INDIGO_DEEP'
  | 'PINK_ROSE'

export interface ThemeColors {
  50: string; 100: string; 200: string; 300: string; 400: string
  500: string; 600: string; 700: string; 800: string; 900: string; 950: string
}

export interface Theme {
  name: ThemeName
  label: string
  preview: string
  colors: ThemeColors
}

export const THEMES: Record<ThemeName, Theme> = {
  ORANGE_DEFAULT: {
    name: 'ORANGE_DEFAULT', label: 'Orange', preview: '#f06b1e',
    colors: { 50:'255 248 240', 100:'254 238 221', 200:'253 216 180', 300:'251 185 127', 400:'248 145 70', 500:'240 107 30', 600:'216 85 16', 700:'184 68 13', 800:'150 55 11', 900:'118 44 9', 950:'74 27 5' },
  },
  BLUE_OCEAN: {
    name: 'BLUE_OCEAN', label: 'Blue', preview: '#2563eb',
    colors: { 50:'239 246 255', 100:'219 234 254', 200:'191 219 254', 300:'147 197 253', 400:'96 165 250', 500:'59 130 246', 600:'37 99 235', 700:'29 78 216', 800:'30 64 175', 900:'30 58 138', 950:'23 37 84' },
  },
  GREEN_NATURAL: {
    name: 'GREEN_NATURAL', label: 'Green', preview: '#16a34a',
    colors: { 50:'240 253 244', 100:'220 252 231', 200:'187 247 208', 300:'134 239 172', 400:'74 222 128', 500:'34 197 94', 600:'22 163 74', 700:'21 128 61', 800:'22 101 52', 900:'20 83 45', 950:'5 46 22' },
  },
  PURPLE_ROYAL: {
    name: 'PURPLE_ROYAL', label: 'Purple', preview: '#7c3aed',
    colors: { 50:'245 243 255', 100:'237 233 254', 200:'221 214 254', 300:'196 181 253', 400:'167 139 250', 500:'139 92 246', 600:'124 58 237', 700:'109 40 217', 800:'91 33 182', 900:'76 29 149', 950:'46 16 101' },
  },
  RED_BOLD: {
    name: 'RED_BOLD', label: 'Red', preview: '#dc2626',
    colors: { 50:'254 242 242', 100:'254 226 226', 200:'254 202 202', 300:'252 165 165', 400:'248 113 113', 500:'239 68 68', 600:'220 38 38', 700:'185 28 28', 800:'153 27 27', 900:'127 29 29', 950:'69 10 10' },
  },
  TEAL_MODERN: {
    name: 'TEAL_MODERN', label: 'Teal', preview: '#0d9488',
    colors: { 50:'240 253 250', 100:'204 251 241', 200:'153 246 228', 300:'94 234 212', 400:'45 212 191', 500:'20 184 166', 600:'13 148 136', 700:'15 118 110', 800:'17 94 89', 900:'19 78 74', 950:'4 47 46' },
  },
  INDIGO_DEEP: {
    name: 'INDIGO_DEEP', label: 'Indigo', preview: '#4f46e5',
    colors: { 50:'238 242 255', 100:'224 231 255', 200:'199 210 254', 300:'165 180 252', 400:'129 140 248', 500:'99 102 241', 600:'79 70 229', 700:'67 56 202', 800:'55 48 163', 900:'49 46 129', 950:'30 27 75' },
  },
  PINK_ROSE: {
    name: 'PINK_ROSE', label: 'Pink', preview: '#e11d48',
    colors: { 50:'255 241 242', 100:'255 228 230', 200:'254 205 211', 300:'253 164 175', 400:'251 113 133', 500:'244 63 94', 600:'225 29 72', 700:'190 18 60', 800:'159 18 57', 900:'136 19 55', 950:'76 5 25' },
  },
}

export const THEME_LIST = Object.values(THEMES)
export const DEFAULT_THEME: ThemeName = 'ORANGE_DEFAULT'

export function applyTheme(name: ThemeName | string) {
  const theme = THEMES[name as ThemeName] ?? THEMES[DEFAULT_THEME]
  const root = document.documentElement
  const vars: Record<string, string> = {}
  Object.entries(theme.colors).forEach(([shade, value]) => {
    root.style.setProperty(`--color-primary-${shade}`, value)
    vars[`--color-primary-${shade}`] = value
  })
  try { localStorage.setItem('brandThemeVars', JSON.stringify(vars)) } catch {}
}
