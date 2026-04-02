/**
 * ファイル読み込み・解析を行う汎用 React フック。
 *
 * パーサーを外部から注入する設計のため、ファイル形式に依存しない。
 * コンポーネントのマウント時に parser.parse() を非同期で実行し、
 * loading / result / error の3状態を返す。
 *
 * useEffect のクリーンアップで cancelled フラグを立てることで、
 * アンマウント後の setState を防止している。
 */

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
