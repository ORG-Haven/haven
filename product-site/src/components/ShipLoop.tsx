import { RING } from "./ui";

// Same loop as the console's sign-in panel (hvn-console/src/features/auth/AuthPanel.tsx),
// drawn in currentColor so it takes the colour of whatever surface it sits on.
const HULL = "M8 36A40 40 0 0 0 20 46H44A40 40 0 0 0 56 36";
// The dot and the sail share one four-curve path so SMIL can morph between them.
const DOT = "M32 23.5C35.04 23.5 37.5 25.96 37.5 29C37.5 32.04 35.04 34.5 32 34.5C28.96 34.5 26.5 32.04 26.5 29C26.5 25.96 28.96 23.5 32 23.5Z";
const SAIL = "M31 2C38 10 45 21 50 32C46.7 32 43.3 32 40.5 32C37 32 34 32 31 32C31 22 31 12 31 2Z";

// One 12s loop: logo → ship → sails off right, back in from the left → logo.
const LOOP = { dur: "12s", repeatCount: "indefinite" } as const;
const MORPH = { keyTimes: "0;.12;.22;.8;.9;1", calcMode: "spline", keySplines: "0 0 1 1;.4 0 .2 1;0 0 1 1;.4 0 .2 1;0 0 1 1" } as const;

function Wave({ d, dash, drift, peak, fade }: { d: string; dash: string; drift: [string, string]; peak: number; fade: string }) {
  return (
    <path d={d} stroke="currentColor" fill="none" strokeWidth={1.2} strokeDasharray={dash} strokeLinecap="round" opacity={0}>
      <animate attributeName="stroke-dashoffset" values={`0;${drift[0]}`} dur={drift[1]} repeatCount="indefinite" />
      <animate attributeName="opacity" values={`0;0;${peak};${peak};0;0`} keyTimes={fade} {...LOOP} />
    </path>
  );
}

export function ShipLoop() {
  return (
    <>
      <svg className="cta-move" viewBox="-68 -6 200 80" aria-hidden="true">
        <Wave d="M-68 50H132" dash="10 6" drift={["-32", "2s"]} peak={0.9} fade="0;.16;.24;.76;.86;1" />
        <Wave d="M-60 56H124" dash="16 9" drift={["-50", "3.2s"]} peak={0.6} fade="0;.18;.26;.74;.84;1" />
        <Wave d="M-40 62H104" dash="6 10" drift={["-32", "2.6s"]} peak={0.35} fade="0;.2;.28;.72;.82;1" />
        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 0;0 0;150 0;-150 0;0 0;0 0"
            keyTimes="0;.26;.49;.4901;.74;1"
            calcMode="spline"
            keySplines=".45 0 .9 .6;.45 0 .9 .6;0 0 1 1;.1 .4 .4 1;0 0 1 1"
            {...LOOP}
          />
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 32 40;0 32 40;-4 32 40;3 32 40;-3 32 40;4 32 40;-3 32 40;3 32 40;0 32 40;0 32 40"
              keyTimes="0;.22;.3;.38;.46;.54;.62;.7;.78;1"
              {...LOOP}
            />
            <path d={RING} stroke="currentColor" fill="none" strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round">
              <animate attributeName="d" values={[RING, RING, HULL, HULL, RING, RING].join(";")} {...MORPH} {...LOOP} />
            </path>
            <path d={DOT} fill="currentColor">
              <animate attributeName="d" values={[DOT, DOT, SAIL, SAIL, DOT, DOT].join(";")} {...MORPH} {...LOOP} />
            </path>
            <path d="M31 32V36" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" opacity={0}>
              <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;.17;.22;.8;.85;1" {...LOOP} />
            </path>
          </g>
        </g>
      </svg>
      <svg className="cta-still" viewBox="-68 -6 200 80" aria-hidden="true">
        <path d={RING} stroke="currentColor" fill="none" strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" />
        <path d={DOT} fill="currentColor" />
      </svg>
    </>
  );
}
