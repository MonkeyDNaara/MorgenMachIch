"use client";

import { useEffect, useSyncExternalStore } from "react";
import { learningStores, type LearningSlot } from "@/features/learning/lib/learningStore";

type UseLearningOptions = {
  /**
   * Load the slot's topic on mount (default). `learning/today` generates a topic when none is
   * open, so a caller that only needs to know *whether* to show something (the menu item,
   * #469) must not use it.
   */
  autoLoad?: boolean;
  /**
   * `today` (default): the new topic of the day. `review`: an understood topic to repeat (#479).
   * Each slot has its own store, so a slow `today` never blocks the review.
   */
  slot?: LearningSlot;
};

/**
 * The Learn today state and its actions (#466), shared by the dashboard cards and /learn: both
 * read the same store of a slot, so there is one `learning/today` (or `review`) call. See
 * `createLearningStore` for the phases and rules.
 */
export function useLearning({ autoLoad = true, slot = "today" }: UseLearningOptions = {}) {
  const learningStore = learningStores[slot];
  const state = useSyncExternalStore(
    learningStore.subscribe,
    learningStore.getSnapshot,
    learningStore.getServerSnapshot,
  );

  useEffect(() => {
    if (autoLoad) void learningStore.ensureLoaded();
  }, [autoLoad, learningStore]);

  return {
    ...state,
    load: learningStore.ensureLoaded,
    today: learningStore.today,
    next: learningStore.next,
    deepen: learningStore.deepen,
    // Not `quiz`: that is the state field holding the questions.
    loadQuiz: learningStore.quiz,
    answer: learningStore.answer,
    retry: learningStore.retry,
    cancel: learningStore.cancel,
  };
}
