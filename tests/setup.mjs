import { registerHooks } from "node:module";
import { resolve as pathResolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = pathResolve(__dirname, "..");

export const secureStoreMock = {
  values: new Map(),
  getError: null,
  setError: null,
  deleteError: null,
  reset() {
    this.values.clear();
    this.getError = null;
    this.setError = null;
    this.deleteError = null;
  },
  async getItemAsync(key) {
    if (this.getError) throw this.getError;
    return this.values.get(key) ?? null;
  },
  async setItemAsync(key, value) {
    if (this.setError) throw this.setError;
    this.values.set(key, value);
  },
  async deleteItemAsync(key) {
    if (this.deleteError) throw this.deleteError;
    this.values.delete(key);
  },
};

export const fileSystemMock = {
  files: new Map(),
  writeError: null,
  reset() {
    this.files.clear();
  },
  async getInfoAsync(path) {
    return { exists: this.files.has(path) };
  },
  async readAsStringAsync(path) {
    if (!this.files.has(path)) throw new Error(`Missing mock file: ${path}`);
    return this.files.get(path);
  },
  async writeAsStringAsync(path, value) {
    if (this.writeError) throw this.writeError;
    this.files.set(path, value);
  },
  async deleteAsync(path) {
    this.files.delete(path);
  },
};

globalThis.__bucksSecureStoreMock = secureStoreMock;
globalThis.__bucksFileSystemMock = fileSystemMock;
globalThis.__bucksReactMock = {
  resetReactMock: () => {},
};

const moduleUrl = (source) => `data:text/javascript,${encodeURIComponent(source)}`;
const secureStoreUrl = moduleUrl(`
  const mock = () => globalThis.__bucksSecureStoreMock;
  export const getItemAsync = (...args) => mock().getItemAsync(...args);
  export const setItemAsync = (...args) => mock().setItemAsync(...args);
  export const deleteItemAsync = (...args) => mock().deleteItemAsync(...args);
`);
const fileSystemUrl = moduleUrl(`
  const mock = () => globalThis.__bucksFileSystemMock;
  export const documentDirectory = "mock://document/";
  export const cacheDirectory = "mock://cache/";
  export const getInfoAsync = (...args) => mock().getInfoAsync(...args);
  export const readAsStringAsync = (...args) => mock().readAsStringAsync(...args);
  export const writeAsStringAsync = (...args) => mock().writeAsStringAsync(...args);
  export const deleteAsync = (...args) => mock().deleteAsync(...args);
`);
const vectorIconsUrl = moduleUrl(`export default {};`);
const reactNativeUrl = moduleUrl(`
  const globalAlert = globalThis.__bucksAlertMock || { alert: () => {} };
  export const Alert = globalAlert;
  export const Platform = { OS: "android", select: (o) => o.android ?? o.default };
  export const Dimensions = { get: () => ({ width: 390, height: 844 }) };
  export const PixelRatio = { get: () => 3 };
`);
// ponytail: hook-using modules (e.g. useGoogleSync) are unit-tested outside
// of a render. The mock here lets them be called directly. State/refs are
// backed by plain JS objects that mirror React's surface.
const reactUrl = moduleUrl(`
  const states = [];
  const refs = [];
  let stateIndex = 0;
  let refIndex = 0;
  const resetIndices = () => { stateIndex = 0; refIndex = 0; };
  export const useState = (initial) => {
    const i = stateIndex++;
    if (states[i] === undefined) states[i] = typeof initial === "function" ? initial() : initial;
    const setter = (v) => { states[i] = typeof v === "function" ? v(states[i]) : v; };
    return [states[i], setter];
  };
  export const useEffect = () => {};
  export const useMemo = (fn) => fn();
  export const useCallback = (fn) => fn;
  export const useRef = (initial) => {
    const i = refIndex++;
    if (refs[i] === undefined) refs[i] = { current: initial };
    return refs[i];
  };
  export const resetReactMock = () => {
    states.length = 0;
    refs.length = 0;
    stateIndex = 0;
    refIndex = 0;
  };
`);
const googleSigninUrl = moduleUrl(`
  const mock = () => globalThis.__bucksGoogleSigninMock;
  export const GoogleSignin = {
    getTokens: async () => mock().getTokens(),
    signIn: async () => mock().signIn(),
    signOut: async () => mock().signOut(),
    hasPreviousSignIn: () => mock().hasPreviousSignIn(),
    getCurrentUser: () => mock().getCurrentUser(),
    addScopes: async () => mock().addScopes(),
    configure: () => mock().configure(),
  };
`);

globalThis.__bucksAlertMock = {
  alert: () => {},
};
globalThis.__bucksGoogleSigninMock = {
  getTokens: async () => ({ accessToken: "mock-token", idToken: "mock-id" }),
  signIn: async () => ({ data: null }),
  signOut: async () => {},
  hasPreviousSignIn: () => false,
  getCurrentUser: () => null,
  addScopes: async () => {},
  configure: () => {},
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "react") return { url: reactUrl, shortCircuit: true };
    if (specifier === "expo-secure-store") return { url: secureStoreUrl, shortCircuit: true };
    if (specifier === "expo-file-system/legacy") return { url: fileSystemUrl, shortCircuit: true };
    if (specifier === "@expo/vector-icons/MaterialCommunityIcons") return { url: vectorIconsUrl, shortCircuit: true };
    if (specifier === "react-native") return { url: reactNativeUrl, shortCircuit: true };
    if (specifier === "@react-native-google-signin/google-signin") return { url: googleSigninUrl, shortCircuit: true };
    if (specifier.startsWith("@/")) {
      const rel = specifier.slice(2);
      const candidates = [`${rel}.ts`, `${rel}.tsx`, `${rel}/index.ts`, `${rel}/index.tsx`];
      for (const candidate of candidates) {
        const resolved = pathResolve(projectRoot, "src", candidate);
        if (existsSync(resolved)) {
          return { url: new URL(`file://${resolved}`).href, shortCircuit: true };
        }
      }
    }
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.startsWith(".")) return nextResolve(`${specifier}.ts`, context);
      throw error;
    }
  },
});
