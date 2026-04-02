import { useEffect, useState } from "react";
import type { FileParser, ParseResult } from "../lib/types.js";

interface UseFileParserResult {
  result: ParseResult | null;
  loading: boolean;
  error: Error | null;
}

export function useFileParser(
  filePath: string,
  parser: FileParser,
): UseFileParserResult {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    parser
      .parse(filePath)
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
  }, [filePath, parser]);

  return { result, loading, error };
}
