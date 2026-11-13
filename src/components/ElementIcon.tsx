import React from 'react';
import {
  CloudLightning,
  Droplets,
  Flame,
  Moon,
  Mountain,
  Snowflake,
  Sun,
  Wind,
} from 'lucide-react';
import { ElementSchool } from '../engine/types';

interface ElementIconProps {
  element: ElementSchool;
  className?: string;
}

export const ElementIcon: React.FC<ElementIconProps> = ({
  element,
  className = 'w-5 h-5',
}) => {
  switch (element) {
    case 'fire':
      return <Flame className={className} />;
    case 'water':
      return <Droplets className={className} />;
    case 'earth':
      return <Mountain className={className} />;
    case 'lightning':
      return <CloudLightning className={className} />;
    case 'wind':
      return <Wind className={className} />;
    case 'ice':
      return <Snowflake className={className} />;
    case 'dark':
      return <Moon className={className} />;
    case 'light':
      return <Sun className={className} />;
  }
};
