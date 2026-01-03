const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Store responses in a JSON file
const responsesFile = 'responses.json';

// Initialize responses file if it doesn't exist
if (!fs.existsSync(responsesFile)) {
    fs.writeFileSync(responsesFile, JSON.stringify([]));
}

// Track active sessions
const activeSessions = new Map();

// Helper function to validate name
function isValidName(name) {
    return /^[A-Za-z\s]+$/.test(name);
}

// Helper function to validate email
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Start test endpoint
app.post('/api/start-test', (req, res) => {
    const { name, email } = req.body;
    
    // Validate input
    if (!name || !isValidName(name)) {
        return res.status(400).json({ error: 'Invalid name format' });
    }
    
    if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Check if email already completed test
    try {
        const data = fs.existsSync(responsesFile) ? fs.readFileSync(responsesFile, 'utf8') : '[]';
        const responses = JSON.parse(data);
        
        const emailCompleted = responses.some(response => 
            response.email && response.email.toLowerCase() === email.toLowerCase() && response.testCompletedAt
        );
        
        if (emailCompleted) {
            return res.status(400).json({ error: 'Email has already completed the test' });
        }
    } catch (error) {
        console.error('Error checking existing responses:', error);
    }
    
    // Generate a unique session ID
    const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    // Store session
    activeSessions.set(sessionId, {
        name,
        email,
        startTime: new Date().toISOString(),
        completed: false
    });
    
    res.json({ 
        success: true, 
        sessionId,
        message: 'Test started successfully' 
    });
});

