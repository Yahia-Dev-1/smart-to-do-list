const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const User = require('./models/User');
const Task = require('./models/Task');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5005;
const SERVER_ID = Math.random().toString(36).substring(7);
const DB_PATH = path.join(__dirname, 'db.json');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || 'dummy_key');
const bcrypt = require('bcryptjs');
const isServerless = process.env.VERCEL || process.env.NODE_ENV === 'production';
let memoryDb = { users: [], tasks: [] };

// Environment Variable Validation
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const requiredEnvVars = ['JWT_SECRET', 'GEMINI_API_KEY', 'MONGODB_URI'];
const missingVars = requiredEnvVars.filter(v => v === 'GEMINI_API_KEY' ? !GEMINI_KEY : !process.env[v]);

if (missingVars.length > 0) {
    console.warn(`[WARNING] Missing Environment Variables: ${missingVars.join(', ')}. Some features will fail.`);
}

// Helper for Local JSON DB - Fixed for Serverless (EROFS)
const getLocalData = () => {
    if (isServerless) return memoryDb;
    try {
        if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], tasks: [] }));
        return JSON.parse(fs.readFileSync(DB_PATH));
    } catch (e) {
        console.warn('Filesystem read failed, using memory fallback.');
        return memoryDb;
    }
};

const saveLocalData = (data) => {
    if (isServerless) {
        memoryDb = data;
        return;
    }
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Filesystem write failed:', e.message);
        memoryDb = data;
    }
};

// MongoDB Connection with Fallback Log
let isMongoConnected = false;
if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI, {
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000
    })
        .then(() => {
            isMongoConnected = true;
            console.log('Connected to MongoDB - Real persistence active');
        })
        .catch(err => {
            console.warn('MongoDB connection failed. Falling back to memory session.');
            isMongoConnected = false;
        });
} else {
    console.warn('MONGODB_URI missing. Using in-memory database (NO PERSISTENCE).');
}

// Health check for troubleshooting Vercel
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        mongo: isMongoConnected ? 'connected' : 'disconnected',
        environment: {
            has_gemini: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'dummy_key',
            has_mongo_uri: !!process.env.MONGODB_URI && process.env.MONGODB_URI !== 'undefined',
            has_jwt_secret: !!process.env.JWT_SECRET && process.env.JWT_SECRET !== 'elite_default_secret',
            node_version: process.version
        },
        server_id: SERVER_ID
    });
});

