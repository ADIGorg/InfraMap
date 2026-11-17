export const colors = {
  brand: {
    primary: '#1A5276',
    primaryDark: '#154360',
    secondary: '#48C9B0',
    accent: '#E67E22',
  },
  surface: {
    page: '#F2F3F4',
    card: '#FFFFFF',
    input: '#F2F3F4',
    noticeInfo: '#EBF5FB',
  },
  text: {
    primary: '#1C2833',
    secondary: '#5D6D7E',
    inverse: '#FFFFFF',
    sidebar: '#EAECEE', 
  },
  border: {
    default: '#D1D5DB',
    subtle: '#E5E7EB',
  },
  status: {
    RECEIVED: '#95A5A6',
    UNDER_ANALYSIS: '#F1C40F',
    CONFIRMED: '#3498DB',
    IN_SERVICE: '#E67E22',
    RESOLVED: '#27AE60',
    REJECTED: '#E74C3C',
  },
  priority: {
    LOW: '#27AE60',
    MEDIUM: '#F1C40F',
    HIGH: '#E74C3C',
  }
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export const typography = {
  sizes: {
    xs: 11,
    sm: 13,
    base: 14,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
  },
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  fontFamily: 'Inter',
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;