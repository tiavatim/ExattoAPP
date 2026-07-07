import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Image } from 'react-native';
import { LocalDetalhado } from 'src/interfaces/localDetalhadoInterface';
import { ItemSeparacao } from 'src/interfaces/ItemSeparacao';
import Svg, { G, Rect, Line, Text as SvgText } from 'react-native-svg';


interface MapaSeparacaoProps {
  locais: LocalDetalhado[];
  itensSeparacao: ItemSeparacao[];
  itemAtual: ItemSeparacao;
}

export default function MapaSeparacao({ locais, itensSeparacao, itemAtual }: MapaSeparacaoProps) {
  const [nivel, setNivel] = useState<'mapa' | 'detalhe'>('mapa');
  const [aisleSelecionado, setAisleSelecionado] = useState<string | null>(null);
  const [rackSelecionado, setRackSelecionado] = useState<number | null>(null);

  const aisles = Array.from(new Set(locais.map(l => l.Aisle_Code))).sort();

  const renderNivel1 = () => {
    // Encontrar index do itemAtual na lista
    const indexAtual = itensSeparacao.findIndex(i =>
      i.produto === itemAtual.produto &&
      i.codigo === itemAtual.codigo &&
      i.local.aisle === itemAtual.local.aisle &&
      i.local.rack === itemAtual.local.rack &&
      i.local.shelf === itemAtual.local.shelf &&
      i.local.bin === itemAtual.local.bin
    );

    const proximoItem = itensSeparacao[indexAtual + 1];

    return (
      <>
        {aisles.map((aisle, index) => {
          const isReposicao = index % 2 === 0;
          if (isReposicao) {
            return (
              <View
                key={`reposicao-${aisle}`}
                style={{ marginBottom: 20, backgroundColor: '#e9e9e9', padding: 8, borderRadius: 6 }}
              >
                <Text
                  style={{
                    fontFamily: 'Sina-Nova-Bold',
                    fontSize: 16,
                    color: '#999',
                    textAlign: 'center',
                  }}
                >
                  Rua {aisle}
                </Text>
              </View>
            );
          }

          const locaisDaRua = locais.filter(l => l.Aisle_Code === aisle);
          const racks = Array.from(new Set(locaisDaRua.map(l => Number(l.Rack_Code))))
            .filter(n => !isNaN(n))
            .sort((a, b) => a - b);

          const racksImpares = racks.filter(r => r % 2 !== 0);
          const racksPares = racks.filter(r => r % 2 === 0);

          const renderRack = (rack: number) => {
            const itemRelacionado = itensSeparacao.find(i => i.local.aisle === aisle && i.local.rack === rack);
            const isAtual = itemAtual.local.aisle === aisle && itemAtual.local.rack === rack;
            const isJaSeparado = itemRelacionado?.separado;

            const cor = isAtual
              ? '#2f8f2f'
              : isJaSeparado
                ? '#86c5ff'
                : itemRelacionado
                  ? '#fff3b0'
                  : '#fff';

            return (
              <Pressable
                key={`rack-${aisle}-${rack}`}
                onPress={() => {
                  setAisleSelecionado(aisle);
                  setRackSelecionado(rack);
                  setNivel('detalhe');
                }}
                style={{
                  width: 60,
                  height: 60,
                  backgroundColor: cor,
                  borderWidth: 1,
                  borderColor: '#163029',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#163029', fontSize: 12 }}>{rack}</Text>
              </Pressable>
            );
          };

          const proximoAisle = proximoItem?.local?.aisle;
          const isSetaEntreEssaRuaEProxima =
            aisle === itemAtual.local.aisle && proximoAisle && proximoAisle !== aisle;


          return (
            <React.Fragment key={`aisle-${aisle}`}>
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontFamily: 'Sina-Nova-Bold',
                    fontSize: 16,
                    color: '#163029',
                    marginBottom: 6,
                  }}
                >
                  Rua {aisle}
                </Text>

                <View style={{ gap: 12 }}>
                  <ScrollView horizontal>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {racksImpares.map(renderRack)}
                    </View>
                  </ScrollView>

                  <ScrollView horizontal>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 30 }}>
                      {racksPares.map(renderRack)}
                    </View>
                  </ScrollView>
                </View>
              </View>

              {isSetaEntreEssaRuaEProxima && (
                <Text
                  style={{
                    fontSize: 24,
                    textAlign: 'center',
                    color: '#2f4b44',
                    marginBottom: 8,
                  }}
                >
                  ⬇
                </Text>
              )}
            </React.Fragment>
          );
        })}
      </>
    );
  };


  const [localSelecionado, setLocalSelecionado] = useState<LocalDetalhado | null>(null); // ⬅️ Step 1

  const renderNivel2 = () => {
    const locaisRack = locais.filter(
      l => l.Aisle_Code === aisleSelecionado && Number(l.Rack_Code) === rackSelecionado
    );

    const shelves = Array.from(
      new Set(locaisRack.map(l => Number(l.Shelf_Code)))
    ).filter(n => !isNaN(n)).sort((a, b) => b - a);

    const colunaLateralLargura = 15;
    const binLargura = 70;
    const binAltura = 50;
    const margemEntreBins = 10;
    const margemVertical = 30;

    const larguraTotal = colunaLateralLargura * 2 + 3 * binLargura + 2 * margemEntreBins + 100;
    const alturaTotal = shelves.length * (binAltura + margemVertical);

    return (
      <>
        <Pressable
          onPress={() => {
            setNivel('mapa');
            setAisleSelecionado(null);
            setRackSelecionado(null);
            setLocalSelecionado(null);
          }}
          style={{ marginBottom: 16, backgroundColor: '#d1ccbd', padding: 10, borderRadius: 6 }}
        >
          <Text style={{ color: '#163029' }}>⬅ Voltar</Text>
        </Pressable>

        {localSelecionado && (
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: '#ccc',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              alignItems: 'center',
            }}
          >
            {/* Informações do produto */}
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 16, color: '#163029', marginBottom: 4 }}>
                {localSelecionado.Ds_Produto} ({localSelecionado.Cd_Produto})
              </Text>
              <Text style={{ color: '#163029', fontFamily: 'Sina-Nova-Regular', marginBottom: 4 }}>
                Local: {localSelecionado.Aisle_Code}-{localSelecionado.Rack_Code}-{localSelecionado.Shelf_Code}{localSelecionado.Bin_Code}
              </Text>
              <Text style={{ color: '#163029', fontFamily: 'Sina-Nova-Regular' }}>
                Qtde em estoque: {localSelecionado.Quantity}
              </Text>
            </View>

            {/* Imagem do produto */}
            <Image
              source={{ uri: localSelecionado.ImageUrl }}
              style={{
                width: 120,
                height: 120,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: '#ccc',
              }}
              resizeMode="contain"
            />
          </View>
        )}

        <ScrollView horizontal style={{ backgroundColor: '#fff' }}>
          <Svg height={alturaTotal} width={larguraTotal}>
            {/* ✅ Colunas laterais azul escuro */}
            <Rect x={0} y={0} width={colunaLateralLargura} height={alturaTotal} fill="#002a53" />
            <Rect
              x={larguraTotal - colunaLateralLargura}
              y={0}
              width={colunaLateralLargura}
              height={alturaTotal}
              fill="#002a53"
            />

            {shelves.map((shelf, shelfIndex) => {
              const bins = locaisRack.filter(l => Number(l.Shelf_Code) === shelf);
              const yBase = shelfIndex * (binAltura + margemVertical);

              return (
                <React.Fragment key={`rack-${aisleSelecionado}-${rackSelecionado}-shelf-${shelf}`}>
                  {bins.map((bin, binIndex) => {
                    const itemRelacionado = itensSeparacao.find(i =>
                      i.local.aisle === bin.Aisle_Code &&
                      i.local.rack === Number(bin.Rack_Code) &&
                      i.local.shelf === Number(bin.Shelf_Code) &&
                      i.local.bin === bin.Bin_Code
                    );

                    const isAtual =
                      itemAtual.local.aisle === bin.Aisle_Code &&
                      itemAtual.local.rack === Number(bin.Rack_Code) &&
                      itemAtual.local.shelf === Number(bin.Shelf_Code) &&
                      itemAtual.local.bin === bin.Bin_Code;

                    const cor = isAtual
                      ? '#2f8f2f'
                      : itemRelacionado?.separado
                        ? '#86c5ff'
                        : itemRelacionado
                          ? '#fff3b0'
                          : '#fff';

                    const x = colunaLateralLargura + binIndex * (binLargura + margemEntreBins) + 10;
                    const y = yBase;
                    const identificacao = `${bin.Aisle_Code}-${bin.Rack_Code}-${bin.Shelf_Code}${bin.Bin_Code}`;

                    return (
                      <G
                        key={`bin-${identificacao}`}
                        onPress={() => setLocalSelecionado(bin)} // ⬅️ Clique funciona aqui
                      >
                        <Rect
                          x={x}
                          y={y}
                          width={binLargura}
                          height={binAltura}
                          fill={cor}
                          stroke="#163029"
                          strokeWidth={1.5}
                          rx={6}
                        />
                        <SvgText
                          x={x + binLargura / 2}
                          y={y + 20}
                          fontSize="14"
                          fill="#163029"
                          fontFamily="Sina-Nova-Bold"
                          textAnchor="middle"
                        >
                          {bin.Bin_Code}
                        </SvgText>
                        <SvgText
                          x={x + binLargura / 2}
                          y={y + 38}
                          fontSize="10"
                          fill="#163029"
                          fontFamily="Sina-Nova-Regular"
                          textAnchor="middle"
                        >
                          {identificacao}
                        </SvgText>
                      </G>
                    );
                  })}

                  {/* ✅ Linha da prateleira marrom */}
                  <Line
                    x1={colunaLateralLargura}
                    y1={yBase + binAltura + 4}
                    x2={larguraTotal - colunaLateralLargura}
                    y2={yBase + binAltura + 4}
                    stroke="#9c5b2e"
                    strokeWidth={6}
                  />
                </React.Fragment>
              );
            })}
          </Svg>
        </ScrollView>
      </>
    );
  };


  return (
    <View style={{ marginTop: 24, paddingHorizontal: 12 }}>
      <Text style={{ fontSize: 16, color: '#163029', marginBottom: 12 }}>
        {nivel === 'mapa'
          ? ''
          : `Rua ${aisleSelecionado} - Rack ${rackSelecionado}`}
      </Text>
      <ScrollView>{nivel === 'mapa' ? renderNivel1() : renderNivel2()}</ScrollView>
    </View>
  );
}
