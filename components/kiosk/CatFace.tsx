export function CatFace({ speaking }: { speaking: boolean }) {
  return (
    <svg viewBox="0 0 360 300" className="h-56 w-72" role="img" aria-label="ねこ">
      <g fill="#fffdf8" stroke="#6b3f24" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
        <path d="M98 132 C62 28 168 22 176 118" />
        <path d="M262 132 C298 28 192 22 184 118" />
        <path d="M58 168 C42 230 96 278 180 280 C274 278 324 222 306 156 C290 96 240 74 180 76 C116 74 74 104 58 168" />
      </g>
      <circle cx="128" cy="176" r="13" fill="#6b3f24" />
      <circle cx="232" cy="176" r="13" fill="#6b3f24" />
      {speaking ? (
        <ellipse className="cat-mouth-open" cx="180" cy="220" rx="18" ry="14" fill="#6b3f24" />
      ) : (
        <path
          d="M156 212 Q170 228 180 212 Q190 228 204 212"
          fill="none"
          stroke="#6b3f24"
          strokeWidth="9"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
