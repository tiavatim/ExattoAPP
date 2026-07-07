import React from 'react';
import { View, Text } from 'react-native';
import { Separacao } from 'src/interfaces/separacao';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  separacao: Separacao;
}

function parseMicrosoftDate(dateString: string): Date | null {
  const match = /\/Date\((\d+)\)\//.exec(dateString);
  if (match && match[1]) {
    return new Date(Number(match[1]));
  }
  return null;
}

export default function SeparacaoCabecalho({ separacao }: Props) {
  const estiloTitulo = { fontFamily: 'Sina-Nova-Bold', fontSize: 16, color: '#fff' };
  const estiloTexto = { fontFamily: 'Sina-Nova-Regular', fontSize: 14, color: '#fff', marginTop: 4 };

  const dataInicio = parseMicrosoftDate(separacao.DtInicio);
  const dataFim = parseMicrosoftDate(separacao.DtPrevisaoFim);

  return (
    <View style={{
      backgroundColor: '#2F4B44',
      marginHorizontal: 12,
      marginBottom: 8,
      padding: 12,
      borderRadius: 8
    }}>
      {/* Linha 1: Pedido + Cliente (100% largura) */}
      <Text style={{ ...estiloTitulo, marginBottom: 8 }}>
        {separacao.IdPedidoVenda} - {separacao.DsCliente}
      </Text>

      {/* Linha 2: 3 colunas com informações */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        {/* Coluna 1 */}
        <View style={{ flex: 1 }}>
          <Text style={estiloTexto}>
            <Ionicons name="calendar-outline" size={16} /> Início: {dataInicio?.toLocaleDateString() ?? '-'}
          </Text>
          <Text style={estiloTexto}>
            <Feather name="info" size={16} /> Status: {separacao.DsStatus}
          </Text>
        </View>

        {/* Coluna 2 */}
        <View style={{ flex: 1 }}>
          <Text style={estiloTexto}>
            <MaterialCommunityIcons name="calendar-clock" size={16} /> Previsão: {dataFim?.toLocaleDateString() ?? '-'}
          </Text>
          {separacao.DsObs && (
            <Text style={estiloTexto}>
              <Feather name="alert-circle" size={16} /> Obs: {separacao.DsObs}
            </Text>
          )}
        </View>

        {/* Coluna 3 */}
        <View style={{ flex: 1 }}>
          <Text style={estiloTexto}>
            <MaterialCommunityIcons name="progress-check" size={16} /> Separado: {separacao.QtTotalSeparada ?? 0} de {separacao.QtTotalVendida ?? 0}
          </Text>
          <Text style={estiloTexto}>({separacao.PcTotalSeparado ?? 0}%)</Text>
        </View>
      </View>
    </View>
  );
}
