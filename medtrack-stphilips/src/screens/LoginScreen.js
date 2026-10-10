import React, { useState, useContext } from "react";
import { View } from "react-native";

import InputField from "../components/InputField";
import Button from "../components/Button";
import { AuthContext } from "../context/AuthContext";

export default function LoginScreen() {
  const { login } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <View style={{ padding: 20 }}>
      <InputField placeholder="Email" onChangeText={setEmail} />
      <InputField placeholder="Password" secureTextEntry onChangeText={setPassword} />

      <Button title="Login" onPress={() => login(email, password)} />
    </View>
  );
}