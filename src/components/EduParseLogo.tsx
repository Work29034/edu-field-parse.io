import React from "react";

interface EduParseLogoProps {
  className?: string;
  title?: string;
}

const EduParseLogo: React.FC<EduParseLogoProps> = ({ className, title = "EduParse" }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 128 128"
      role="img"
      aria-labelledby="eduparse-logo-title"
    >
      <title id="eduparse-logo-title">{title}</title>
      <defs>
        <linearGradient id="ep-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--accent))" />
        </linearGradient>
      </defs>
      {/* Paper stack */}
      <g transform="translate(14, 18)">
        <rect x="4" y="6" rx="8" ry="8" width="86" height="60" fill="none" stroke="url(#ep-grad)" strokeWidth="4" opacity="0.35" />
        <rect x="10" y="12" rx="8" ry="8" width="86" height="60" fill="none" stroke="url(#ep-grad)" strokeWidth="4" opacity="0.55" />
        <rect x="16" y="18" rx="8" ry="8" width="86" height="60" fill="none" stroke="url(#ep-grad)" strokeWidth="4" />
        {/* Lines on the top paper */}
        <line x1="26" y1="32" x2="88" y2="32" stroke="hsl(var(--foreground)/0.5)" strokeWidth="3" />
        <line x1="26" y1="44" x2="80" y2="44" stroke="hsl(var(--foreground)/0.4)" strokeWidth="3" />
        <line x1="26" y1="56" x2="70" y2="56" stroke="hsl(var(--foreground)/0.35)" strokeWidth="3" />
      </g>
      {/* Flow arrow into grid */}
      <path d="M42 68 C62 78, 74 86, 92 92" fill="none" stroke="url(#ep-grad)" strokeWidth="6" strokeLinecap="round" />
      {/* Grid table */}
      <g transform="translate(72, 78)">
        <rect x="0" y="0" width="44" height="36" rx="6" fill="none" stroke="url(#ep-grad)" strokeWidth="4" />
        <line x1="0" y1="12" x2="44" y2="12" stroke="url(#ep-grad)" strokeWidth="2.5" />
        <line x1="0" y1="24" x2="44" y2="24" stroke="url(#ep-grad)" strokeWidth="2.5" />
        <line x1="14.6" y1="0" x2="14.6" y2="36" stroke="url(#ep-grad)" strokeWidth="2.5" />
        <line x1="29.2" y1="0" x2="29.2" y2="36" stroke="url(#ep-grad)" strokeWidth="2.5" />
      </g>
    </svg>
  );
};

export default EduParseLogo;
