'use client';

import { useId } from 'react';
import styles from './minduAvatar.module.css';

export type AvatarState = 'idle' | 'hi' | 'listening' | 'thinking' | 'teaching' | 'wow' | 'sleepy';

type Props = {
  state: AvatarState;
  /** Animate the mouth as if speaking (combines with any state). */
  talking?: boolean;
  className?: string;
};

const C = {
  orange: '#FF8A3D',
  cream: '#FFE1B3',
  white: '#FFF6E8',
  ink: '#4A2614',
  eye: '#2B1A12',
  tear: '#C4521F',
  green: '#1F6B5D',
  leaf: '#2E9E6A',
  gold: '#E3A93F',
  purple: '#7A3E9D',
  maroon: '#8E2B2B',
};

/**
 * Mindu the red panda, drawn in SVG so each part can move on its own.
 * Poses and animations live in minduAvatar.module.css, keyed on data-state.
 */
export default function MinduAvatar({ state, talking = false, className }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const robe = `robe-${uid}`;
  const tailClip = `tail-${uid}`;

  return (
    <svg
      viewBox="0 0 320 360"
      className={`${styles.root} ${className ?? ''}`}
      data-state={state}
      data-talking={talking}
      role="img"
      aria-label={`Mindu the red panda, ${talking ? 'talking' : state}`}
    >
      <defs>
        <pattern id={robe} patternUnits="userSpaceOnUse" width="16" height="16">
          <rect width="16" height="16" fill={C.maroon} />
          <rect x="2" width="2.5" height="16" fill="#E8692A" />
          <rect x="7" width="1.5" height="16" fill={C.purple} />
          <rect x="10.5" width="2" height="16" fill="#F2B33D" />
          <rect x="14" width="1" height="16" fill={C.green} />
        </pattern>
        <clipPath id={tailClip}>
          <ellipse cx="72" cy="240" rx="36" ry="74" />
        </clipPath>
      </defs>

      <ellipse className={styles.shadow} cx="150" cy="338" rx="72" ry="10" />

      <g className={styles.char}>
        {/* Tail */}
        <g className={styles.tail}>
          <g transform="rotate(-38 72 240)">
            <ellipse cx="72" cy="240" rx="36" ry="74" fill={C.orange} />
            <g clipPath={`url(#${tailClip})`} fill={C.cream}>
              {[170, 200, 230, 260, 290].map(y => <rect key={y} x="30" y={y} width="90" height="14" />)}
            </g>
            <ellipse cx="72" cy="240" rx="36" ry="74" fill="none" stroke={C.ink} strokeWidth="4" />
          </g>
        </g>

        {/* Feet */}
        <ellipse cx="128" cy="326" rx="19" ry="11" fill={C.white} stroke={C.ink} strokeWidth="3.5" />
        <ellipse cx="172" cy="326" rx="19" ry="11" fill={C.white} stroke={C.ink} strokeWidth="3.5" />

        {/* Body: Bhutanese gho */}
        <g className={styles.body}>
          <path d="M108 220 Q150 208 192 220 L207 318 Q150 333 93 318 Z" fill={`url(#${robe})`} stroke={C.ink} strokeWidth="4" strokeLinejoin="round" />
          <path d="M126 214 L150 250 L174 214" fill="none" stroke={C.white} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M112 236 L196 298" stroke="#D9772F" strokeWidth="9" strokeLinecap="round" />
          <path d="M98 292 Q150 303 202 292" fill="none" stroke="#F2B33D" strokeWidth="6" strokeLinecap="round" />
          <circle cx="170" cy="252" r="15" fill="#F7D774" stroke={C.ink} strokeWidth="3" />
          <circle cx="170" cy="252" r="10.5" fill={C.green} />
          <path d="M162 255 L167 248 L170 252 L173 247 L178 255 Z" fill="#9BE3A9" />
          <text x="170" y="263" textAnchor="middle" fontSize="5.5" fontWeight="900" fill="#fff" fontFamily="sans-serif">GMC</text>
        </g>

        {/* Head */}
        <g className={styles.head}>
          <g className={styles.earL}>
            <path d="M72 104 Q60 40 106 52 Q122 72 114 96 Z" fill={C.orange} stroke={C.ink} strokeWidth="4" strokeLinejoin="round" />
            <path d="M82 94 Q76 60 103 63 Q111 77 107 90 Z" fill={C.cream} />
          </g>
          <g className={styles.earR}>
            <path d="M228 104 Q240 40 194 52 Q178 72 186 96 Z" fill={C.orange} stroke={C.ink} strokeWidth="4" strokeLinejoin="round" />
            <path d="M218 94 Q224 60 197 63 Q189 77 193 90 Z" fill={C.cream} />
          </g>

          <ellipse cx="150" cy="140" rx="92" ry="78" fill={C.orange} stroke={C.ink} strokeWidth="4.5" />

          {/* Red panda face markings */}
          <ellipse cx="97" cy="168" rx="30" ry="24" fill={C.white} />
          <ellipse cx="203" cy="168" rx="30" ry="24" fill={C.white} />
          <ellipse cx="150" cy="173" rx="37" ry="28" fill={C.white} />
          <ellipse cx="120" cy="113" rx="13" ry="8" fill={C.white} />
          <ellipse cx="180" cy="113" rx="13" ry="8" fill={C.white} />
          <path d="M115 154 Q109 168 104 180" stroke={C.tear} strokeWidth="5" strokeLinecap="round" fill="none" opacity=".75" />
          <path d="M185 154 Q191 168 196 180" stroke={C.tear} strokeWidth="5" strokeLinecap="round" fill="none" opacity=".75" />
          <ellipse className={styles.blush} cx="100" cy="180" rx="11" ry="6" fill="#FF8FA3" />
          <ellipse className={styles.blush} cx="200" cy="180" rx="11" ry="6" fill="#FF8FA3" />

          {/* Eyes: open / happy (^ ^) / closed */}
          <g className={styles.eyes}>
            <g className={styles.pupils}>
              <g className={styles.eye}>
                <ellipse cx="122" cy="140" rx="12.5" ry="15" fill={C.eye} />
                <circle cx="117.5" cy="134" r="4.6" fill="#fff" />
                <circle cx="126" cy="147" r="2" fill="#fff" />
              </g>
              <g className={styles.eye}>
                <ellipse cx="178" cy="140" rx="12.5" ry="15" fill={C.eye} />
                <circle cx="173.5" cy="134" r="4.6" fill="#fff" />
                <circle cx="182" cy="147" r="2" fill="#fff" />
              </g>
            </g>
          </g>
          <g className={styles.eyesHappy} fill="none" stroke={C.eye} strokeWidth="4.5" strokeLinecap="round">
            <path d="M110 144 Q122 128 134 144" />
            <path d="M166 144 Q178 128 190 144" />
          </g>
          <g className={styles.eyesClosed} fill="none" stroke={C.eye} strokeWidth="4" strokeLinecap="round">
            <path d="M110 140 Q122 149 134 140" />
            <path d="M166 140 Q178 149 190 140" />
          </g>

          {/* Nose */}
          <path d="M141 158 Q150 153 159 158 Q155 167 150 168 Q145 167 141 158 Z" fill={C.eye} />

          {/* Mouths */}
          <path className={styles.mSmile} d="M138 172 Q144 181 150 172 Q156 181 162 172" fill="none" stroke={C.eye} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <path className={styles.mFlat} d="M142 177 Q150 174 158 177" fill="none" stroke={C.eye} strokeWidth="3.5" strokeLinecap="round" />
          <ellipse className={styles.mO} cx="150" cy="181" rx="7" ry="9" fill="#6B1F1F" stroke={C.eye} strokeWidth="3" />
          <g className={styles.mOpen}>
            <path d="M136 171 Q150 199 164 171 Z" fill="#6B1F1F" stroke={C.eye} strokeWidth="3" strokeLinejoin="round" />
            <path d="M143 185 Q150 179 157 185 Q150 192 143 185 Z" fill="#FF7A8A" />
          </g>

          {/* Goggles */}
          <path d="M60 114 Q150 52 240 114" fill="none" stroke="#6B3A1E" strokeWidth="10" strokeLinecap="round" />
          <rect x="138" y="80" width="24" height="8" rx="3" fill={C.gold} stroke={C.ink} strokeWidth="2.5" />
          <circle cx="121" cy="84" r="20" fill={C.gold} stroke={C.ink} strokeWidth="3" />
          <circle cx="121" cy="84" r="13" fill="#3B6FD6" stroke={C.ink} strokeWidth="2" />
          <path d="M113 80 Q116 74 122 73" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".8" />
          <circle cx="179" cy="84" r="20" fill={C.gold} stroke={C.ink} strokeWidth="3" />
          <circle cx="179" cy="84" r="13" fill={C.leaf} stroke={C.ink} strokeWidth="2" />
          <path d="M172 90 Q173 77 187 77 Q186 90 172 90 Z" fill="#fff" opacity=".9" />
          <path d="M173 89 L183 80" stroke={C.leaf} strokeWidth="1.5" />
        </g>

        {/* Arms (pivot at the shoulders) */}
        <g className={styles.armL}>
          <path d="M101 222 L123 222 L121 262 Q112 268 103 262 Z" fill={`url(#${robe})`} stroke={C.ink} strokeWidth="3.5" strokeLinejoin="round" />
          <rect x="101" y="255" width="20" height="9" rx="4" fill={C.white} stroke={C.ink} strokeWidth="2.5" />
          <circle cx="112" cy="273" r="11.5" fill={C.white} stroke={C.ink} strokeWidth="3.5" />
        </g>
        <g className={styles.armR}>
          <path d="M177 222 L199 222 L197 262 Q188 268 179 262 Z" fill={`url(#${robe})`} stroke={C.ink} strokeWidth="3.5" strokeLinejoin="round" />
          <rect x="177" y="255" width="20" height="9" rx="4" fill={C.white} stroke={C.ink} strokeWidth="2.5" />
          <circle cx="188" cy="273" r="11.5" fill={C.white} stroke={C.ink} strokeWidth="3.5" />
        </g>
      </g>

      {/* Effects for each state */}
      <g className={`${styles.fx} ${styles.fxHi}`}>
        <g className={styles.bubble}>
          <rect x="236" y="96" width="64" height="38" rx="19" fill="#fff" stroke={C.ink} strokeWidth="3" />
          <path d="M248 132 L242 146 L258 133" fill="#fff" stroke={C.ink} strokeWidth="3" strokeLinejoin="round" />
          <text x="268" y="122" textAnchor="middle" fontSize="20" fontWeight="900" fill={C.green} fontFamily="sans-serif">Hi!</text>
        </g>
        <g stroke={C.cream} strokeWidth="4" strokeLinecap="round" fill="none" className={styles.waveLines}>
          <path d="M222 168 Q230 160 238 166" />
          <path d="M226 182 Q236 176 244 184" />
        </g>
      </g>

      <g className={`${styles.fx} ${styles.fxListen}`} fill="none" stroke={C.cream} strokeWidth="4.5" strokeLinecap="round">
        <path className={styles.ring1} d="M246 92 Q256 108 246 124" />
        <path className={styles.ring2} d="M258 82 Q273 108 258 134" />
        <path className={styles.ring3} d="M270 72 Q290 108 270 144" />
      </g>

      <g className={`${styles.fx} ${styles.fxThink}`}>
        <text className={styles.qMark} x="246" y="78" fontSize="52" fontWeight="900" fill="#7EE0A0" stroke={C.ink} strokeWidth="2.5" fontFamily="sans-serif">?</text>
        <circle className={styles.dot1} cx="228" cy="104" r="4" fill={C.cream} />
        <circle className={styles.dot2} cx="238" cy="92" r="5.5" fill={C.cream} />
      </g>

      <g className={`${styles.fx} ${styles.fxWow}`}>
        <g className={styles.bangs} fill="#F7C548" stroke={C.ink} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M236 30 L250 30 L246 70 L240 70 Z" />
          <circle cx="243" cy="80" r="6" />
          <path d="M262 40 L274 44 L262 78 L257 76 Z" />
          <circle cx="257" cy="86" r="5" />
        </g>
        <path className={styles.sparkleA} d="M50 60 L55 74 L69 79 L55 84 L50 98 L45 84 L31 79 L45 74 Z" fill="#F7D774" />
        <path className={styles.sparkleB} d="M280 150 L283 159 L292 162 L283 165 L280 174 L277 165 L268 162 L277 159 Z" fill="#F7D774" />
      </g>

      <g className={`${styles.fx} ${styles.fxTeach}`}>
        <rect x="226" y="140" width="84" height="60" rx="8" fill="#A8E6B8" stroke={C.green} strokeWidth="3" />
        <g stroke={C.green} strokeWidth="3.5" strokeLinecap="round">
          <path d="M238 156 L262 156" />
          <path d="M238 168 L256 168" />
          <path d="M238 180 L260 180" />
        </g>
        <path d="M274 186 Q272 160 298 154 Q300 182 274 186 Z" fill="#fff" stroke={C.green} strokeWidth="2.5" />
        <path d="M276 183 L292 160" stroke={C.green} strokeWidth="2" />
      </g>

      <g className={`${styles.fx} ${styles.fxSleep}`} fill={C.cream} fontWeight="900" fontFamily="sans-serif">
        <text className={styles.z1} x="222" y="86" fontSize="20">z</text>
        <text className={styles.z2} x="240" y="64" fontSize="28">z</text>
        <text className={styles.z3} x="262" y="38" fontSize="36">Z</text>
      </g>
    </svg>
  );
}
