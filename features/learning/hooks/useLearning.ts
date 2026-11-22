"use client";

import { useEffect, useSyncExternalStore } from "react";
import { learningStore } from "@/features/learning/lib/learningStore";

type UseLearningOptions = {
  /**
   * Load today's topic on mount (default). `learning/today` generates a topic when none is
   * open, so a caller that only needs to know *whether* to show something (the menu item,
   * #469) must not use it.
   */
  autoLoad?: boolean;
};

/**
 * The Learn today state and its actions (#466), shared by the dashboard row and /learn: both
 * read the same store, so there is one `learning/today` call. See `createLearningStore` for the
 * phases and rules.
 */
export function useLearning({ autoLoad = true }: UseLearningOptions = {}) {
  const state = useSyncExternalStore(
    learningStore.subscribe,
    learningStore.getSnapshot,
    learningStore.getServerSnapshot,
  );

  useEffect(() => {
    if (autoLoad) void learningStore.ensureLoaded();
  }, [autoLoad]);

  return {
    ...state,
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