// Submit response endpoint
app.post('/api/submit-response', (req, res) => {
    const { sessionId, messageIndex, response, isAutoSubmit, timeSpent } = req.body;
    
    console.log('Received response submission:', {
        sessionId,
        messageIndex,
        responseLength: response?.length,
        isAutoSubmit,
        timeSpent
    });
    
    // Validate session exists
    if (!activeSessions.has(sessionId)) {
        return res.status(403).json({ error: 'Invalid session. Please start the test again.' });
    }
    
    // Validate response length if not auto-submitted
    if (!isAutoSubmit && (!response || response.length < 85)) {
        return res.status(400).json({ error: 'Response must be at least 85 characters' });
    }
    
    try {
        // Read existing responses
        const data = fs.existsSync(responsesFile) ? fs.readFileSync(responsesFile, 'utf8') : '[]';
        const responses = JSON.parse(data);
        
        const session = activeSessions.get(sessionId);
        
        // Add new response
        responses.push({
            sessionId,
            messageIndex: parseInt(messageIndex),
            response: response || '',
            isAutoSubmit: isAutoSubmit || false,
            timeSpent: parseInt(timeSpent) || 0,
            timestamp: new Date().toISOString(),
            name: session.name,
            email: session.email
        });
        
        // Write back to file
        fs.writeFileSync(responsesFile, JSON.stringify(responses, null, 2));
        
        console.log(`Response saved for session ${sessionId}, message ${messageIndex}`);
        
        res.json({ success: true, message: 'Response submitted successfully' });
    } catch (error) {
        console.error('Error saving response:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Complete test endpoint
app.post('/api/complete-test', (req, res) => {
    const { sessionId } = req.body;
    
    console.log('Completing test for session:', sessionId);
    
    // Validate session exists
    if (!activeSessions.has(sessionId)) {
        return res.status(403).json({ error: 'Invalid session' });
    }
    
    try {
        // Mark session as completed
        const session = activeSessions.get(sessionId);
        activeSessions.set(sessionId, {
            ...session,
            completed: true,
            endTime: new Date().toISOString()
        });
        
        // Update all responses for this session with completion time
        const data = fs.existsSync(responsesFile) ? fs.readFileSync(responsesFile, 'utf8') : '[]';
        const responses = JSON.parse(data);
        
        const updatedResponses = responses.map(r => {
            if (r.sessionId === sessionId) {
                return {
                    ...r,
                    testCompletedAt: new Date().toISOString()
                };
            }
            return r;
        });
        
        // Write back to file
        fs.writeFileSync(responsesFile, JSON.stringify(updatedResponses, null, 2));
        
        console.log(`Test completed for session ${sessionId}`);
        
        res.json({ 
            success: true, 
            message: 'Test completed successfully' 
        });
    } catch (error) {
        console.error('Error completing test:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Enhanced Admin endpoint to view responses with better formatting
app.get('/admin/responses', (req, res) => {
    try {
        const data = fs.existsSync(responsesFile) ? fs.readFileSync(responsesFile, 'utf8') : '[]';
        const responses = JSON.parse(data);
        
        // Group responses by session for better organization
        const sessions = {};
        responses.forEach(response => {
            if (!sessions[response.sessionId]) {
                sessions[response.sessionId] = {
                    sessionId: response.sessionId,
                    name: response.name,
                    email: response.email,
                    responses: [],
                    startTime: response.timestamp,
                    completed: !!response.testCompletedAt,
                    completedAt: response.testCompletedAt
                };
            }
            sessions[response.sessionId].responses.push({
                messageIndex: response.messageIndex,
                response: response.response,
                isAutoSubmit: response.isAutoSubmit,
                timeSpent: response.timeSpent,
                timestamp: response.timestamp
            });
        });
        
        // Sort sessions by completion time (most recent first)
        const sortedSessions = Object.values(sessions).sort((a, b) => {
            return new Date(b.completedAt || b.startTime) - new Date(a.completedAt || a.startTime);
        });
        
        res.json({
            totalResponses: responses.length,
            totalSessions: Object.keys(sessions).length,
            sessions: sortedSessions
        });
    } catch (error) {
        console.error('Error reading responses:', error);
        res.status(500).json({ error: 'Failed to read responses' });
    }
});

// Admin endpoint to view active sessions
app.get('/admin/sessions', (req, res) => {
    try {
        const sessions = Array.from(activeSessions.entries()).map(([sessionId, sessionData]) => ({
            sessionId,
            ...sessionData
        }));
        res.json(sessions);
    } catch (error) {
        console.error('Error reading sessions:', error);
        res.status(500).json({ error: 'Failed to read sessions' });
    }
});

// Simple admin dashboard
app.get('/admin', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Admin Dashboard - The Reply Suite</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 40px; 
                    background: #f0f2f5;
                }
                .dashboard {
                    max-width: 1200px;
                    margin: 0 auto;
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                h1 { 
                    color: #2c3e50; 
                    text-align: center;
                    margin-bottom: 30px;
                }
                .stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }
                .stat-card {
                    background: #3498db;
                    color: white;
                    padding: 20px;
                    border-radius: 8px;
                    text-align: center;
                }
                .stat-card h3 {
                    margin: 0 0 10px 0;
                    font-size: 1rem;
                }
                .stat-card .number {
                    font-size: 2rem;
                    font-weight: bold;
                }
                .endpoint { 
                    background: #f8f9fa; 
                    padding: 20px; 
                    margin: 15px 0; 
                    border-radius: 8px;
                    border-left: 4px solid #3498db;
                }
                a { 
                    color: #3498db; 
                    text-decoration: none; 
                    font-weight: bold;
                }
                a:hover { 
                    text-decoration: underline; 
                }
                .instructions {
                    background: #e8f4fd;
                    padding: 20px;
                    border-radius: 8px;
                    margin: 20px 0;
                }
            </style>
        </head>
        <body>
            <div class="dashboard">
                <h1>Admin Dashboard - The Reply Suite</h1>
                
                <div class="instructions">
                    <h3>📊 How to View User Responses</h3>
                    <p>User responses are automatically saved to <code>responses.json</code> when they submit each answer.</p>
                    <p>You can view the data in the following ways:</p>
                </div>
                
                <div class="stats" id="stats">
                    <!-- Stats will be loaded by JavaScript -->
                </div>
                
                <div class="endpoint">
                    <h3><a href="/admin/responses" target="_blank">📋 View All Responses (JSON)</a></h3>
                    <p>See all user responses in JSON format, grouped by session with detailed information.</p>
                </div>
                
                <div class="endpoint">
                    <h3><a href="/admin/sessions" target="_blank">👥 View Active Sessions (JSON)</a></h3>
                    <p>See currently active test sessions that haven't been completed yet.</p>
                </div>
                
                <div class="endpoint">
                    <h3>💾 Data File</h3>
                    <p>All responses are stored in: <code>responses.json</code></p>
                    <p>File location: Same directory as your server.js file</p>
                </div>
            </div>

            <script>
                // Load stats
                async function loadStats() {
                    try {
                        const response = await fetch('/admin/responses');
                        const data = await response.json();
                        
                        document.getElementById('stats').innerHTML = \`
                            <div class="stat-card" style="background: #27ae60;">
                                <h3>Total Sessions</h3>
                                <div class="number">\${data.totalSessions}</div>
                            </div>
                            <div class="stat-card" style="background: #e74c3c;">
                                <h3>Total Responses</h3>
                                <div class="number">\${data.totalResponses}</div>
                            </div>
                            <div class="stat-card" style="background: #f39c12;">
                                <h3>Completed Tests</h3>
                                <div class="number">\${data.sessions.filter(s => s.completed).length}</div>
                            </div>
                        \`;
                    } catch (error) {
                        document.getElementById('stats').innerHTML = \`
                            <div class="stat-card" style="background: #95a5a6;">
                                <h3>Status</h3>
                                <div class="number">Loading...</div>
                            </div>
                        \`;
                    }
                }
                
                loadStats();
                setInterval(loadStats, 10000); // Refresh every 10 seconds
            </script>
        </body>
        </html>
    `);
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Clean up old sessions periodically (24 hours)
setInterval(() => {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    for (const [sessionId, sessionData] of activeSessions.entries()) {
        const sessionTime = new Date(sessionData.startTime).getTime();
        if (now - sessionTime > twentyFourHours) {
            activeSessions.delete(sessionId);
            console.log('Cleaned up expired session:', sessionId);
        }
    }
}, 60 * 60 * 1000); // Run every hour

// Error handling for unhandled routes
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
    console.log(`📊 Admin dashboard: http://localhost:${port}/admin`);
    console.log(`📋 Responses API: http://localhost:${port}/admin/responses`);
    console.log(`👥 Sessions API: http://localhost:${port}/admin/sessions`);
    console.log(`💾 Data file: ${path.join(__dirname, responsesFile)}`);
    console.log('\n=== BACKEND READY ===');
});