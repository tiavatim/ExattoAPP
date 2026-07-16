import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

export type BalancasView = 'hub' | 'acabamento' | 'relatorios' | 'rastreabilidade' | 'faixas' | 'configuracoes';

interface Card {
  id: BalancasView;
  label: string;
  descricao: string;
  icon: string;
}

const CARDS: Card[] = [
  {
    id: 'acabamento',
    label: 'Acabamento',
    descricao: 'Monitor de linhas em tempo real — sessões, pesagens e histórico',
    icon: 'activity',
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    descricao: 'Produção diária, qualidade, rastreabilidade e desempenho por operador',
    icon: 'file-text',
  },
  {
    id: 'rastreabilidade',
    label: 'Rastreabilidade',
    descricao: 'Consulte qualquer caixa pelo código impresso na etiqueta',
    icon: 'search',
  },
  {
    id: 'faixas',
    label: 'Faixas',
    descricao: 'Cadastro de faixas de peso por produto',
    icon: 'sliders',
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    descricao: 'Faixas de peso, sincronização e parâmetros operacionais',
    icon: 'settings',
  },
];

interface Props {
  onNavigate: (view: BalancasView) => void;
}

export default function BalancasHub({ onNavigate }: Props) {
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 22, color: '#163029', marginBottom: 4 }}>
        Gerenciar Balanças
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {CARDS.map((card) => (
          <Pressable
            key={card.id}
            onPress={() => onNavigate(card.id)}
            style={({ pressed }) => ({
              flex: 1,
              minWidth: '45%',
              backgroundColor: pressed ? '#0f2219' : '#163029',
              borderRadius: 12,
              padding: 20,
              minHeight: 140,
              justifyContent: 'space-between',
              elevation: 3,
            })}
          >
            <Feather name={card.icon as any} size={28} color="#d1ccbd" />
            <View style={{ marginTop: 16 }}>
              <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 16, color: '#d1ccbd', marginBottom: 4 }}>
                {card.label}
              </Text>
              <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#a8b8b4', lineHeight: 17 }}>
                {card.descricao}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
