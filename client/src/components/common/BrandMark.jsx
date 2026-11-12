// The Yatra Sang app mark (sun, snow peaks and road). Same artwork as /favicon.svg.
export default function BrandMark({ size = 40, className = "", rounded = true }) {
  return (
    <svg className={`brandSvg ${className}`} width={size} height={size} viewBox="0 0 512 512" role="img" aria-label="Yatra Sang logo">
      <defs>
        <linearGradient id="bm-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1d3566" /><stop offset="1" stopColor="#0e1a33" /></linearGradient>
        <linearGradient id="bm-sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd27a" /><stop offset="1" stopColor="#f2a22c" /></linearGradient>
        <linearGradient id="bm-peak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#cdd8f0" /></linearGradient>
        <clipPath id="bm-clip"><rect width="512" height="512" rx={rounded ? 116 : 0} /></clipPath>
      </defs>
      <g clipPath="url(#bm-clip)">
        <rect width="512" height="512" fill="url(#bm-sky)" />
        <g className="bmRays" stroke="#ffd27a" strokeWidth="12" strokeLinecap="round" opacity=".9">
          <path d="M256 78v-22M150 122l-16-16M362 122l16-16M104 212H80M408 212h24" />
        </g>
        <circle className="bmSun" cx="256" cy="212" r="92" fill="url(#bm-sun)" />
        <path d="M-20 560 196 238l56 70 52-62L532 560Z" fill="url(#bm-peak)" />
        <path d="m196 238 34 42-30-14-26 20 22-48Zm108 8 30 38-30-14-24 20 24-44Z" fill="#9fb2dd" />
        <path d="M232 512 250 392h12l18 120Z" fill="#f2a22c" />
        <path className="bmRoad" d="M256 408v20m0 20v20" stroke="#0e1a33" strokeWidth="7" strokeLinecap="round" />
      </g>
    </svg>
  );
}
