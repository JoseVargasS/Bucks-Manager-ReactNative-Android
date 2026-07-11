import { isPinEnabled, savePin, verifyPin, clearPin } from "@/utils/pin";

const g = globalThis as any;

beforeEach(() => {
  g.__bucksSecureStoreMock.reset();
});

describe("isPinEnabled", () => {
  test("returns false when no value stored", async () => {
    expect(await isPinEnabled()).toBe(false);
  });

  test("returns true when stored as '1'", async () => {
    await g.__bucksSecureStoreMock.setItemAsync("bucks_pin_enabled", "1");
    expect(await isPinEnabled()).toBe(true);
  });

  test("returns false when stored as '0'", async () => {
    await g.__bucksSecureStoreMock.setItemAsync("bucks_pin_enabled", "0");
    expect(await isPinEnabled()).toBe(false);
  });
});

describe("savePin", () => {
  test("stores pin and enables pin", async () => {
    await savePin("1234");
    expect(await g.__bucksSecureStoreMock.getItemAsync("bucks_pin")).toBe("1234");
    expect(await g.__bucksSecureStoreMock.getItemAsync("bucks_pin_enabled")).toBe("1");
  });
});

describe("verifyPin", () => {
  test("returns true for correct pin", async () => {
    await savePin("5678");
    expect(await verifyPin("5678")).toBe(true);
  });

  test("returns false for wrong pin", async () => {
    await savePin("5678");
    expect(await verifyPin("0000")).toBe(false);
  });

  test("returns false when no pin stored", async () => {
    expect(await verifyPin("1234")).toBe(false);
  });
});

describe("clearPin", () => {
  test("removes pin and disables pin", async () => {
    await savePin("1234");
    await clearPin();
    expect(await isPinEnabled()).toBe(false);
    expect(await g.__bucksSecureStoreMock.getItemAsync("bucks_pin")).toBeNull();
  });

  test("does not throw when pin not set", async () => {
    await clearPin();
    expect(await isPinEnabled()).toBe(false);
  });

  test("still disables pin even if deleteItemAsync fails", async () => {
    await savePin("1234");
    g.__bucksSecureStoreMock.deleteError = new Error("storage locked");
    await clearPin();
    g.__bucksSecureStoreMock.deleteError = null;
    expect(await isPinEnabled()).toBe(false);
  });
});