// Auth Middleware
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (isMongoConnected) {
            const existingUser = await User.findOne({ $or: [{ email }, { username }] });
            if (existingUser) return res.status(400).json({ error: 'User already exists' });
            const user = new User({ username, email, password });
            await user.save();
            const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'elite_default_secret', { expiresIn: '7d' });
            return res.status(201).json({ token, user: { username, email } });
        } else {
            // Local Fallback
            const data = getLocalData();
            if (data.users.find(u => u.email === email || u.username === username)) {
                return res.status(400).json({ error: 'User already exists' });
            }
            const newUser = { id: Date.now().toString(), username, email, password };
            data.users.push(newUser);
            saveLocalData(data);

            const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET || 'elite_default_secret', { expiresIn: '7d' });
            return res.status(201).json({ token, user: { username, email } });
        }
    } catch (err) {
        console.error(`[REGISTER ERROR] ${err.message}`);
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (isMongoConnected) {
            const user = await User.findOne({ email });
            if (!user || !(await user.comparePassword(password))) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'elite_default_secret', { expiresIn: '7d' });
            return res.json({ token, user: { username: user.username, email } });
        } else {
            // Local Fallback
            const data = getLocalData();
            const user = data.users.find(u => u.email === email && u.password === password);
            if (!user) return res.status(401).json({ error: 'Invalid credentials' });
            const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'elite_default_secret', { expiresIn: '7d' });
            return res.json({ token, user: { username: user.username, email } });
        }
    } catch (err) {
        console.error(`[LOGIN ERROR] ${err.message}`);
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
    try {
        if (isMongoConnected) {
            const user = await User.findById(req.userId).select('-password');
            res.json(user);
        } else {
            const data = getLocalData();
            const user = data.users.find(u => u.id === req.userId);
            if (!user) return res.status(404).json({ error: 'User not found' });
            const { password, ...userWithoutPassword } = user;
            res.json(userWithoutPassword);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- TASK PERSISTENCE ROUTES ---
app.get('/api/tasks', authenticate, async (req, res) => {
    try {
        if (isMongoConnected) {
            const tasks = await Task.find({ userId: req.userId }).sort({ createdAt: -1 });
            return res.json(tasks);
        } else {
            const data = getLocalData();
            const tasks = data.tasks.filter(t => t.userId === req.userId);
            return res.json(tasks.reverse());
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/tasks', authenticate, async (req, res) => {
    try {
        const { text, date, duration, system } = req.body;
        if (isMongoConnected) {
            const task = new Task({ userId: req.userId, text, date, duration, system });
            await task.save();
            return res.status(201).json(task);
        } else {
            const data = getLocalData();
            const task = { _id: Date.now().toString(), userId: req.userId, text, date, duration, system, completed: false, createdAt: new Date() };
            data.tasks.push(task);
            saveLocalData(data);
            return res.status(201).json(task);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/tasks/:id', authenticate, async (req, res) => {
    try {
        const { completed, completedAt } = req.body;
        if (isMongoConnected) {
            const task = await Task.findOneAndUpdate(
                { _id: req.params.id, userId: req.userId },
                { completed, completedAt },
                { new: true }
            );
            return res.json(task);
        } else {
            const data = getLocalData();
            const index = data.tasks.findIndex(t => t._id === req.params.id && t.userId === req.userId);
            if (index === -1) return res.status(404).json({ error: 'Task not found' });
            data.tasks[index] = { ...data.tasks[index], completed, completedAt };
            saveLocalData(data);
            return res.json(data.tasks[index]);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/tasks/:id', authenticate, async (req, res) => {
    try {
        if (isMongoConnected) {
            await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId });
            return res.json({ message: 'Task deleted' });
        } else {
            const data = getLocalData();
            data.tasks = data.tasks.filter(t => !(t._id === req.params.id && t.userId === req.userId));
            saveLocalData(data);
            return res.json({ message: 'Task deleted' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/tasks', authenticate, async (req, res) => {
    try {
        if (isMongoConnected) {
            await Task.deleteMany({ userId: req.userId });
            return res.json({ message: 'All tasks cleared' });
        } else {
            const data = getLocalData();
            data.tasks = data.tasks.filter(t => t.userId !== req.userId);
            saveLocalData(data);
            return res.json({ message: 'All tasks cleared' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Request Logger Middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

let cachedModels = null;

async function getAvailableModels() {
    if (cachedModels) return cachedModels;

    try {
        console.log("Detecting available models...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();

        if (!data.models || data.models.length === 0) {
            throw new Error("No models available for this API key.");
        }

        // Models that support generateContent
        const validModels = data.models
            .filter(m => m.supportedGenerationMethods.includes("generateContent"))
            .map(m => m.name.replace("models/", ""));

        // Sort by preference (Flash -> Pro)
        const priorityOrder = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro-latest", "gemini-pro"];
        cachedModels = validModels.sort((a, b) => {
            const idxA = priorityOrder.findIndex(p => a.includes(p));
            const idxB = priorityOrder.findIndex(p => b.includes(p));
            return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
        });

        console.log(`Found ${cachedModels.length} models: ${cachedModels.join(", ")}`);
        return cachedModels;
    } catch (error) {
        console.error("Model Detection Failed:", error.message);
        return ["gemini-pro", "gemini-1.5-flash"]; // Hardcoded fallbacks
    }
}

async function callGemini(prompt, isJson = false) {
    const activeKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!activeKey || activeKey === 'dummy_key') {
        throw new Error("GEMINI_API_KEY is missing in Vercel settings. Please add it to your Environment Variables.");
    }

    const models = await getAvailableModels();
    let lastError = null;

    for (const modelName of models) {
        try {
            console.log(`Trying model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            if (isJson) {
                const match = text.match(/\[.*\]/s) || text.match(/\{.*\}/s);
                if (match) return JSON.parse(match[0]);
                throw new Error("AI responded with invalid JSON format");
            }
            return text.trim();
        } catch (error) {
            console.warn(`Model ${modelName} failed:`, error.message);
            lastError = error;
            if (error.message.includes("429") || error.message.includes("404")) continue;
        }
    }
    throw new Error(lastError?.message || "AI service is currently unavailable. Please check your API key and quota.");
}

app.get('/api/models', async (req, res) => {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();

        if (data.error) {
            return res.status(data.error.code || 500).json({ error: data.error.message });
        }

        const modelNames = data.models ? data.models.map(m => m.name) : [];
        res.json({
            apiKeyStatus: "Key is working",
            availableModels: modelNames,
            fullResponse: data
        });
    } catch (error) {
        res.status(500).json({ status: "Fetch Error", error: error.message });
    }
});

app.get('/api/test', async (req, res) => {
    try {
        const data = await callGemini("Hello, say 'AI is working' in Arabic.");
        res.json({ status: "Success", response: data });
    } catch (error) {
        res.status(500).json({ status: "Error", message: error.message });
    }
});

app.post('/api/split', async (req, res) => {
    try {
        const { text: taskText, lang } = req.body;
        const prompt = `
            # SYSTEM ROLE
            You are an expert Roadmap Architect, specializing in creating custom, sequential learning or action plans.
            
            # YOUR MISSION:
            Generate a detailed, step-by-step roadmap specifically tailored to the user's input topic.
            It's crucial to stick to the topic provided. Do not invent unrelated steps. For example, if the user asks for "Pizza," provide steps for making pizza. If they ask for "JavaScript," provide steps for learning JavaScript.
            
            # INPUT TOPIC: 
            "${taskText}"
            
            # GUIDELINES:
            1. RELEVANCE: Every subtask must be directly related to "${taskText}".
            2. AVOID TEMPLATES: Do not copy the content of the examples below. Use them only for understanding the output format.
            3. LOGICAL PROGRESSION: Organize the steps from fundamental basics to advanced concepts or mastery.
            4. LANGUAGE (CRITICAL): Your output must be entirely in ${lang === 'ar' ? 'Arabic' : 'English'}. 
               If the input topic is in Arabic, all subtasks must be in Arabic. 
               If the input topic is in English, all subtasks must be in English.
               Respond ONLY in ${lang === 'ar' ? 'اللغة العربية' : 'the English language'}.
            5. TONE: Maintain a helpful, encouraging, and clear tone. Avoid overly formal or robotic language.
            
            # OUTPUT FORMAT (JSON ONLY):
            {"data": [{"text": "Actionable step name", "duration": number_in_minutes}]}

            # EXAMPLES (FORMAT ONLY):
            Input: "Making a cake" -> Output: Steps about flour, mixing, baking.
            Input: "Learning Math" -> Output: Steps about numbers, logic, practice.
        `;
        const data = await callGemini(prompt, true);
        res.json(data);
    } catch (error) {
        console.error("Split Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/reorder', async (req, res) => {
    try {
        const { tasks, lang } = req.body;
        const prompt = `
            # SYSTEM ROLE
            Performance Optimization Consultant.
            
            # INPUT DATA:
            Tasks: ${JSON.stringify(tasks)}
            Target Language: ${lang || 'auto'}
            
            # TASK: 
            Reorder tasks to maximize execution velocity while maintaining logical flow.
            
            # PRIORITY HIERARCHY:
            1. CORE RESPONSIBILITIES (Work, Study, Assignments, Deadlines) - CRITICAL
            2. RECOVERY & ESSENTIALS (Sleep, Meals, Brief Rest) - STABILITY
            3. SECONDARY OBJECTIVES (Logistics, Chores) - MAINTENANCE
            4. DISCRETIONARY (Leisure, Fun) - LOWEST PRIORITY
            
            # RULES:
            - LANGUAGE: The "message" field MUST be in ${lang === 'ar' ? 'Arabic' : 'English'}.
            - Match the language of the task names provided.
            - Provide a clinical, analytical observation.
            
            # OUTPUT FORMAT (JSON):
            {
               "indices": [original indices in new order],
               "message": "Direct analytical observation regarding this sequence"
            }
        `;
        const data = await callGemini(prompt, true);
        res.json({ data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/coach', async (req, res) => {
    try {
        const { history, currentTasks, lang } = req.body;
        const prompt = `
            # SYSTEM ROLE
            Operational Analytics Lead.
            
            # DATA INPUT:
            - History: ${JSON.stringify(history.slice(0, 15))}
            - Pending: ${JSON.stringify(currentTasks)}
            - Target Language: ${lang || 'auto'}
            
            # TASK: 
            Perform a performance audit and provide tactical optimization suggestions.
            
            # JSON STRUCTURE:
            {
               "focusScore": number (0-100),
               "balanceScore": number (0-100),
               "velocity": number (tasks/day avg),
               "topCategory": "String (Work/Rest/Health/etc)",
               "message": "Direct analytical assessment",
               "proTip": "Tactical optimization suggestion",
               "statusColor": "#hex (Slate/Indigo scale)"
            }
            
            # RULES:
            - LANGUAGE: "message", "proTip", and "topCategory" MUST be in ${lang === 'ar' ? 'Arabic' : 'English'}.
            - Be clinical, professional, and direct. No emojis.
            - If data is deficient, state "Insufficient data" in ${lang === 'ar' ? 'Arabic' : 'English'}.
        `;
        const data = await callGemini(prompt, true);
        res.json({ data });
    } catch (error) {
        console.error("Coach Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { messages, currentTasks, history, lang } = req.body;
        const lastUserMsg = messages[messages.length - 1].text;

        const prompt = `
            # SYSTEM ROLE
            Supportive Performance & Execution Coach.
            
            # PERSONALITY:
            - Friendly, motivating, and highly efficient.
            - Not robotic. Speaks like a human high-performance mentor.
            - For casual topics (like pizza or sleep), be helpful but gently bring the focus back to productivity after answering.
            
            # CONTEXT:
            - Pending Tasks: ${JSON.stringify(currentTasks)}
            - Completion History: ${JSON.stringify(history.slice(0, 10))}
            - Detection Language: ${lang || 'auto'}
            
            # RULES:
            1. LANGUAGE (CRITICAL): Respond ONLY in ${lang === 'ar' ? 'Arabic (اللغة العربية)' : 'English'}. 
            2. MATCH: If the target language is ${lang === 'ar' ? 'Arabic' : 'English'}, every word you speak MUST be in ${lang === 'ar' ? 'Arabic' : 'English'}.
            3. TONE: Be encouraging and conversational. No robotic speech.
            4. ARABIC TONE: Use natural, modern Arabic.
            5. DURATION: If mentioning time, use "minutes" or "hours", NEVER "seconds".
            6. FOCUS: Help the user execute their day better.
            7. FORMAT: Use clear bullet points. No emojis.
            
            # USER INPUT:
            "${lastUserMsg}"
        `;

        const text = await callGemini(prompt, false);
        res.json({ data: text });
    } catch (error) {
        console.error("Chat Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

if (require.main === module) {
    const server = app.listen(PORT, () => {
        console.log(`AI Backend running on http://localhost:${PORT}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is already in use. Please close the other process or use a different port.`);
        } else {
            console.error("Server Error:", err.message);
        }
        process.exit(1);
    });
}

// Catch unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
