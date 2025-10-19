

import express from 'express';
import cors from 'cors';

import router from './route.js';
const port = 3000;
const app = express();
// const router = require('./route');

app.use(express.json());
app.use(cors());


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

app.use('/api', router);