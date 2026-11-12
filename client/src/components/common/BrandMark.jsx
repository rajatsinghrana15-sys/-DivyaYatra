// Original Yatra Sang mark: a bold D monogram with a branching travel route.
export default function BrandMark({
  size = 40,
  className = "",
  rounded = true,
}) {
  return (
    <svg
      className={`brandSvg ${className}`}
      width={size}
      height={size}
      viewBox="0 0 512 512"
      role="img"
      aria-label="Yatra Sang mark"
    >
      <rect width="512" height="512" rx={rounded ? 116 : 0} fill="#101a30" />
      <path
        d="M162 126h113c81 0 128 49 128 130s-47 130-128 130H162V126Z"
        fill="none"
        stroke="#f5f2e9"
        strokeWidth="31"
        strokeLinejoin="round"
      />
      <path
        className="brandRoute"
        d="m216 204 40 43 45-43m-45 43v81"
        fill="none"
        stroke="url(#brand-route-gradient)"
        strokeWidth="24"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id="brand-route-gradient"
          x1="210"
          y1="200"
          x2="305"
          y2="335"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#ffd66f" />
          <stop offset=".52" stopColor="#ff9f52" />
          <stop offset="1" stopColor="#fa776e" />
        </linearGradient>
      </defs>
      <circle
        className="brandWaypoint"
        cx="256"
        cy="247"
        r="16"
        fill="#58dfc1"
        stroke="#101a30"
        strokeWidth="8"
      />
      <circle cx="216" cy="204" r="8" fill="#ffd66f" />
      <circle cx="301" cy="204" r="8" fill="#ff9f52" />
      <circle cx="256" cy="328" r="8" fill="#fa776e" />
    </svg>
  );
}
