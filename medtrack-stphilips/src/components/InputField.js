import { TextInput } from "react-native";

export default function InputField(props) {
  return (
    <TextInput
      style={{
        borderWidth: 1,
        padding: 10,
        marginBottom: 10,
        borderRadius: 8
      }}
      {...props}
    />
  );
}