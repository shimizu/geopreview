import { useEffect, useState } from "react";
import { parseGeojson } from "../lib/parseGeojson.js";
import type { ParseResult } from "../lib/types.js";

interface UseGeojsonResult {
  result: ParseResult | null;
  loading: boolean;
  error: Error | null;
}

export function useGeojson(filePath: string): UseGeojsonResult {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    parseGeojson(filePath)
      .then((r) => {
        if (!cancelled) {
          setResult(r);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filePath]);

  return { result, loading, error };
}
