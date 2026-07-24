declare module 'lucide-react' {
  import { FC, SVGProps, ForwardRefExoticComponent, RefAttributes } from 'react';

  export interface LucideProps extends Partial<Omit<SVGProps<SVGSVGElement>, 'size'>> {
    size?: string | number;
    absoluteStrokeWidth?: boolean;
  }

  export type Icon = ForwardRefExoticComponent<LucideProps & RefAttributes<SVGSVGElement>>;

  // Icons used across the project
  export const Mic: Icon;
  export const MicOff: Icon;
  export const Brain: Icon;
  export const Loader2: Icon;
  export const ArrowLeft: Icon;
  export const Send: Icon;
  export const Volume2: Icon;
  export const VolumeX: Icon;
  export const Database: Icon;
  export const HelpCircle: Icon;
  export const ChevronLeft: Icon;
  export const ChevronRight: Icon;
  export const Sparkles: Icon;
  export const Target: Icon;
  export const BookOpen: Icon;
  export const Award: Icon;
  export const Play: Icon;
  export const ArrowRight: Icon;
  export const AlertTriangle: Icon;
  export const ShieldCheck: Icon;
  export const Shield: Icon;
  export const CheckCircle: Icon;
  export const CheckCircle2: Icon;
}
