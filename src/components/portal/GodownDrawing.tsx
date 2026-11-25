// A line drawing of a godown elevation in the blueprint style of the hero:
// portal frame, roof sheets, two loading doors, a mezzanine office and the
// clear height dimension. Decorative only.
export function GodownDrawing({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 330" className={className} fill="none" aria-hidden="true">
      <g stroke="#0A4FA3" strokeWidth="1.5" strokeLinejoin="round">
        {/* ground */}
        <path d="M10 290h500" strokeWidth="2" />
        <path d="M10 296h500" strokeOpacity=".35" strokeDasharray="2 6" />
        {/* portal frame and roof */}
        <path d="M60 290V128L260 64l200 64v162" strokeWidth="2.25" />
        <path d="M60 128h400" strokeOpacity=".35" />
        {[100, 140, 180, 220, 300, 340, 380, 420].map((x) => (
          <path key={x} d={`M${x} ${x < 260 ? 128 - ((x - 60) / 200) * 64 : 64 + ((x - 260) / 200) * 64}V128`} strokeOpacity=".3" />
        ))}
        {/* ridge vent */}
        <path d="M238 71h44" strokeWidth="2" />
        {/* loading doors with roller shutter lines */}
        {[110, 220].map((x) => (
          <g key={x}>
            <rect x={x} y="176" width="90" height="114" fill="#fff" />
            {[190, 204, 218, 232, 246, 260, 274].map((y) => (
              <path key={y} d={`M${x + 6} ${y}h78`} strokeOpacity=".4" />
            ))}
          </g>
        ))}
        {/* mezzanine office with windows and a personnel door */}
        <rect x="336" y="150" width="104" height="140" fill="#fff" />
        <path d="M336 214h104" strokeOpacity=".5" />
        <rect x="350" y="166" width="32" height="30" />
        <rect x="394" y="166" width="32" height="30" />
        <rect x="350" y="230" width="28" height="60" />
        <rect x="394" y="232" width="32" height="26" />
      </g>
      {/* clear height dimension */}
      <g stroke="#0C1B33" strokeWidth="1" strokeOpacity=".7">
        <path d="M34 128v162M28 128h12M28 290h12" />
      </g>
      <text x="24" y="212" fill="#0C1B33" fillOpacity=".75" fontSize="12" fontFamily="var(--font-plex)" transform="rotate(-90 24 212)" textAnchor="middle">
        clear height
      </text>
      {/* door dimension */}
      <g stroke="#0C1B33" strokeWidth="1" strokeOpacity=".7">
        <path d="M110 306h90M110 301v10M200 301v10" />
      </g>
      <text x="155" y="324" fill="#0C1B33" fillOpacity=".75" fontSize="12" fontFamily="var(--font-plex)" textAnchor="middle">
        loading door
      </text>
      <text x="388" y="140" fill="#0C1B33" fillOpacity=".75" fontSize="12" fontFamily="var(--font-plex)" textAnchor="middle">
        mezzanine office
      </text>
    </svg>
  );
}
