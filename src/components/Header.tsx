/**
 * ヘッダー — ファイル名・Feature 数・ファイルサイズを表示する。
 */

import { Box, Text } from "ink";
import type { FC } from "react";
import type { ParseResult } from "../lib/types.js";

/** バイト数を B / KB / MB の読みやすい単位に変換する */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  result: ParseResult;
}

const Header: FC<Props> = ({ result }) => {
  const fileName = result.filePath.split("/").pop() ?? result.filePath;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="cyan">
        {fileName}
      </Text>
      <Text dimColor>
        FeatureCollection / {result.featureCount.toLocaleString()} features /{" "}
        {formatBytes(result.fileSizeBytes)}
      </Text>
    </Box>
  );
};

export default Header;
