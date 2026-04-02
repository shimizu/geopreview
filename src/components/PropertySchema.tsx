import { Box, Text } from "ink";
import type { FC } from "react";
import type { PropertyStat } from "../lib/types.js";

interface Props {
  stats: PropertyStat[];
  limit: number;
}

function makeBar(ratio: number, width: number = 10): string {
  const filled = Math.round(ratio * width);
  return "▓".repeat(filled) + "░".repeat(width - filled);
}

const PropertySchema: FC<Props> = ({ stats, limit }) => {
  const displayed = stats.slice(0, limit);
  const remaining = stats.length - displayed.length;

  return (
    <Box flexDirection="column">
      <Text bold underline>
        PROPERTY SCHEMA
      </Text>
      {displayed.length === 0 ? (
        <Text dimColor>(none)</Text>
      ) : (
        displayed.map((s) => {
          const types = [...s.types].join("|");
          const ratio = s.total > 0 ? s.count / s.total : 0;
          const bar = makeBar(ratio);
          return (
            <Text key={s.key}>
              <Text color="yellow">{s.key.padEnd(16)}</Text>
              <Text>{types.padEnd(14)}</Text>
              <Text dimColor>{bar} </Text>
              <Text>
                ({s.count}/{s.total})
              </Text>
            </Text>
          );
        })
      )}
      {remaining > 0 && (
        <Text dimColor>... and {remaining} more properties</Text>
      )}
    </Box>
  );
};

export default PropertySchema;
