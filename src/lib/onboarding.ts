import { createLocalStorageStore } from "@/lib/localStorageStore";

const STORAGE_KEY = "gtc:onboardingSeen";

export const onboardingStore = createLocalStorageStore(STORAGE_KEY, (raw) => raw === "1");

export function markOnboardingSeen(): void {
  onboardingStore.write("1");
}
