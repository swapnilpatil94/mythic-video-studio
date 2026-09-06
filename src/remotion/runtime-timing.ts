// Default checked-in fallback. src/prepare-timing.ts replaces this during production.
export const runtimeTiming = {} as Record<string, Array<{text: string; start_seconds: number; end_seconds: number; index: number}>>;
