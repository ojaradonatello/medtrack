import { TouchableOpacity, Text } from "react-native";

export default function Button({ title, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "#4f46e5",
        padding: 12,
        borderRadius: 8,
        alignItems: "center"
      }}
    >
      <Text style={{ color: "#fff" }}>{title}</Text>
    </TouchableOpacity>
  );
}