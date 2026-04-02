import { Box, Text } from "ink";
import type { FC } from "react";
import type { GeometryType } from "../lib/types.js";

interface Props {
  counts: Record<GeometryType, number>;
}

const GeometrySummary: FC<Props> = ({ counts }) => {
  const entries = (Object.entries(counts) as [GeometryType, number][]).filter(
    ([, v]) => v > 0,
  );

  return (
    <Box flexDirection="column" marginRight={4}>
      <Text bold underline>
        GEOMETRY SUMMARY
      </Text>
      {entries.length === 0 ? (
        <Text dimColor>(none)</Text>
      ) : (
        entries.map(([type, count]) => (
          <Text key={type}>
            <Text color="green">{type.padEnd(20)}</Text>
            <Text>{count.toLocaleString().padStart(8)}</Text>
          </Text>
        ))
      )}
    </Box>
  );
};

export default GeometrySummary;
