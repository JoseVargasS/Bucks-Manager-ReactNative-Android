import { ActivityIndicator, Image, View } from "react-native";
import { SPLASH_BG, SPLASH_SPINNER, SPLASH_INDICATOR_OFFSET } from "@/theme/constants";

export function StartupSplash() {
  return (
    <View style={{ flex: 1, backgroundColor: SPLASH_BG }}>
      <Image
        source={require("../../../assets/splash-bucks.png")}
        resizeMode="cover"
        style={{ width: "100%", height: "100%" }}
      />
      <ActivityIndicator
        color={SPLASH_SPINNER}
        style={{ position: "absolute", bottom: SPLASH_INDICATOR_OFFSET, alignSelf: "center" }}
      />
    </View>
  );
}
