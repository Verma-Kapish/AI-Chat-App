// Advanced Backend Server with Real-time Database Monitoring
// Run with: node server.js

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const http = require('http');

const app = express();
const server = http.createServer(app);
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'interactions_database.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files

// Initialize database file if it doesn't exist
async function initDatabase() {
    try {
        await fs.access(DB_FILE);
    } catch {
        await fs.writeFile(DB_FILE, JSON.stringify([]));
    }
}

// Read database
async function readDatabase() {
    try {
        const data = await fs.readFile(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

// Write to database
async function writeDatabase(data) {
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

// Store for real-time updates (SSE clients)
const clients = new Set();

// API Routes

// Save interaction (all types - voice, text, etc.)
app.post('/api/interactions', async (req, res) => {
    try {
        const { question, answer, user, type, feature, timestamp, chatId } = req.body;
        
        if (!question) {
            return res.status(400).json({ error: 'Question is required' });
        }

        const interactions = await readDatabase();
        const interaction = {
            id: Date.now().toString(),
            question,
            answer,
            user: user || 'anonymous',
            type: type || 'text',
            feature: feature || null,
            timestamp: timestamp || new Date().toISOString(),
            chatId: chatId || null,
            analyzed: false
        };
        
        interactions.push(interaction);

        // Keep only last 5000 interactions
        if (interactions.length > 5000) {
            interactions.shift();
        }

        await writeDatabase(interactions);
        
        // Analyze interaction
        const analysis = analyzeInteraction(interaction, interactions);
        interaction.analysis = analysis;
        
        // Broadcast to all connected clients
        broadcastUpdate({
            type: 'new_interaction',
            data: interaction,
            stats: getStats(interactions)
        });
        
        res.json({ success: true, message: 'Interaction saved', analysis });
    } catch (error) {
        console.error('Error saving interaction:', error);
        res.status(500).json({ error: 'Failed to save interaction' });
    }
});

// Get all interactions
app.get('/api/interactions', async (req, res) => {
    try {
        const { user, limit = 100 } = req.query;
        const interactions = await readDatabase();
        
        let filtered = interactions;
        if (user) {
            filtered = interactions.filter(i => i.user === user);
        }

        // Return most recent first
        filtered = filtered.slice(-parseInt(limit)).reverse();
        
        res.json({
            interactions: filtered,
            stats: getStats(await readDatabase())
        });
    } catch (error) {
        console.error('Error reading interactions:', error);
        res.status(500).json({ error: 'Failed to read interactions' });
    }
});

// Get analytics and stats
app.get('/api/analytics', async (req, res) => {
    try {
        const interactions = await readDatabase();
        const stats = getStats(interactions);
        const analytics = getAdvancedAnalytics(interactions);
        
        res.json({
            stats,
            analytics,
            recent: interactions.slice(-20).reverse()
        });
    } catch (error) {
        console.error('Error getting analytics:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

// Server-Sent Events for real-time updates
app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const clientId = Date.now().toString();
    clients.add({ id: clientId, res });
    
    // Send initial data
    readDatabase().then(interactions => {
        res.write(`data: ${JSON.stringify({
            type: 'connected',
            stats: getStats(interactions),
            recent: interactions.slice(-10).reverse()
        })}\n\n`);
    });
    
    req.on('close', () => {
        clients.delete({ id: clientId, res });
    });
});

// Analyze interaction
function analyzeInteraction(interaction, allInteractions) {
    const analysis = {
        sentiment: analyzeSentiment(interaction.question),
        complexity: analyzeComplexity(interaction.question),
        category: categorizeQuestion(interaction.question),
        keywords: extractKeywords(interaction.question),
        responseTime: null
    };
    
    if (interaction.answer) {
        analysis.responseLength = interaction.answer.length;
        analysis.hasCode = /```[\s\S]*?```/.test(interaction.answer);
        analysis.hasLinks = /https?:\/\/[^\s]+/.test(interaction.answer);
    }
    
    return analysis;
}

// Analyze sentiment
function analyzeSentiment(text) {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'love', 'happy', 'thanks', 'thank'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'error', 'problem', 'issue', 'wrong', 'failed'];
    
    const lowerText = text.toLowerCase();
    let score = 0;
    
    positiveWords.forEach(word => {
        if (lowerText.includes(word)) score += 1;
    });
    
    negativeWords.forEach(word => {
        if (lowerText.includes(word)) score -= 1;
    });
    
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
}

// Analyze complexity
function analyzeComplexity(text) {
    const wordCount = text.split(/\s+/).length;
    const hasCode = /```|function|const|let|var|class|import|export/.test(text);
    const hasQuestions = /\?/.test(text);
    
    if (wordCount > 50 || hasCode) return 'high';
    if (wordCount > 20 || hasQuestions) return 'medium';
    return 'low';
}

// Categorize question
function categorizeQuestion(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('code') || lowerText.includes('program') || lowerText.includes('function')) {
        return 'Programming';
    }
    if (lowerText.includes('explain') || lowerText.includes('what is') || lowerText.includes('how')) {
        return 'Explanation';
    }
    if (lowerText.includes('create') || lowerText.includes('generate') || lowerText.includes('make')) {
        return 'Creation';
    }
    if (lowerText.includes('analyze') || lowerText.includes('analysis')) {
        return 'Analysis';
    }
    if (lowerText.includes('debug') || lowerText.includes('fix') || lowerText.includes('error')) {
        return 'Debugging';
    }
    return 'General';
}

// Extract keywords
function extractKeywords(text) {
    const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3);
    
    const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'];
    
    const keywords = words.filter(w => !commonWords.includes(w));
    return [...new Set(keywords)].slice(0, 5);
}

// Get statistics
function getStats(interactions) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const todayInteractions = interactions.filter(i => new Date(i.timestamp) >= today);
    const weekInteractions = interactions.filter(i => new Date(i.timestamp) >= thisWeek);
    
    const features = interactions.filter(i => i.feature).map(i => i.feature);
    const featureCounts = {};
    features.forEach(f => {
        featureCounts[f] = (featureCounts[f] || 0) + 1;
    });
    
    const categories = interactions.map(i => {
        if (i.analysis && i.analysis.category) return i.analysis.category;
        return categorizeQuestion(i.question);
    });
    const categoryCounts = {};
    categories.forEach(c => {
        categoryCounts[c] = (categoryCounts[c] || 0) + 1;
    });
    
    return {
        total: interactions.length,
        today: todayInteractions.length,
        thisWeek: weekInteractions.length,
        uniqueUsers: new Set(interactions.map(i => i.user)).size,
        features: featureCounts,
        categories: categoryCounts,
        averageResponseLength: interactions
            .filter(i => i.answer)
            .reduce((sum, i) => sum + (i.answer.length || 0), 0) / (interactions.filter(i => i.answer).length || 1)
    };
}

// Get advanced analytics
function getAdvancedAnalytics(interactions) {
    const hourlyActivity = {};
    const dailyActivity = {};
    const userActivity = {};
    const topQuestions = {};
    
    interactions.forEach(i => {
        const date = new Date(i.timestamp);
        const hour = date.getHours();
        const day = date.toISOString().split('T')[0];
        
        hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
        dailyActivity[day] = (dailyActivity[day] || 0) + 1;
        userActivity[i.user] = (userActivity[i.user] || 0) + 1;
        
        const questionKey = i.question.toLowerCase().slice(0, 50);
        topQuestions[questionKey] = (topQuestions[questionKey] || 0) + 1;
    });
    
    return {
        hourlyActivity,
        dailyActivity,
        userActivity,
        topQuestions: Object.entries(topQuestions)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([q, c]) => ({ question: q, count: c }))
    };
}

// Broadcast update to all clients
function broadcastUpdate(data) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    clients.forEach(client => {
        try {
            client.res.write(message);
        } catch (err) {
            clients.delete(client);
        }
    });
}

// Legacy endpoint for voice interactions (backward compatibility)
app.post('/api/voice-interactions', async (req, res) => {
    const { question, answer, user } = req.body;
    await saveInteractionToBackend(question, answer, 'voice', null);
    res.json({ success: true });
});

app.get('/api/voice-interactions', async (req, res) => {
    const interactions = await readDatabase();
    const voiceInteractions = interactions.filter(i => i.type === 'voice');
    res.json(voiceInteractions);
});

// Start server
async function startServer() {
    await initDatabase();
    
    server.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📊 Database file: ${DB_FILE}`);
        console.log(`📡 Real-time events: http://localhost:${PORT}/api/events`);
        console.log(`📈 Analytics: http://localhost:${PORT}/database.html`);
    });
}

startServer();

