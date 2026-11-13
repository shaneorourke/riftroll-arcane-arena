import type { ElementSchool } from '../engine/types';

export function UltimateScene({ element, fromLeft }: {
  element: Exclude<ElementSchool, 'dark'>;
  fromLeft: boolean;
}) {
  return (
    <svg className={`ultimate-scene ultimate-scene-${element}`} viewBox="0 0 800 600"
      preserveAspectRatio="none" aria-hidden="true">
      <g transform={fromLeft ? undefined : 'translate(800 0) scale(-1 1)'}>
        {element === 'fire' && (
          <g fill="#f97316" fillOpacity=".38" stroke="#ffce78" strokeWidth="3">
            <path d="M0 600V510Q80 520 82 386Q154 475 195 431Q250 370 215 302Q326 364 313 493Q390 449 413 359Q465 481 520 468Q563 429 532 327Q642 382 638 481Q711 441 755 329Q810 400 800 600Z" />
            <path d="M0 600v-50q108 4 148-81 32 81 106 67 65-30 90-89 22 100 107 91 65-6 112-81 15 82 103 78 55-14 134-80v145Z" fill="#fb923c" />
          </g>
        )}
        {element === 'water' && (
          <g fill="#0ea5e9" fillOpacity=".34" stroke="#b5f7ff" strokeWidth="4">
            <path d="M-30 560C78 405 152 385 252 408c98 22 142 15 212-57 56-58 11-122-47-100l-38 25 18-52 45-33 43 4 24-22 11 36 49 29-28 26-39-9c35 122-50 237-182 243C173 505 125 530 92 620H-30Z" />
            <path d="M-20 572q132-98 255-46t245 0 342-32M-20 595q130-58 242-19t260-1 340-30" fill="none" />
            <circle cx="500" cy="225" r="5" fill="#e0faff" />
          </g>
        )}
        {element === 'earth' && (
          <g fill="#713f20" fillOpacity=".67" stroke="#ffc277" strokeWidth="3">
            <path d="m-30 620 24-250 54-64 41 54 20 260m20 0 28-154 43-54 45 37 24 171m265 0 21-165 55-51 41 44 29 172m15 0 19-273 58-67 48 50 9 290" />
            <path d="m0 540 113-12 89 14 80-15 106 8 104-16 108 19 200-11" fill="none" strokeWidth="5" />
          </g>
        )}
        {element === 'lightning' && (
          <g fill="none" strokeLinejoin="round">
            <path d="m95-20 62 109-44-8 89 122-36-13 29 63m407-280-63 107 48-9-107 146 55-13-41 71M728 5l-34 79 30 0-43 93M170 98l63 1 36 55m294-67-72 9-38 46" stroke="#a855f7" strokeWidth="15" opacity=".64" />
            <path d="m95-20 62 109-44-8 89 122-36-13 29 63m407-280-63 107 48-9-107 146 55-13-41 71M728 5l-34 79 30 0-43 93M170 98l63 1 36 55m294-67-72 9-38 46" stroke="#fff5c2" strokeWidth="4" />
          </g>
        )}
        {element === 'wind' && (
          <g fill="none" stroke="#a7f3d0" strokeLinecap="round">
            <path d="M-60 430C-11 198 335 133 624 202c230 55 254 203 67 254-178 49-566 17-498-100 50-86 308-96 413-27 92 61-97 115-243 81" strokeWidth="7" opacity=".67" />
            <path d="M-35 461C34 251 340 191 626 240c161 27 217 121 127 173M40 501q239 87 549 17M123 180q184-65 402-43" strokeWidth="3" opacity=".62" />
          </g>
        )}
        {element === 'ice' && (
          <g fill="#67e8f9" fillOpacity=".32" stroke="#e4fbff" strokeWidth="3">
            <path d="M0 0h180L72 140 55 100 0 170Zm800 0H620l108 140 17-40 55 70ZM0 600V435l65 43 22-55 109 177Zm800 0V435l-65 43-22-55-109 177Z" />
            <path d="m0 250 44 43-19 35 45 37m730-115-44 43 19 35-45 37M255 0l42 67-19 21 35 53m232-141-42 67 19 21-35 53" fill="none" />
          </g>
        )}
        {element === 'light' && (
          <g fill="#fde68a" fillOpacity=".26" stroke="#fff8cd">
            <path d="M350 0h100l88 420H262ZM0 0h104l193 346L0 118Zm800 0H696L503 346l297-228Z" />
            <circle cx="400" cy="104" r="65" fill="none" strokeWidth="3" />
            <path d="m400 40 12 51 51 13-51 13-12 51-12-51-51-13 51-13Z" fill="#fff9dc" />
          </g>
        )}
      </g>
    </svg>
  );
}
