// Simple test server to check if basic Express works
const express = require('express');
const cors = require('cors');

const app = express();
const port = 3001; // Different port to avoid conflicts

// Enable CORS
app.use(cors());
app.use(express.json());

// Simple health check
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({ 
    status: 'ok', 
    message: 'Simple test server is working!',
    timestamp: new Date().toISOString()
  });
});

// Test marketplace endpoint
app.get('/api/v1/marketplace/providers/search', (req, res) => {
  console.log('Marketplace search requested');
  res.json({
    success: true,
    data: {
      providers: [
        {
          id: 'test-1',
          business_name: 'Test Provider',
          service_category: 'handyman',
          city: 'София',
          rating: 4.5,
          hourly_rate: 25
        }
      ]
    }
  });
});

app.listen(port, () => {
  console.log(`🚀 Test server running on http://localhost:${port}`);
  console.log(`📋 Health check: http://localhost:${port}/health`);
  console.log(`🔍 Search test: http://localhost:${port}/api/v1/marketplace/providers/search`);
});





