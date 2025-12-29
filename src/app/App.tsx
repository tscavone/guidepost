import { useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import {
  CssBaseline,
  Container,
  Tabs,
  Tab,
  Box,
  Typography,
} from "@mui/material";
import ExploreIcon from "@mui/icons-material/Explore";
import { theme } from "./theme";
import DataPage from "../pages/DataPage";
import QueryPage from "../pages/QueryPage";
import AnalyzePage from "../pages/AnalyzePage";

function App() {
  const [tabValue, setTabValue] = useState(0);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    null
  );

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          minHeight: "100vh",
          width: "100%",
        }}
      >
        <Container maxWidth="xl" sx={{ py: 4, width: "100%" }}>
          <Box sx={{ mb: 4, pb: 2, borderBottom: 2, borderColor: "divider" }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                mb: 0.5,
              }}
            >
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mb: 0.5,
                  }}
                >
                  <ExploreIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                  <Typography
                    variant="h5"
                    component="h1"
                    sx={{
                      fontWeight: 500,
                      color: "text.primary",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Guidepost
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    ml: 4.5,
                    fontSize: "0.875rem",
                  }}
                >
                  Agentic Search Evaluation Harness
                </Typography>
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: "text.disabled",
                  fontSize: "0.7rem",
                  fontStyle: "italic",
                  whiteSpace: "nowrap",
                  mt: 0.5,
                }}
              >
                SIMULATED provider data only. No PHI.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 4 }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Data" />
              <Tab label="Query" />
              <Tab label="Analyze" />
            </Tabs>
          </Box>
          {tabValue === 0 && (
            <DataPage
              selectedProviderId={selectedProviderId}
              onProviderSelect={setSelectedProviderId}
            />
          )}
          {tabValue === 1 && (
            <QueryPage selectedProviderId={selectedProviderId} />
          )}
          {tabValue === 2 && (
            <AnalyzePage selectedProviderId={selectedProviderId} />
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
