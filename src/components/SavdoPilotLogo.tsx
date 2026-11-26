import React, { useId } from 'react';

interface SavdoPilotLogoProps {
  size?: 'sm' | 'md' | 'lg';
  tone?: 'dark' | 'light';
  showWordmark?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: {
    box: 'h-7 w-7',
    text: 'text-sm sm:text-base',
    gap: 'gap-2',
  },
  md: {
    box: 'h-8 w-8',
    text: 'text-base sm:text-lg',
    gap: 'gap-2.5',
  },
  lg: {
    box: 'h-10 w-10',
    text: 'text-xl',
    gap: 'gap-3',
  },
};

export const SavdoPilotLogo: React.FC<SavdoPilotLogoProps> = ({
  size = 'md',
  tone = 'dark',
  showWordmark = true,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const bgId = `sp-emblem-bg-${uid}`;
  const ribbonId = `sp-top-ribbon-${uid}`;
  const accentId = `sp-accent-${uid}`;
  const cfg = SIZE_MAP[size];

  return (
    <span className={`inline-flex items-center ${cfg.gap} shrink-0 ${className}`}>
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${cfg.box} shrink-0 drop-shadow-xs`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={bgId} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="52%" stopColor="#3730A3" />
            <stop offset="100%" stopColor="#1E1B4B" />
          </linearGradient>
          <linearGradient id={ribbonId} x1="16" y1="14" x2="48" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E0E7FF" />
          </linearGradient>
          <linearGradient id={accentId} x1="16" y1="34" x2="48" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6EE7B7" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>

        {/* Precision squircle emblem */}
        <rect x="2" y="2" width="60" height="60" rx="16" fill={`url(#${bgId})`} />
        <rect
          x="3"
          y="3"
          width="58"
          height="58"
          rx="15"
          stroke="#A5B4FC"
          strokeOpacity="0.3"
          strokeWidth="1.5"
        />

        {/* Interlocking geometric S-monogram & pilot flight blade */}
        <path
          d="M20 26.5C20 19.6 25.6 14.5 33.4 14.5H47.5L41.8 22.8H32.5C29.4 22.8 27.6 24.1 27.6 26.2C27.6 28.4 29.8 29.4 34.4 30.2L39.6 31.1C45.2 32.1 48.2 35.1 48.2 40.1C48.2 46.8 42.3 51.5 33.8 51.5H16.5L22.2 43.2H33.5C37.1 43.2 39.2 41.8 39.2 39.6C39.2 37.5 37.2 36.6 32.3 35.7L27.2 34.8C22.2 33.9 20 30.8 20 26.5Z"
          fill={`url(#${ribbonId})`}
        />

        {/* Subtle emerald growth slice */}
        <path
          d="M16.5 43.2L25.4 34.8L29.6 38.6L22.2 43.2H16.5Z"
          fill={`url(#${accentId})`}
        />

        {/* Precision 4-point AI spark at top-right */}
        <path
          d="M47 10.5L48.3 13.7L51.5 15L48.3 16.3L47 19.5L45.7 16.3L42.5 15L45.7 13.7L47 10.5Z"
          fill="#6EE7B7"
        />
      </svg>

      {showWordmark && (
        <span
          className={`font-display ${cfg.text} tracking-tight whitespace-nowrap ${
            tone === 'light' ? 'text-white' : 'text-slate-900 dark:text-white'
          }`}
        >
          <span className="font-bold">Savdo</span>
          <span
            className={`font-semibold ${
              tone === 'light'
                ? 'text-indigo-300'
                : 'text-indigo-600 dark:text-indigo-400'
            }`}
          >
            Pilot
          </span>
        </span>
      )}
    </span>
  );
};
