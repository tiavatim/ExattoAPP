declare module 'react-native-animatable' {
  import { TextStyle, ViewStyle, ImageStyle, TextProps, ViewProps, ImageProps } from 'react-native';
  import * as React from 'react';

  type Animation = string;

  interface AnimatableProperties<T> {
    animation?: Animation;
    delay?: number;
    duration?: number;
    direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
    easing?: string;
    iterationCount?: number | 'infinite';
    transition?: string[];
    useNativeDriver?: boolean;
    style?: T;
  }

  export class Text extends React.Component<AnimatableProperties<TextStyle> & TextProps> {}
  export class View extends React.Component<AnimatableProperties<ViewStyle> & ViewProps> {}
  export class Image extends React.Component<AnimatableProperties<ImageStyle> & ImageProps> {}

  export function createAnimatableComponent<P>(component: React.ComponentType<P>): React.ComponentClass<P>;
}
