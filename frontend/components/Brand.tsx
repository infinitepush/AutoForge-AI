"use client";

import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3 group">
      {/* Hexagonal logo mark */}
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="flex-shrink-0">
        <polygon
          points="16,2 28,9 28,23 16,30 4,23 4,9"
          stroke="#ff5a3c"
          strokeWidth="1.5"
          fill="rgba(255,90,60,.08)"
          className="group-hover:fill-[rgba(255,90,60,.14)] transition-colors duration-300"
        />
        <text x="16" y="21" textAnchor="middle" fontSize="13" fontWeight="700" fill="#ff5a3c" fontFamily="Inter,sans-serif">A</text>
      </svg>
      <div className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-[.22em] text-white uppercase">AutoForge</span>
        <span className="text-[9px] tracking-[.15em] text-white/35 uppercase mt-0.5">Digital Twin Studio</span>
      </div>
    </Link>
  );
}
