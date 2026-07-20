import React, { ReactNode, useState } from 'react';
import { ScrollView, StyleProp, View, ViewStyle } from 'react-native';

interface Props {
  children: ReactNode;
  minWidth?: number;
  style?: StyleProp<ViewStyle>;
  fill?: boolean;
}

/**
 * Mantém tabelas legíveis em tablets: ocupa o container quando houver espaço
 * e habilita rolagem horizontal somente abaixo da largura mínima das colunas.
 */
export default function ResponsiveDataTable({ children, minWidth = 760, style, fill = false }: Props) {
  const [containerWidth, setContainerWidth] = useState(0);
  const tableWidth = Math.max(minWidth, containerWidth || minWidth);
  const hasHorizontalOverflow = containerWidth > 0 && containerWidth < minWidth;

  return (
    <View style={[{ width: '100%', borderWidth: 1, borderColor: '#b8b4a6',
      borderRadius: 8, backgroundColor: '#f0ead6' }, fill && { flex: 1 }, style]} onLayout={(event) => {
      const width = Math.round(event.nativeEvent.layout.width);
      if (width > 0 && width !== containerWidth) setContainerWidth(width);
    }}>
      <ScrollView horizontal style={fill ? { flex: 1 } : undefined}
        directionalLockEnabled nestedScrollEnabled bounces={false}
        showsHorizontalScrollIndicator={hasHorizontalOverflow}
        contentContainerStyle={{ width: tableWidth }}>
        <View style={{ flex: 1, width: tableWidth }}>
          {children}
        </View>
      </ScrollView>
    </View>
  );
}
