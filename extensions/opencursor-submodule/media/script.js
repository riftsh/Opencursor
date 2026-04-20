// OpenCursor Agent Chat Interface
(function() {
    const vscode = acquireVsCodeApi();
    
    // DOM elements
    const messagesContainer = document.getElementById('messages');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const typingIndicator = document.getElementById('typingIndicator');
    const quickBtns = document.querySelectorAll('.quick-btn');
    
    // State
    let isTyping = false;
    let chatHistory = [];
    
    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        setupEventListeners();
        loadChatHistory();
        focusInput();
        
        // Add welcome message
        addMessage('assistant', '👋 Hello! I\'m OpenCursor Agent, your AI coding assistant with 400+ provider integrations and multi-agent collaboration capabilities. How can I help you today?');
    });
    
    function setupEventListeners() {
        // Send message
        sendBtn.addEventListener('click', sendMessage);
        messageInput.addEventListener('keydown', handleInputKeydown);
        
        // Auto-resize textarea
        messageInput.addEventListener('input', autoResizeTextarea);
        
        // Header actions
        clearChatBtn.addEventListener('click', clearChat);
        settingsBtn.addEventListener('click', openSettings);
        
        // Quick actions
        quickBtns.forEach(btn => {
            btn.addEventListener('click', () => handleQuickAction(btn.dataset.action));
        });
        
        // Focus input when clicking anywhere in chat
        messagesContainer.addEventListener('click', focusInput);
    }
    
    function handleInputKeydown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }
    
    function autoResizeTextarea() {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    }
    
    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message || isTyping) return;
        
        // Add user message
        addMessage('user', message);
        
        // Clear input
        messageInput.value = '';
        autoResizeTextarea();
        
        // Send to extension
        vscode.postMessage({
            type: 'sendMessage',
            message: message
        });
        
        // Show typing indicator
        showTyping();
    }
    
    function handleQuickAction(action) {
        const selectedText = getSelectedText();
        let message = '';
        
        switch (action) {
            case 'explain':
                message = selectedText ? 
                    `Explain this code:\n\n\`\`\`\n${selectedText}\n\`\`\`` : 
                    'Explain the current code in the editor.';
                break;
                
            case 'refactor':
                message = selectedText ? 
                    `Refactor this code to improve its quality and maintainability:\n\n\`\`\`\n${selectedText}\n\`\`\`` : 
                    'Refactor the current code in the editor to improve its quality.';
                break;
                
            case 'debug':
                message = selectedText ? 
                    `Debug this code and identify any issues:\n\n\`\`\`\n${selectedText}\n\`\`\`` : 
                    'Help me debug the current code in the editor.';
                break;
                
            case 'test':
                message = selectedText ? 
                    `Generate comprehensive tests for this code:\n\n\`\`\`\n${selectedText}\n\`\`\`` : 
                    'Generate tests for the current code in the editor.';
                break;
        }
        
        if (message) {
            messageInput.value = message;
            sendMessage();
        }
    }
    
    function getSelectedText() {
        // This would need to be implemented via VS Code API
        // For now, return empty string
        return '';
    }
    
    function addMessage(role, content, timestamp = new Date().toISOString()) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // Process markdown-like content
        messageContent.innerHTML = processMessageContent(content);
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = formatTime(timestamp);
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageTime);
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Add to history
        chatHistory.push({ role, content, timestamp });
        saveChatHistory();
    }
    
    function processMessageContent(content) {
        // Basic markdown processing
        let processed = content
            // Code blocks
            .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // URLs
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>')
            // Line breaks
            .replace(/\n/g, '<br>');
        
        // Lists
        processed = processed.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
        processed = processed.replace(/^-\s+(.+)$/gm, '<li>$1</li>');
        processed = processed.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        return processed;
    }
    
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    function showTyping() {
        isTyping = true;
        typingIndicator.classList.remove('hidden');
        sendBtn.disabled = true;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    function hideTyping() {
        isTyping = false;
        typingIndicator.classList.add('hidden');
        sendBtn.disabled = false;
        focusInput();
    }
    
    function clearChat() {
        if (confirm('Are you sure you want to clear the chat history?')) {
            messagesContainer.innerHTML = '';
            chatHistory = [];
            saveChatHistory();
            
            // Send clear message to extension
            vscode.postMessage({
                type: 'clearChat'
            });
            
            // Add welcome message back
            addMessage('assistant', 'Chat cleared! How can I help you?');
        }
    }
    
    function openSettings() {
        vscode.postMessage({
            type: 'openSettings'
        });
    }
    
    function focusInput() {
        messageInput.focus();
    }
    
    function loadChatHistory() {
        try {
            const saved = localStorage.getItem('opencursor-chat-history');
            if (saved) {
                chatHistory = JSON.parse(saved);
                chatHistory.forEach(msg => {
                    addMessage(msg.role, msg.content, msg.timestamp);
                });
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
        }
    }
    
    function saveChatHistory() {
        try {
            // Keep only last 50 messages
            const recentHistory = chatHistory.slice(-50);
            localStorage.setItem('opencursor-chat-history', JSON.stringify(recentHistory));
        } catch (error) {
            console.error('Failed to save chat history:', error);
        }
    }
    
    // Handle messages from extension
    window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.type) {
            case 'addMessage':
                hideTyping();
                addMessage(message.role, message.content, message.timestamp);
                break;
                
            case 'showTyping':
                showTyping();
                break;
                
            case 'hideTyping':
                hideTyping();
                break;
                
            case 'clearChat':
                messagesContainer.innerHTML = '';
                chatHistory = [];
                saveChatHistory();
                break;
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', event => {
        // Ctrl/Cmd + K to clear chat
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            clearChat();
        }
        
        // Ctrl/Cmd + / to focus input
        if ((event.ctrlKey || event.metaKey) && event.key === '/') {
            event.preventDefault();
            focusInput();
        }
        
        // Escape to blur input
        if (event.key === 'Escape') {
            messageInput.blur();
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
    
    // Auto-focus input when page loads
    setTimeout(focusInput, 100);
})();
