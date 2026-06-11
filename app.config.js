require("dotenv").config();

export default ({ config }) => ({
  ...config,
  extra: {
    googleAndroidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID || "",
    googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID || "",
  },
});
