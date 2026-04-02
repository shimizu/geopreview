import { Box, Text, useApp, useInput } from "ink";
import { Spinner } from "@inkjs/ui";
import type { FC } from "react";
import Header from "./components/Header.js";
import GeometrySummary from "./components/GeometrySummary.js";
import PropertySchema from "./components/PropertySchema.js";
import MapPreview from "./components/MapPreview.js";
import Footer from "./components/Footer.js";
import { useGeojson } from "./hooks/useGeojson.js";
import type { CliOptions } from "./lib/types.js";

interface Props {
  filePath: string;
  options: CliOptions;
}

const App: FC<Props> = ({ filePath, options }) => {
  const { result, loading, error } = useGeojson(filePath);
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
