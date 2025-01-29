// server.js

// Import required modules
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { OpenAI } = require('openai');
const Joi = require('joi');
const winston = require('winston');

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 4000;

// Configure logging with Winston
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

// Middleware setup
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Configure OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Validate incoming requests
const chatSchema = Joi.object({
  messages: Joi.array()
    .items(
      Joi.object({
        role: Joi.string().valid('user', 'assistant', 'system').required(),
        content: Joi.string().required(),
      })
    )
    .min(1)
    .required(),
});

// Health check route
app.get('/', (req, res) => {
  res.send('Medi8 Final backend is running.');
});

// Chat route for OpenAI interaction
app.post('/chat', async (req, res) => {
  logger.info('Received /chat request', { body: req.body });

  const { error, value } = chatSchema.validate(req.body);
  if (error) {
    logger.warn('Validation error', { message: error.details[0].message });
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    logger.info('Sending request to OpenAI API');
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: value.messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiReply = response.choices[0].message.content.trim();
    logger.info('Received response from OpenAI API', { aiReply });

    res.json({ aiReply });
  } catch (err) {
    logger.error('Error in /chat', { error: err.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start the server
app.listen(PORT, () => {
  logger.info(`Medi8 Final backend running on port ${PORT}`);
});