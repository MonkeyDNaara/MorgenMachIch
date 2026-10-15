import { useSyncExternalStore } from "react";
import {
  getPwaSnapshot,
  SERVER_SNAPSHOT,
  subscribePwa,
  type PwaSnapshot,
} from "@/lib/pwa/pwaStore";
import { installState, isIOSDevice, type InstallState } from "@/lib/pwa/installState";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const STANDALONE = "(display-mode: standalone)";

const noSubscribe = () => () => {};

/** `null` during server rendering and hydration, so the page never shows
 * a wrong install option for a split second. */
function useIsIOS(): boolean | null {
  return useSyncExternalStore(
    noSubscribe,
    () => isIOSDevice(navigator.userAgent, navigator.maxTouchPoints),
    () => null,
  );
}

/** Install and update state for Settings → App (#82). */
export function usePwa(): PwaSnapshot & { install: InstallState | null } {
  const pwa = useSyncExternalStore(subscribePwa, getPwaSnapshot, () => SERVER_SNAPSHOT);
  const displayStandalone = useMediaQuery(STANDALONE);
  const ios = useIsIOS();
  // iOS home-screen apps report navigator.standalone instead of the media query.
  const iosStandalone =
    ios === true && (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const install =
    ios === null
      ? null
      : installState({
          standalone: displayStandalone || iosStandalone,
          justInstalled: pwa.justInstalled,
          canPrompt: pwa.canPrompt,
          ios,
        });
  return { ...pwa, install };
}
