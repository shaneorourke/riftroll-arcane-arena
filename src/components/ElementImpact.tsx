import type { ElementSchool } from '../engine/types';

export function ElementImpact({ element }: { element: ElementSchool }) {
  switch (element) {
    case 'water':
      return <g className="impact-water">
        <path d="M12 128Q58 35 112 52q51 14 36 52-10 21-35 12 25-4 16-20-16-25-62 20-21 21-55 12Z" fill="currentColor" fillOpacity=".55" stroke="#cffafe" strokeWidth="4" />
        <path d="M26 136q35 14 71-3t70 1M61 151q41 13 82-4" fill="none" stroke="currentColor" strokeWidth="5" />
        <circle cx="163" cy="63" r="7" fill="#cffafe" /><circle cx="177" cy="82" r="4" fill="#cffafe" />
      </g>;
    case 'earth':
      return <g className="impact-earth" stroke="#fde68a" strokeWidth="3">
        <path d="m23 151 19-59 24-15 20 74m-12 0 8-83 22-34 23 24 10 93m-14 0 17-63 22-12 21 75Z" fill="#92400e" />
        <path d="m42 92 14 59m48-117 6 117m52-75-9 75M17 158l45-7 33 10 32-8 56 5" fill="none" stroke="currentColor" strokeWidth="5" />
        <path d="m35 65 10-12 6 14-9 7Zm109-18 9-11 9 14-12 6Z" fill="#fbbf24" />
      </g>;
    case 'lightning':
      return <g className="impact-lightning" fill="none" strokeLinejoin="round">
        <path d="m118 9-44 72 30-1-25 45 28-4-16 61m13-102 38-24 17 11 24-14M79 125l-36-6-22 25m88-26 41 23 25-3" stroke="#a855f7" strokeWidth="12" />
        <path d="m118 9-44 72 30-1-25 45 28-4-16 61m13-102 38-24 17 11 24-14M79 125l-36-6-22 25m88-26 41 23 25-3" stroke="#fff6b1" strokeWidth="4" />
      </g>;
    case 'wind':
      return <g className="impact-wind" fill="none" strokeLinecap="round">
        <path d="M20 93c16-43 146-61 158-19 12 40-108 73-134 43-21-24 61-52 93-36 19 10-24 34-52 23" stroke="#a7f3d0" strokeWidth="6" />
        <path d="M44 139c37 16 96 1 112-17M63 151c23 8 58 5 75-4M27 66l17-11m113 90 20-9" stroke="currentColor" strokeWidth="4" />
      </g>;
    case 'dark':
      return <g className="impact-dark">
        <circle cx="100" cy="100" r="49" fill="#0f0520" stroke="currentColor" strokeWidth="5" />
        <path d="M28 128Q8 71 69 67q-19-43 40-46-30 25-11 38 60-32 76 23-34-19-37 16 43 30 7 71-4-45-39-30-26 43-64 17 37-8 28-37-22-20-41 9Z" fill="currentColor" fillOpacity=".6" stroke="#e9b6ff" strokeWidth="2" />
        <circle cx="100" cy="100" r="20" fill="#090313" />
      </g>;
    case 'light':
      return <g className="impact-light">
        <path d="M100 10 114 77 155 46 126 87 190 100 126 113 155 154 114 123 100 190 86 123 45 154 74 113 10 100 74 87 45 46 86 77Z" fill="#fff4bb" stroke="currentColor" strokeWidth="3" />
        <path d="m100 66 34 34-34 34-34-34Z" fill="white" />
        <circle cx="100" cy="100" r="68" fill="none" stroke="#fde68a" strokeWidth="2" />
      </g>;
    default:
      return null;
  }
}
