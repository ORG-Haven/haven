import { RING } from "./ui";

// One 9s loop: a release lands on dev, moves to staging, waits at the manual gate, then lands on prod.
const LOOP = { dur: "9s", repeatCount: "indefinite" } as const;
const ROUTE = "M120 352 C180 312 240 302 300 302 C360 302 420 282 480 242";
const ORBIT = "M182 124A118 30 0 1 1 418 124A118 30 0 1 1 182 124";

/** An isometric environment tile with two pods whose lights come on when the release arrives. */
function Platform({ x, y, label, lit }: { x: number; y: number; label: string; lit: { keyTimes: string; values: string } }) {
  const pts = (p: [number, number][]) => p.map(([dx, dy]) => `${x + dx},${y + dy}`).join(" ");
  return (
    <g>
      <polygon className="il-l" points={pts([[-64, 0], [0, 26], [0, 40], [-64, 14]])} />
      <polygon className="il-r" points={pts([[0, 26], [64, 0], [64, 14], [0, 40]])} />
      <polygon className="il-top" points={pts([[0, -26], [64, 0], [0, 26], [-64, 0]])} />
      <polygon className="il-rim" points={pts([[0, -18], [46, 0], [0, 18], [-46, 0]])} />
      {[-36, 26].map((dx) => (
        <g key={dx}>
          <rect className="il-pod" x={x + dx} y={y - 26} width="10" height="22" rx="3" />
          <circle className="il-led ok" cx={x + dx + 5} cy={y - 20} r="2">
            <animate attributeName="opacity" {...lit} {...LOOP} />
          </circle>
        </g>
      ))}
      <text className="il-lbl" x={x} y={y + 68} textAnchor="middle">{label}</text>
    </g>
  );
}

/** A status chip that fades in for part of the loop. */
function Toast({ x, y, w, dot, text, keyTimes, values }: {
  x: number; y: number; w: number; dot: string; text: string; keyTimes: string; values: string;
}) {
  return (
    <g opacity={0}>
      <animate attributeName="opacity" keyTimes={keyTimes} values={values} {...LOOP} />
      <rect className="il-chip" x={x} y={y} width={w} height="34" rx="10" />
      <circle className={dot} cx={x + 18} cy={y + 17} r="4" />
      <text className="il-txt" x={x + 30} y={y + 21}>{text}</text>
    </g>
  );
}

export function HeroIllustration() {
  return (
    <svg
      className="il"
      viewBox="0 0 600 520"
      role="img"
      aria-label="A release travels from dev to staging, waits at a manual gate, then lands on prod, guided by the Haven control plane"
    >
      <defs>
        <linearGradient id="il-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".35" stopColor="#fff" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="il-mask"><rect x="-100" y="200" width="800" height="320" fill="url(#il-fade)" /></mask>
        <filter id="il-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="28" /></filter>
        <path id="il-route" d={ROUTE} />
      </defs>

      <g mask="url(#il-mask)" className="il-grid">
        <path d="M-100 230H700M-100 262H700M-100 300H700M-100 346H700M-100 402H700M-100 470H700" />
        <path d="M300 160L-300 520M300 160L-100 520M300 160L100 520M300 160L300 520M300 160L500 520M300 160L700 520M300 160L900 520" />
      </g>

      <circle className="il-glow" cx="300" cy="120" r="90" filter="url(#il-blur)" />
      <path className="il-beam" d="M300 168L120 318" />
      <path className="il-beam" d="M300 168L300 268" />
      <path className="il-beam" d="M300 168L480 208" />

      {/* Control plane: the Harbor mark with orbiting satellites */}
      <g className="il-float">
        <ellipse className="il-orbit" cx="300" cy="124" rx="118" ry="30" transform="rotate(-8 300 124)" />
        <ellipse className="il-orbit b" cx="300" cy="124" rx="82" ry="20" transform="rotate(10 300 124)" />
        <g transform="translate(248 74) scale(1.62)">
          <path className="logo-ring" d={RING} fill="none" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          <circle className="il-rip" cx="32" cy="29" r="5.5" />
          <circle className="il-rip b" cx="32" cy="29" r="5.5" />
          <circle className="logo-dot" cx="32" cy="29" r="5.5" />
        </g>
        <g className="il-mv">
          <g transform="rotate(-8 300 124)">
            <circle className="il-led" r="3.5"><animateMotion dur="9s" repeatCount="indefinite" path={ORBIT} /></circle>
          </g>
          <circle className="il-led ok" r="2.5">
            <animateMotion dur="6s" begin="-3s" repeatCount="indefinite" path="M418 124A118 30 0 1 1 182 124A118 30 0 1 1 418 124" />
          </circle>
        </g>
        <text className="il-sub" x="300" y="40" textAnchor="middle">haven control plane</text>
      </g>

      <Platform x={120} y={352} label="dev" lit={{ keyTimes: "0;.04;.92;1", values: ".25;1;1;.25" }} />
      <Platform x={300} y={302} label="staging" lit={{ keyTimes: "0;.26;.3;.92;1", values: ".25;.25;1;1;.25" }} />
      <Platform x={480} y={242} label="prod" lit={{ keyTimes: "0;.84;.88;.97;1", values: ".25;.25;1;1;.25" }} />

      <use href="#il-route" className="il-track" />
      <use href="#il-route" className="il-flow" />

      {/* Manual gate before prod: neutral, amber while the release waits, green once accepted */}
      <path className="il-gate" d="M376 278V300M392 270V292" />
      <path className="il-gate" d="M374 278L394 268" />
      <path className="il-gate warn il-mv" d="M374 278L394 268" opacity={0}>
        <animate attributeName="opacity" keyTimes="0;.42;.44;.68;.7;1" values="0;0;1;1;0;0" {...LOOP} />
      </path>
      <path className="il-gate ok il-mv" d="M374 278L394 268" opacity={0}>
        <animate attributeName="opacity" keyTimes="0;.68;.7;.86;.9;1" values="0;0;1;1;0;0" {...LOOP} />
      </path>

      <g className="il-mv">
        {/* The release itself: a small Harbor mark riding the route */}
        <g>
          <animateMotion calcMode="linear" keyPoints="0;0;.5;.5;.72;.72;1;1" keyTimes="0;.06;.26;.32;.44;.7;.85;1" {...LOOP}>
            <mpath href="#il-route" />
          </animateMotion>
          <circle className="il-halo" r="16" />
          <g transform="translate(-11.2 -18) scale(.35)">
            <path className="logo-ring" d={RING} fill="none" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
            <circle className="logo-dot" cx="32" cy="29" r="7" />
          </g>
        </g>
        <Toast x={24} y={244} w={150} dot="il-led" text="git push · 9f2c1ab" keyTimes="0;.02;.2;.24;1" values="0;1;1;0;0" />
        <Toast x={318} y={392} w={178} dot="il-warn" text="waiting at manual gate" keyTimes="0;.43;.46;.66;.69;1" values="0;0;1;1;0;0" />
        <Toast x={418} y={156} w={162} dot="il-ok" text="v1.4.2 live on prod" keyTimes="0;.85;.88;.97;1" values="0;0;1;1;0" />
      </g>
    </svg>
  );
}
