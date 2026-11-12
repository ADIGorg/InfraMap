import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useCategoriesViewModel } from "./useCategoriesViewModel";

export function CategoriesScreen() {
  const { state, retry } = useCategoriesViewModel();

  const header = (
    <View style={styles.header}>
      <Text style={styles.brand}>InfraMap</Text>
      <Text accessibilityRole="header" style={styles.title}>
        Categorias de ocorrências
      </Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      {state.status === "loaded" ? (
        <FlatList
          data={state.categories}
          keyExtractor={(category) => category.id}
          ListHeaderComponent={header}
          ListEmptyComponent={<Text style={styles.body}>Nenhuma categoria disponível.</Text>}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.categoryName}>{item.name}</Text>
              {item.description ? <Text style={styles.body}>{item.description}</Text> : null}
            </View>
          )}
        />
      ) : (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
        >
          {header}
          {state.status === "loading" ? (
            <View
              style={styles.feedback}
              accessibilityRole="progressbar"
              accessibilityLabel="Carregando categorias"
            >
              <ActivityIndicator color="#175C4D" />
              <Text style={styles.body}>Carregando categorias…</Text>
            </View>
          ) : (
            <View style={styles.errorPanel}>
              <Text accessibilityRole="alert" style={styles.body}>
                {state.message}
              </Text>
              <Pressable accessibilityRole="button" onPress={retry} style={styles.button}>
                <Text style={styles.buttonText}>Tentar novamente</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F2F6F3",
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0,
  },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48 },
  header: { gap: 8, marginBottom: 24 },
  brand: { color: "#175C4D", fontSize: 16, fontWeight: "700" },
  title: { color: "#132B26", fontSize: 32, fontWeight: "700" },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D5E3DC",
    borderWidth: 1,
    borderRadius: 16,
    gap: 6,
    marginBottom: 12,
    padding: 16,
  },
  categoryName: { color: "#132B26", fontSize: 17, fontWeight: "600" },
  body: { color: "#405852", fontSize: 15, lineHeight: 22 },
  feedback: { alignItems: "center", flexDirection: "row", gap: 12 },
  errorPanel: { alignItems: "flex-start", gap: 12 },
  button: {
    backgroundColor: "#175C4D",
    borderRadius: 10,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
});
