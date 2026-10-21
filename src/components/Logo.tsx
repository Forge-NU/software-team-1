import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme/tokens';

interface LogoProps {
  /** Width in points; height follows the logo's proportions */
  size?: number;
  color?: string;
}

// Spotted mark: a dot, a map pin and a seat. Traced from the design file.
const VIEW_WIDTH = 1440;
const VIEW_HEIGHT = 1540;

export function Logo({ size = 40, color = colors.primary.logo }: LogoProps) {
  return (
    <Svg
      width={size}
      height={(size * VIEW_HEIGHT) / VIEW_WIDTH}
      viewBox={`220 40 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      accessibilityLabel="Spotted logo"
    >
      {/* Dot */}
      <Circle cx={393} cy={495} r={155} fill={color} />

      {/* Map pin with a hole (evenodd cuts the inner circle out) */}
      <Path
        fill={color}
        fillRule="evenodd"
        d="M1245 60 C1465 60 1640 235 1640 455 C1640 640 1500 850 1330 1020 C1290 1060 1230 1065 1190 1020 C1010 830 850 640 850 455 C850 235 1025 60 1245 60 Z M1107 470 A145 145 0 1 0 1397 470 A145 145 0 1 0 1107 470 Z"
      />

      {/* Seat */}
      <Path
        fill={color}
        d="M548 1070 C548 1010 600 985 650 975 C740 955 900 955 960 975 C1010 990 1028 1030 1025 1075 C1018 1160 960 1225 872 1265 L885 1525 C886 1545 872 1558 852 1558 L725 1558 C705 1558 692 1545 693 1525 L703 1268 C615 1225 555 1160 548 1070 Z"
      />
    </Svg>
  );
}
