import React, { useState } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Radio } from 'lucide-react';

interface RadarLoadingAnimationProps {
  wavelength?: number;
  message?: string;
  subMessage?: string;
  className?: string;
}

export const RadarLoadingAnimation: React.FC<RadarLoadingAnimationProps> = ({
  wavelength,
  message = 'Đang nạp ảnh FITS từ NASA IRSA & IPAC',
  subMessage,
  className = ''
}) => {
  const [hasError, setHasError] = useState(false);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center p-6 text-center ${className}`}
    >
      <div className="relative flex h-28 w-28 items-center justify-center">
        {!hasError ? (
          <DotLottieReact
            src="/animations/radar-sweep.json"
            loop
            autoplay
            onError={() => setHasError(true)}
            className="h-28 w-28 drop-shadow-[0_0_15px_rgba(0,80,216,0.5)]"
          />
        ) : (
          /* Graceful Fallback SVG if WASM or network has any delay */
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-spaceapps-neonblue bg-spaceapps-deepblue/80">
            <span className="absolute h-full w-full animate-ping rounded-full bg-spaceapps-neonblue opacity-25" />
            <Radio className="h-8 w-8 text-spaceapps-neonyellow animate-pulse" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <p className="font-mono text-xs font-bold uppercase tracking-wider text-spaceapps-neonyellow">
          {message}
        </p>
        <p className="text-[11px] text-slate-300 font-sans max-w-xs">
          {subMessage || (wavelength ? `Cập nhật ma trận dữ liệu quang học bước sóng ${wavelength.toFixed(2)} µm` : 'Đang xử lý ma trận dữ liệu thiên văn đa thời kỳ...')}
        </p>
      </div>
    </div>
  );
};
