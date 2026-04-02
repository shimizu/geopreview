/**
 * ルートコンポーネント — 全UIコンポーネントを組み立てる。
 *
 * データフロー:
 *   cli.tsx → App（filePath, parser, options）
 *     → useFileParser で非同期解析
 *     → ParseResult を各子コンポーネントに分配
 *
 * useInput で "q" キーによる終了を実装。
 * ただしパイプ入力等で stdin が TTY でない場合は useInput を無効化する
 * （Ink の Raw mode エラーを回避するため）。
 */

import { Box, Text, useApp, useInput } from "ink";
import { Spinner } from "@inkjs/ui";
import type { FC } from "react";
import Header from "./components/Header.js";
import GeometrySummary from "./components/GeometrySummary.js";
import PropertySchema from "./components/PropertySchema.js";
import MapPreview from "./components/MapPreview.js";
import Footer from "./components/Footer.js";
import { useFileParser } from "./hooks/useFileParser.js";
import type { CliOptions, FileParser } from "./lib/types.js";

interface Props {
  filePath: string;
  parser: FileParser;
  options: CliOptions;
}

const App: FC<Props> = ({ filePath, parser, options }) => {
  const { result, loading, error } = useFileParser(filePath, parser);
  const { exit } = useApp();

  useInput(
    (input) => {
      if (input === "q") exit();
    },
    { isActive: process.stdin.isTTY === true },
  );

  if (loading) return <Spinner label="Loading..." />;
  if (error) return <Text color="red">{error.message}</Text>;
  if (!result) return null;

  return (
    <Box flexDirection="column">
      <Header result={result} />
      <Box>
        <GeometrySummary counts={result.geometryCounts} />
        <PropertySchema stats={result.propertyStats} limit={options.props} />
      </Box>
      {!options.noMap && (
        <MapPreview
          result={result}
          width={options.width}
          height={options.height}
        />
      )}
      <Footer />
    </Box>
  );
};

export default App;
