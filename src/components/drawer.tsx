import { useDrawerProgress } from '@react-navigation/drawer';
import { ReactNode } from 'react';
import Animated, {  Extrapolation,  interpolate,  useAnimatedStyle,} from 'react-native-reanimated';

export default function DrawerSceneWrapper({ children }: { children: ReactNode }) {
  const progress = useDrawerProgress();

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(progress.value, [0, 1], [1, 0.8], Extrapolation.CLAMP);
    const translateX = interpolate(progress.value, [0, 1], [0, 200], Extrapolation.CLAMP);
    const rotateY = interpolate(progress.value, [0, 1], [0, -25], Extrapolation.CLAMP) + 'deg';

    return {
      transform: [
        { scale },
        { translateX },
        { rotateY },
      ] as const,
      borderRadius: 0,
      overflow: 'hidden',
    };
  });

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
