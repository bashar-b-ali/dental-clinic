import { ms, wp } from './responsive';

export const colors = {
  primary: '#1A75B9',       // logo blue - main brand
  primaryLight: '#40ABE0',  // logo light blue
  primaryDark: '#145E94',   // darker shade
  primaryBg: '#E8F4FD',     // very light blue tint

  accent: '#40ABE0',        // logo light blue as accent
  accentLight: '#A3D5F0',   // soft blue

  success: '#10B981',       // emerald-500
  successBg: '#D1FAE5',     // emerald-100
  warning: '#F59E0B',       // amber-500
  warningBg: '#FEF3C7',     // amber-100
  danger: '#EF4444',        // red-500
  dangerBg: '#FEE2E2',      // red-100

  bg: '#F8FAFC',            // slate-50
  card: '#FFFFFF',
  border: '#E2E8F0',        // slate-200
  borderLight: '#F1F5F9',   // slate-100

  text: '#0F172A',          // slate-900
  textSecondary: '#64748B', // slate-500
  textMuted: '#94A3B8',     // slate-400
  textOnPrimary: '#FFFFFF',
};

export const spacing = {
  xs: wp(4),
  sm: wp(8),
  md: wp(16),
  lg: wp(24),
  xl: wp(32),
};

export const borderRadius = {
  sm: wp(8),
  md: wp(12),
  lg: wp(16),
  xl: wp(24),
  full: 999,
};

export const fontSize = {
  xs: ms(12),
  sm: ms(14),
  md: ms(16),
  lg: ms(18),
  xl: ms(22),
  xxl: ms(28),
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
};
