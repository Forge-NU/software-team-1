
/**
 * Gets the most common values for the specified keys in an array of objects.
 * In case of a tie, the first value encountered is returned.
 * @param items The array of objects to analyze
 * @param keys The keys for which to find the most common values
 * @returns The most common values for the specified keys, or null if the array is empty
 */
export function getMostCommonValues<T, K extends keyof T>(
  items: T[],
  keys: readonly K[]
): { [P in K]: T[P] | null } {
  // Initialize tracking state for each requested key
  const trackers = {} as {
    [P in K]: {
      counts: Map<T[P], number>;
      maxCount: number;
      mostCommon: T[P] | null;
    };
  };

  for (const key of keys) {
    trackers[key] = {
      counts: new Map(),
      maxCount: 0,
      mostCommon: null,
    };
  }

  // Single pass over the data array
  for (const item of items) {
    for (const key of keys) {
      const tracker = trackers[key];
      const val = item[key];
      const count = (tracker.counts.get(val) ?? 0) + 1;
      
      tracker.counts.set(val, count);

      if (count > tracker.maxCount) {
        tracker.maxCount = count;
        tracker.mostCommon = val;
      }
    }
  }

  // Extract the final winning values into a clean result object
  const result = {} as { [P in K]: T[P] | null };
  for (const key of keys) {
    result[key] = trackers[key].mostCommon;
  }

  return result;
}