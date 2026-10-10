import { View } from "react-native";

export default function Card({ children }) {
  return (
    <View
      style={{
        backgroundColor: "#f3f4f6",
        padding: 15,
        borderRadius: 10,
        marginBottom: 10
      }}
    >
      {children}
    </View>
  );
}