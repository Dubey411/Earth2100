import dotenv from 'dotenv';
import app from './app.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🌍 [server]: Earth 2100 API is running on http://localhost:${PORT}`);
  console.log(`🚀 [server]: Press CTRL+C to stop`);
});
