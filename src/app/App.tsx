import { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Container, Tabs, Tab, Box } from '@mui/material';
import { theme } from './theme';
import QueryPage from '../pages/QueryPage';
import AnalyzePage from '../pages/AnalyzePage';

function App() {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Query" />
            <Tab label="Analyze" />
          </Tabs>
        </Box>
        {tabValue === 0 && <QueryPage />}
        {tabValue === 1 && <AnalyzePage />}
      </Container>
    </ThemeProvider>
  );
}

export default App;

