import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FaixasTab } from '@/components/ConfiguracoesView';

interface Props {
  onBack: () => void;
}

export default function FaixasView({ onBack }: Props) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={onBack} hitSlop={12}>
            <Feather name="arrow-left" size={22} color="#163029" />
          </Pressable>
          <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 20, color: '#163029' }}>
            Produtos
          </Text>
        </View>
      </View>

      <FaixasTab />
    </View>
  );
}
