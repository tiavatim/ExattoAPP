import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LocalDetalhado } from 'src/interfaces/localDetalhadoInterface';

function parseMicrosoftDate(dateString: string): Date | null {
  const match = /\/Date\((\d+)\)\//.exec(dateString);
  if (match && match[1]) {
    return new Date(Number(match[1]));
  }
  return null;
}

interface Props {
  palete: LocalDetalhado;
}



export default function PaleteInfo({ palete }: Props) {
  const dataFormatada = parseMicrosoftDate(palete.Created_At)?.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) ?? '(inválida)';

  const info = [
    { label: 'Código', valor: palete.Code, icon: 'hash' },
    { label: 'Label', valor: palete.Label_Code, icon: 'tag' },
    { label: 'Nome', valor: palete.Name, icon: 'archive' },
    { label: 'Almoxarifado', valor: palete.Warehouse_Code, icon: 'box' },
    { label: 'Zona', valor: palete.Zone_Code, icon: 'layers' },
    { label: 'Rua', valor: palete.Aisle_Code, icon: 'map-pin' },
    { label: 'Rack', valor: palete.Rack_Code, icon: 'columns' },
    { label: 'Prateleira', valor: palete.Shelf_Code, icon: 'grid' },
    { label: 'Local', valor: palete.Bin_Code, icon: 'inbox' },
    { label: 'Ativo', valor: palete.Is_Active ? 'Sim' : 'Não', icon: 'check-circle' },
    { label: 'Movimentável', valor: palete.Is_Movable ? 'Sim' : 'Não', icon: 'move' },
    { label: 'Criado em', valor: dataFormatada, icon: 'calendar' },
  ];

  return (
    <View style={{
      backgroundColor: '#fff',
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      marginHorizontal: 4,
    }}>
      <Text style={{
        fontFamily: 'Sina-Nova-Bold',
        fontSize: 16,
        color: '#163029',
        marginBottom: 10,
      }}>
        📦 Detalhes do Palete
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {info.map((item, index) => (
          <View
            key={index}
            style={{
              width: '50%',
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 8,
              paddingRight: 8,
            }}
          >
            <Feather name={item.icon as any} size={16} color="#2F4B44" style={{ marginRight: 6 }} />
            <Text style={estiloLinha}>
              {item.label}:{' '}
              <Text style={estiloValor}>{item.valor || '(vazio)'}</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const estiloLinha = {
  fontFamily: 'Sina-Nova-Regular',
  fontSize: 14,
  color: '#163029',
};

const estiloValor = {
  fontFamily: 'Sina-Nova-Bold',
  color: '#2F4B44',
};
