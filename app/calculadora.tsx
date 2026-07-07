// app/calculadora.tsx
import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import Header from "@/components/header";
import DrawerSceneWrapper from "@/components/drawer";

export default function Calculadora() {
  const [display, setDisplay] = useState("0");

  const digitar = (valor: string) => {
    setDisplay((prev) =>
      prev === "0" && !isNaN(Number(valor)) ? valor : prev + valor
    );
  };

  const limpar = () => setDisplay("0");

  const calcular = () => {
    try {
      // eslint-disable-next-line no-eval
      const resultado = eval(display.replace("%", "/100"));
      setDisplay(String(resultado));
    } catch {
      setDisplay("Erro");
    }
  };

  return (
    <DrawerSceneWrapper>
      <Header />
      <View style={styles.container}>
        <Text style={styles.display}>{display}</Text>

        {/* Linha 1 */}
        <View style={styles.linha}>
          <Botao label="C" cor="#c97d31" onPress={limpar} />
          <Botao label="%" onPress={() => digitar("%")} />
          <Botao icone="divide" onPress={() => digitar("/")} />
          <Botao icone="times" onPress={() => digitar("*")} />
        </View>

        {/* Linha 2 */}
        <View style={styles.linha}>
          <Botao label="7" onPress={() => digitar("7")} />
          <Botao label="8" onPress={() => digitar("8")} />
          <Botao label="9" onPress={() => digitar("9")} />
          <Botao icone="minus" onPress={() => digitar("-")} />
        </View>

        {/* Linha 3 */}
        <View style={styles.linha}>
          <Botao label="4" onPress={() => digitar("4")} />
          <Botao label="5" onPress={() => digitar("5")} />
          <Botao label="6" onPress={() => digitar("6")} />
          <Botao icone="plus" onPress={() => digitar("+")} />
        </View>

        {/* Linha 4 */}
        <View style={styles.linha}>
          <Botao label="1" onPress={() => digitar("1")} />
          <Botao label="2" onPress={() => digitar("2")} />
          <Botao label="3" onPress={() => digitar("3")} />
          <Botao
            icone="equals"
            cor="#c97d31"
            onPress={calcular}

          />
        </View>

        {/* Linha 5 */}
        <View style={styles.linha}>
          <Botao label="0" estilo={{ flex: 2 }} onPress={() => digitar("0")} />
          <Botao label="." onPress={() => digitar(".")} />
        </View>
      </View>
    </DrawerSceneWrapper>
  );
}

function Botao({
  label,
  icone,
  onPress,
  estilo,
  cor,
}: {
  label?: string;
  icone?: any;
  onPress: () => void;
  estilo?: any;
  cor?: string;
}) {
  return (
    <Pressable
      style={[
        styles.botao,
        { backgroundColor: cor || "#163029" },
        estilo,
      ]}
      onPress={onPress}
    >
      {icone ? (
        <FontAwesome5 name={icone} size={22} color="#fff" />
      ) : (
        <Text style={styles.botaoTexto}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#d1ccbd",
    padding: 10,
    justifyContent: "flex-start",
  },
  display: {
    backgroundColor: "#fff",
    fontSize: 40,
    padding: 15,
    textAlign: "right",
    borderRadius: 8,
    marginBottom: 15,
    minHeight: 60,
  },
  linha: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  botao: {
    flex: 1,
    margin: 5,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  botaoTexto: { color: "#fff", fontSize: 22, fontWeight: "bold" },
});
