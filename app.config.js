require("dotenv").config();

export default ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
    googleAndroidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID || "",
    googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID || "",
    eas: {
      projectId: "3d5e761d-91e2-455f-993f-be80f182ea36",
    },
  },
});
