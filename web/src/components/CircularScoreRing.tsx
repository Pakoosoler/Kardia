import React, { useId } from 'react';

interface CircularScoreRingProps {
  value: number; // 0 to 100 or 0 to 10
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
}

export const CircularScoreRing: React.FC<CircularScoreRingProps> = ({
  value,
  max = 100,
  size = 48,
  strokeWidth = 4.5,
  label,
  sublabel,
}) => {
  const gradientId = useId();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value / max));
  const offset = circumference * (1 - clamped);

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5B46F6" />
            <stop offset="100%" stopColor="#2EC4B6" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F1F3F5"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
        <span className="tabular-nums font-bold text-on-surface" style={{ fontSize: size * 0.24 }}>
          {label ?? value}
        </span>
        {sublabel ? (
          <span
            className="font-semibold text-secondary uppercase tracking-wider mt-0.5"
            style={{ fontSize: Math.max(8, size * 0.1) }}
          >
            {sublabel}
          </span>
        ) : null}
      </div>
    </div>
  );
};
