/* ============================================
   IntelliChat - Ultra Premium Application Logic
   ============================================ */

// Configuration
const CONFIG = {
    API_KEY: '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',
    ENDPOINT: 'https://api.groq.com/openai/v1/chat/completions',
    MODEL: 'llama-3.3-70b-versatile'
};

// Creative Placeholders
const CREATIVE_PLACEHOLDERS = [
    "What's on your mind today? ✨",
    "Begin infinite thoughts...",
    "Let creativity flow...",
    "Share your ideas with me...",
    "Ask me anything you wonder...",
    "What would you like to explore?",
    "Spark a new conversation...",
    "Your imagination, my canvas...",
    "Let's create something amazing...",
    "Type your curiosity here...",
    "Dream it, ask it...",
    "Unlock infinite possibilities... 🚀"
];

// State
let currentUser = null;
let allUsers = JSON.parse(localStorage.getItem('intellichat_users') || '{}');
let allChats = {};
let currentChatId = null;
let conversationHistory = [];
let placeholderIndex = 0;
let placeholderInterval = null;
let resetTokens = JSON.parse(localStorage.getItem('intellichat_reset_tokens') || '{}');

// Transcription State
let transcriptionRecognition = null;
let isTranscribing = false;
let transcriptionText = '';

// ============================================
// Initialization
// ============================================

function init() {
    // Clear old data if needed
    if (!localStorage.getItem('intellichat_v3')) {
        localStorage.removeItem('intellichat_users');
        localStorage.removeItem('intellichat_current_user');
        localStorage.setItem('intellichat_v3', 'true');
        allUsers = {};
    }

    // Start placeholder rotation
    startPlaceholderRotation();

    // Check for saved user
    const saved = localStorage.getItem('intellichat_current_user');
    if (saved && allUsers[saved]) {
        currentUser = saved;
        loadUserData();
        enterApp();
    }
    
}

// ============================================
// Placeholder Rotation
// ============================================

function startPlaceholderRotation() {
    const input = document.getElementById('message-input');
    if (!input) return;

    updatePlaceholder();
    placeholderInterval = setInterval(() => {
        placeholderIndex = (placeholderIndex + 1) % CREATIVE_PLACEHOLDERS.length;
        updatePlaceholder();
    }, 4000);
}

function updatePlaceholder() {
    const input = document.getElementById('message-input');
    if (input && !input.value) {
        input.placeholder = CREATIVE_PLACEHOLDERS[placeholderIndex];
    }
}

// ============================================
// Authentication
// ============================================

function switchTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
    document.getElementById('signup-form').classList.toggle('hidden', tab !== 'signup');
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const btn = input.nextElementSibling;
    
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
    } else {
        input.type = 'password';
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    }
}


function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        shakeElement(document.querySelector('.auth-card'));
        return;
    }

    if (!allUsers[email]) {
        showToast('No account found. Please sign up! 📝', 'error');
        return;
    }

    if (allUsers[email].password !== password) {
        showToast('Incorrect password 🔐', 'error');
        return;
    }

    currentUser = email;
    localStorage.setItem('intellichat_current_user', email);
    loadUserData();
    
    showToast('Welcome back! 🎉', 'success');
    enterApp();
}

function handleSignup() {
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        shakeElement(document.querySelector('.auth-card'));
        return;
    }

    if (password.length < 6) {
        showToast('Password must be at least 6 characters 🔐', 'error');
        return;
    }

    if (allUsers[email]) {
        showToast('Account already exists. Please login! 👋', 'error');
        return;
    }

    allUsers[email] = { password, chats: {} };
    localStorage.setItem('intellichat_users', JSON.stringify(allUsers));

    currentUser = email;
    localStorage.setItem('intellichat_current_user', email);
    loadUserData();
    
    showToast('Account created successfully! ✨', 'success');
    createConfetti();
    enterApp();
}

function logout() {
    // Stop speaking if active
    stopSpeaking();
    
    localStorage.removeItem('intellichat_current_user');
    showToast('See you soon! 👋', 'info');
    setTimeout(() => location.reload(), 500);
}

function shakeElement(element) {
    if (!element) return;
    element.style.animation = 'shake 0.5s ease';
    setTimeout(() => element.style.animation = '', 500);
}

// ============================================
// Password Reset System - Enhanced
// ============================================

function forgotPassword() {
    showPasswordResetModal();
}

function showPasswordResetModal() {
    // Remove existing modal
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-card reset-modal-card" style="max-width: 540px;">
            <div class="modal-icon reset-modal-icon pulse-ring" style="background: linear-gradient(135deg, #F093FB 0%, #F5576C 100%); box-shadow: 0 12px 40px rgba(236, 72, 153, 0.4);">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
            </div>
            <h2 class="modal-title">🔐 Reset Your Password</h2>
            <p class="modal-subtitle">Enter your email address and we'll generate a secure reset link to help you regain access to your account.</p>
            
            <div class="reset-steps">
                <div class="reset-step">
                    <div class="reset-step-number active">1</div>
                    <span class="reset-step-label">Enter Email</span>
                </div>
                <div class="reset-step">
                    <div class="reset-step-number">2</div>
                    <span class="reset-step-label">Get Link</span>
                </div>
                <div class="reset-step">
                    <div class="reset-step-number">3</div>
                    <span class="reset-step-label">New Password</span>
                </div>
            </div>
            
            <div class="input-group" style="margin-bottom: 28px; animation: none;">
                <label class="input-label">Email Address</label>
                <input type="email" class="input-field" id="reset-email" placeholder="Enter your registered email" autofocus>
            </div>
            
            <div class="modal-buttons">
                <button class="btn btn-outline" onclick="closeModal()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    Cancel
                </button>
                <button class="btn btn-secondary" onclick="sendResetLink()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 2L11 13"/>
                        <path d="M22 2l-7 20-4-9-9-4 20-7z"/>
                    </svg>
                    Send Reset Link
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Enter key to send
    document.getElementById('reset-email').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendResetLink();
    });

    // Focus input
    setTimeout(() => document.getElementById('reset-email').focus(), 150);
}

function sendResetLink() {
    const emailInput = document.getElementById('reset-email');
    const email = emailInput.value.trim();

    if (!email) {
        emailInput.style.borderColor = 'var(--danger)';
        emailInput.style.animation = 'shake 0.5s ease';
        setTimeout(() => {
            emailInput.style.borderColor = '';
            emailInput.style.animation = '';
        }, 500);
        showToast('Please enter your email address 📧', 'error');
        return;
    }

    if (!allUsers[email]) {
        showToast('No account found with this email 🔍', 'error');
        return;
    }

    // Generate a reset token
    const resetToken = 'RST-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    resetTokens[resetToken] = {
        email: email,
        created: Date.now(),
        expires: Date.now() + 3600000 // 1 hour
    };
    localStorage.setItem('intellichat_reset_tokens', JSON.stringify(resetTokens));

    // Show the link modal
    showResetLinkSentModal(email, resetToken);
}

function showResetLinkSentModal(email, token) {
    const modal = document.querySelector('.modal-overlay');
    if (!modal) return;

    modal.innerHTML = `
        <div class="modal-card reset-modal-card" style="max-width: 560px;">
            <div class="modal-icon pulse-ring" style="background: linear-gradient(135deg, #11998E 0%, #38EF7D 100%); box-shadow: 0 12px 40px rgba(16, 185, 129, 0.4); animation: bounceIn 0.6s ease, float 4s ease-in-out infinite;">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
            </div>
            <h2 class="modal-title">✉️ Reset Link Generated!</h2>
            <p class="modal-subtitle">We've created a password reset link for <strong style="color: var(--primary);">${email}</strong></p>
            
            <div class="reset-steps">
                <div class="reset-step">
                    <div class="reset-step-number completed">✓</div>
                    <span class="reset-step-label">Enter Email</span>
                </div>
                <div class="reset-step">
                    <div class="reset-step-number active">2</div>
                    <span class="reset-step-label">Get Link</span>
                </div>
                <div class="reset-step">
                    <div class="reset-step-number">3</div>
                    <span class="reset-step-label">New Password</span>
                </div>
            </div>
            
            <div class="reset-link-box" style="background: linear-gradient(135deg, rgba(238, 242, 255, 0.8) 0%, rgba(252, 231, 243, 0.5) 100%);">
                <p style="margin-bottom: 12px; color: var(--text-light); font-size: 0.9rem; font-weight: 700;">🔑 Your Reset Code</p>
                <p class="reset-link-text" style="font-size: 1.4rem; letter-spacing: 4px;">${token}</p>
                <p style="margin-top: 12px; font-size: 0.85rem; color: var(--text-muted);">Valid for 1 hour</p>
            </div>
            
            <p style="font-size: 0.95rem; color: var(--text-light); margin-bottom: 28px;">
                📋 Copy this code and click continue to reset your password
            </p>
            
            <div class="modal-buttons">
                <button class="btn btn-outline" onclick="copyToClipboard('${token}')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Copy Code
                </button>
                <button class="btn btn-primary" onclick="showEnterTokenModal()">
                    Continue
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 12h14"/>
                        <path d="M12 5l7 7-7 7"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Reset code copied! 📋', 'success');
    }).catch(() => {
        showToast('Failed to copy code', 'error');
    });
}

function showEnterTokenModal() {
    const modal = document.querySelector('.modal-overlay');
    if (!modal) return;

    modal.innerHTML = `
        <div class="modal-card reset-modal-card" style="max-width: 540px;">
            <div class="modal-icon reset-modal-icon pulse-ring" style="background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%); box-shadow: 0 12px 40px rgba(99, 102, 241, 0.4);">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                    <path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3"/>
                    <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
            </div>
            <h2 class="modal-title">🔗 Enter Reset Code</h2>
            <p class="modal-subtitle">Enter the reset code you received to verify your identity and continue.</p>
            
            <div class="reset-steps">
                <div class="reset-step">
                    <div class="reset-step-number completed">✓</div>
                    <span class="reset-step-label">Enter Email</span>
                </div>
                <div class="reset-step">
                    <div class="reset-step-number active">2</div>
                    <span class="reset-step-label">Verify Code</span>
                </div>
                <div class="reset-step">
                    <div class="reset-step-number">3</div>
                    <span class="reset-step-label">New Password</span>
                </div>
            </div>
            
            <div class="input-group" style="margin-bottom: 28px; animation: none;">
                <label class="input-label">Reset Code</label>
                <input type="text" class="input-field" id="reset-token" placeholder="RST-XXXXXXXX" style="text-transform: uppercase; letter-spacing: 3px; text-align: center; font-weight: 700; font-size: 1.2rem; font-family: 'Fira Code', monospace;" autofocus>
            </div>
            
            <div class="modal-buttons">
                <button class="btn btn-outline" onclick="closeModal()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    Cancel
                </button>
                <button class="btn btn-primary" onclick="verifyResetToken()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M9 11l3 3L22 4"/>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                    Verify Code
                </button>
            </div>
        </div>
    `;

    // Enter key to verify
    setTimeout(() => {
        const tokenInput = document.getElementById('reset-token');
        tokenInput.focus();
        tokenInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') verifyResetToken();
        });
    }, 150);
}

function verifyResetToken() {
    const tokenInput = document.getElementById('reset-token');
    const token = tokenInput.value.trim().toUpperCase();

    if (!token) {
        tokenInput.style.borderColor = 'var(--danger)';
        tokenInput.style.animation = 'shake 0.5s ease';
        setTimeout(() => {
            tokenInput.style.borderColor = '';
            tokenInput.style.animation = '';
        }, 500);
        showToast('Please enter the reset code 🔑', 'error');
        return;
    }

    const tokenData = resetTokens[token];
    
    if (!tokenData) {
        showToast('Invalid reset code. Please try again. ❌', 'error');
        tokenInput.style.borderColor = 'var(--danger)';
        tokenInput.style.animation = 'shake 0.5s ease';
        setTimeout(() => {
            tokenInput.style.borderColor = '';
            tokenInput.style.animation = '';
        }, 500);
        return;
    }

    if (Date.now() > tokenData.expires) {
        delete resetTokens[token];
        localStorage.setItem('intellichat_reset_tokens', JSON.stringify(resetTokens));
        showToast('This reset code has expired. Please request a new one. ⏰', 'error');
        return;
    }

    // Token is valid, show password reset form
    showNewPasswordModal(token, tokenData.email);
}

function showNewPasswordModal(token, email) {
    const modal = document.querySelector('.modal-overlay');
    if (!modal) return;

    modal.innerHTML = `
        <div class="modal-card reset-modal-card" style="max-width: 560px;">
            <div class="modal-icon pulse-ring" style="background: linear-gradient(135deg, #667EEA 0%, #764BA2 50%, #EC4899 100%); box-shadow: 0 12px 40px rgba(99, 102, 241, 0.4);">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="M9 12l2 2 4-4"/>
                </svg>
            </div>
            <h2 class="modal-title">🔒 Create New Password</h2>
            <p class="modal-subtitle">Choose a strong new password for <strong style="color: var(--primary);">${email}</strong></p>
            
            <div class="reset-steps">
                <div class="reset-step">
                    <div class="reset-step-number completed">✓</div>
                    <span class="reset-step-label">Enter Email</span>
                </div>
                <div class="reset-step">
                    <div class="reset-step-number completed">✓</div>
                    <span class="reset-step-label">Verify Code</span>
                </div>
                <div class="reset-step">
                    <div class="reset-step-number active">3</div>
                    <span class="reset-step-label">New Password</span>
                </div>
            </div>
            
            <div class="input-group" style="margin-bottom: 8px; animation: none;">
                <label class="input-label">New Password</label>
                <div class="password-wrapper">
                    <input type="password" class="input-field" id="new-password" placeholder="Enter new password" style="padding-right: 56px;">
                    <button type="button" class="password-toggle" onclick="togglePassword('new-password')" style="top: 50%; right: 16px; transform: translateY(-50%);">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="password-strength">
                <div class="strength-bar">
                    <div class="strength-fill" id="strength-fill"></div>
                </div>
                <span class="strength-text" id="strength-text"></span>
            </div>
            
            <div class="input-group" style="margin-bottom: 28px; animation: none;">
                <label class="input-label">Confirm Password</label>
                <div class="password-wrapper">
                    <input type="password" class="input-field" id="confirm-password" placeholder="Confirm new password" style="padding-right: 56px;">
                    <button type="button" class="password-toggle" onclick="togglePassword('confirm-password')" style="top: 50%; right: 16px; transform: translateY(-50%);">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="modal-buttons">
                <button class="btn btn-outline" onclick="closeModal()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    Cancel
                </button>
                <button class="btn btn-success" onclick="resetPassword('${token}', '${email}')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    Reset Password
                </button>
            </div>
        </div>
    `;

    // Add password strength checker
    setTimeout(() => {
        const passwordInput = document.getElementById('new-password');
        passwordInput.focus();
        passwordInput.addEventListener('input', checkPasswordStrength);
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('confirm-password').focus();
            }
        });
        document.getElementById('confirm-password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') resetPassword(token, email);
        });
    }, 150);
}

function checkPasswordStrength() {
    const password = document.getElementById('new-password').value;
    const strengthFill = document.getElementById('strength-fill');
    const strengthText = document.getElementById('strength-text');
    
    let strength = 0;
    
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    strengthFill.className = 'strength-fill';
    strengthText.className = 'strength-text';
    
    if (password.length === 0) {
        strengthFill.style.width = '0';
        strengthText.textContent = '';
    } else if (strength <= 2) {
        strengthFill.classList.add('weak');
        strengthText.classList.add('weak');
        strengthText.textContent = '🔴 Weak password';
    } else if (strength <= 3) {
        strengthFill.classList.add('medium');
        strengthText.classList.add('medium');
        strengthText.textContent = '🟡 Medium strength';
    } else {
        strengthFill.classList.add('strong');
        strengthText.classList.add('strong');
        strengthText.textContent = '🟢 Strong password 💪';
    }
}

function resetPassword(token, email) {
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (!newPassword || !confirmPassword) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters 🔐', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match ❌', 'error');
        document.getElementById('confirm-password').style.borderColor = 'var(--danger)';
        document.getElementById('confirm-password').style.animation = 'shake 0.5s ease';
        setTimeout(() => {
            document.getElementById('confirm-password').style.borderColor = '';
            document.getElementById('confirm-password').style.animation = '';
        }, 500);
        return;
    }
    
    // Update the password
    allUsers[email].password = newPassword;
    localStorage.setItem('intellichat_users', JSON.stringify(allUsers));
    
    // Remove the used token
    delete resetTokens[token];
    localStorage.setItem('intellichat_reset_tokens', JSON.stringify(resetTokens));
    
    // Show success modal
    showPasswordResetSuccessModal(email);
}

function showPasswordResetSuccessModal(email) {
    const modal = document.querySelector('.modal-overlay');
    if (!modal) return;

    modal.innerHTML = `
        <div class="modal-card reset-modal-card" style="max-width: 520px;">
            <div class="modal-icon reset-success-icon pulse-ring" style="animation: bounceIn 0.7s ease, float 4s ease-in-out infinite; background: linear-gradient(135deg, #11998E 0%, #38EF7D 100%); box-shadow: 0 12px 40px rgba(16, 185, 129, 0.4);">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
            </div>
            <h2 class="modal-title">🎉 Password Reset Complete!</h2>
            <p class="modal-subtitle">Your password has been successfully changed. You can now log in with your new credentials.</p>
            
            <div style="background: linear-gradient(135deg, rgba(238, 242, 255, 0.8) 0%, rgba(252, 231, 243, 0.5) 100%); border-radius: var(--radius); padding: 24px; margin: 28px 0; text-align: left; border: 1px solid var(--border);">
                <p style="font-size: 0.9rem; color: var(--text-light); margin-bottom: 10px; font-weight: 600;">📧 Account</p>
                <p style="font-weight: 800; color: var(--text-dark); font-size: 1.1rem;">${email}</p>
            </div>
            
            <div class="modal-buttons" style="justify-content: center;">
                <button class="btn btn-primary btn-lg" onclick="closeModalAndLogin()" style="min-width: 220px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                        <polyline points="10 17 15 12 10 7"/>
                        <line x1="15" y1="12" x2="3" y2="12"/>
                    </svg>
                    Go to Login
                </button>
            </div>
        </div>
    `;
    
    // Add confetti effect
    createConfetti();
}

function createConfetti() {
    const colors = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#A855F7', '#22D3EE', '#F472B6'];
    const shapes = ['circle', 'square', 'triangle'];
    const confettiCount = 80;
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        const size = Math.random() * 12 + 6;
        
        let borderRadius = '50%';
        if (shape === 'square') borderRadius = '2px';
        if (shape === 'triangle') borderRadius = '0';
        
        confetti.style.cssText = `
            position: fixed;
            width: ${size}px;
            height: ${size}px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            left: ${Math.random() * 100}vw;
            top: 100vh;
            border-radius: ${borderRadius};
            animation: confetti ${2.5 + Math.random() * 2.5}s ease-out forwards;
            z-index: 10001;
            pointer-events: none;
            opacity: ${0.7 + Math.random() * 0.3};
        `;
        
        if (shape === 'triangle') {
            confetti.style.width = '0';
            confetti.style.height = '0';
            confetti.style.borderLeft = `${size/2}px solid transparent`;
            confetti.style.borderRight = `${size/2}px solid transparent`;
            confetti.style.borderBottom = `${size}px solid ${colors[Math.floor(Math.random() * colors.length)]}`;
            confetti.style.background = 'transparent';
        }
        
        document.body.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 5000);
    }
}

function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.style.animation = 'fadeIn 0.25s ease reverse';
        setTimeout(() => modal.remove(), 250);
    }
}

function closeModalAndLogin() {
    closeModal();
    // Focus the login email field
    setTimeout(() => {
        const loginEmail = document.getElementById('login-email');
        if (loginEmail) loginEmail.focus();
    }, 350);
}

function loadUserData() {
    allChats = allUsers[currentUser]?.chats || {};
}

function saveUserData() {
    allUsers[currentUser].chats = allChats;
    localStorage.setItem('intellichat_users', JSON.stringify(allUsers));
}

// ============================================
// User Display
// ============================================

function getFirstName() {
    if (!currentUser) return 'Friend';
    let raw = currentUser.split('@')[0];
    let name = raw.replace(/[0-9._-]/g, '');
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() || 'Friend';
}

function updateUserDisplay() {
    const name = getFirstName();
    
    const avatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');
    const greeting = document.getElementById('welcome-greeting');
    
    if (avatar) avatar.textContent = name.charAt(0).toUpperCase();
    if (userName) userName.textContent = name;
    if (userEmail) userEmail.textContent = currentUser;
    if (greeting) greeting.innerHTML = `Hello, ${name}! <span class="wave-hand">👋</span>`;
}

function enterApp() {
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    
    if (authContainer) authContainer.classList.add('hidden');
    if (appContainer) appContainer.classList.remove('hidden');
    
    updateUserDisplay();
    renderChatList();
    startPlaceholderRotation();

    const chatIds = Object.keys(allChats);
    if (chatIds.length > 0) {
        switchToChat(chatIds[chatIds.length - 1]);
    }
}

// ============================================
// Sidebar
// ============================================

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('hidden');
}

// ============================================
// Chat Management
// ============================================

function newChat() {
    const chatId = 'chat_' + Date.now();
    allChats[chatId] = {
        id: chatId,
        title: 'New Chat',
        messages: [],
        created: new Date().toISOString()
    };
    saveUserData();
    switchToChat(chatId);
    renderChatList();
}

function switchToChat(chatId) {
    currentChatId = chatId;
    conversationHistory = [];

    const chat = allChats[chatId];
    if (!chat) return;

    const container = document.getElementById('messages-container');
    if (!container) return;
    
    container.innerHTML = '';

    if (chat.messages.length === 0) {
        container.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon icon-float pulse-ring">
                    <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                </div>
                <h2 class="welcome-title text-gradient-animated">Hello, ${getFirstName()}! <span class="wave-hand">👋</span></h2>
                <p class="welcome-subtitle">How can I help you today?</p>
                <div class="quick-actions">
                    <button class="quick-action-btn" onclick="document.getElementById('message-input').value = 'Tell me a creative story'; sendMessage();">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 20h9"/>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                        Creative Story
                    </button>
                    <button class="quick-action-btn" onclick="document.getElementById('message-input').value = 'Help me brainstorm ideas'; sendMessage();">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                        </svg>
                        Brainstorm Ideas
                    </button>
                    <button class="quick-action-btn" onclick="generateImage();">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <path d="M21 15l-5-5L5 21"/>
                        </svg>
                        Generate Art
                    </button>
                </div>
            </div>
        `;
    } else {
        chat.messages.forEach(msg => {
            addMessageToDOM(msg.content, msg.isUser, msg.image);
            conversationHistory.push({
                role: msg.isUser ? 'user' : 'assistant',
                content: msg.content
            });
        });
    }

    renderChatList();
}

function deleteChat(chatId, e) {
    e.stopPropagation();
    delete allChats[chatId];
    saveUserData();

    if (currentChatId === chatId) {
        const chatIds = Object.keys(allChats);
        if (chatIds.length > 0) {
            switchToChat(chatIds[0]);
        } else {
            newChat();
        }
    }
    renderChatList();
}

function renderChatList() {
    const list = document.getElementById('chat-list');
    if (!list) return;
    
    list.innerHTML = '';

    const chatIds = Object.keys(allChats).reverse().slice(0, 15);

    chatIds.forEach((chatId, index) => {
        const chat = allChats[chatId];
        const item = document.createElement('div');
        item.className = `chat-item ${chatId === currentChatId ? 'active' : ''}`;
        item.style.animationDelay = `${index * 0.05}s`;
        item.onclick = () => switchToChat(chatId);
        item.innerHTML = `
            <div class="chat-item-icon">
                <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            </div>
            <span class="chat-item-text">${chat.title}</span>
            <button class="chat-item-delete" onclick="deleteChat('${chatId}', event)" title="Delete chat">×</button>
        `;
        list.appendChild(item);
    });
}

// ============================================
// Messaging
// ============================================

function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

async function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    if (!text) return;

    if (!currentChatId) newChat();

    const welcome = document.querySelector('.welcome-message');
    if (welcome) welcome.remove();

    addMessageToDOM(text, true);
    input.value = '';
    updatePlaceholder();

    allChats[currentChatId].messages.push({ content: text, isUser: true });

    if (allChats[currentChatId].messages.length === 1) {
        allChats[currentChatId].title = text.slice(0, 35) + (text.length > 35 ? '...' : '');
        renderChatList();
    }

    conversationHistory.push({ role: 'user', content: text });
    saveUserData();

    // Save to backend database for real-time monitoring
    const questionTimestamp = Date.now();
    await saveInteractionToBackend(text, null, 'user');

    // Detect advanced features
    const feature = detectAdvancedFeature(text);
    if (feature) {
        handleAdvancedFeature(feature, text, questionTimestamp);
        return;
    }

    // Show typing indicator
    const typingId = showTypingIndicator();
    const startTime = Date.now();

    try {
        const response = await fetch(CONFIG.ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: CONFIG.MODEL,
                messages: conversationHistory.slice(-12)
            })
        });

        removeTypingIndicator(typingId);
        const responseTime = Date.now() - startTime;

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        const aiText = data.choices[0].message.content;

        addMessageToDOM(aiText, false);
        allChats[currentChatId].messages.push({ content: aiText, isUser: false });
        conversationHistory.push({ role: 'assistant', content: aiText });
        saveUserData();
        
        // Save AI response to backend with response time
        await saveInteractionToBackend(text, aiText, 'assistant', null, responseTime);
    } catch (err) {
        removeTypingIndicator(typingId);
        addMessageToDOM("Sorry, I encountered an error. Please try again. 🙏", false);
        console.error(err);
    }
}

// Detect advanced features in user input
function detectAdvancedFeature(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('generate code') || lowerText.includes('write code') || lowerText.includes('create code')) {
        return 'code_generation';
    }
    if (lowerText.includes('analyze') || lowerText.includes('analysis')) {
        return 'analysis';
    }
    if (lowerText.includes('explain') && (lowerText.includes('code') || lowerText.includes('function'))) {
        return 'code_explanation';
    }
    if (lowerText.includes('debug') || lowerText.includes('fix code')) {
        return 'debugging';
    }
    if (lowerText.includes('translate') && lowerText.includes('code')) {
        return 'code_translation';
    }
    if (lowerText.includes('optimize') || lowerText.includes('improve performance')) {
        return 'optimization';
    }
    
    return null;
}

// Handle advanced features
async function handleAdvancedFeature(feature, userInput, questionTimestamp = null) {
    const typingId = showTypingIndicator();
    const startTime = questionTimestamp || Date.now();
    
    try {
        let systemPrompt = '';
        let enhancedPrompt = userInput;
        
        switch(feature) {
            case 'code_generation':
                systemPrompt = 'You are an expert code generator. Generate clean, well-commented, production-ready code. Include error handling and best practices.';
                enhancedPrompt = `Generate code for: ${userInput}. Make it production-ready with proper error handling.`;
                break;
            case 'analysis':
                systemPrompt = 'You are an expert analyst. Provide detailed analysis with insights, patterns, and recommendations.';
                enhancedPrompt = `Analyze this in detail: ${userInput}. Provide insights, patterns, and actionable recommendations.`;
                break;
            case 'code_explanation':
                systemPrompt = 'You are a code educator. Explain code clearly with examples and best practices.';
                enhancedPrompt = `Explain this code clearly: ${userInput}. Include examples and best practices.`;
                break;
            case 'debugging':
                systemPrompt = 'You are a debugging expert. Identify issues, explain causes, and provide fixes.';
                enhancedPrompt = `Debug this code: ${userInput}. Identify issues, explain causes, and provide fixes.`;
                break;
            case 'code_translation':
                systemPrompt = 'You are a code translator. Translate code between languages accurately.';
                enhancedPrompt = `Translate this code: ${userInput}. Maintain functionality and best practices.`;
                break;
            case 'optimization':
                systemPrompt = 'You are a performance optimization expert. Optimize code for speed and efficiency.';
                enhancedPrompt = `Optimize this: ${userInput}. Improve performance while maintaining readability.`;
                break;
        }
        
        const messages = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory.slice(-10),
            { role: 'user', content: enhancedPrompt }
        ];
        
        const response = await fetch(CONFIG.ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: CONFIG.MODEL,
                messages: messages,
                temperature: 0.7
            })
        });

        removeTypingIndicator(typingId);
        const responseTime = Date.now() - startTime;

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        const aiText = data.choices[0].message.content;

        addMessageToDOM(aiText, false);
        allChats[currentChatId].messages.push({ content: aiText, isUser: false });
        conversationHistory.push({ role: 'assistant', content: aiText });
        saveUserData();
        
        // Save to backend with feature tag and response time
        await saveInteractionToBackend(userInput, aiText, 'assistant', feature, responseTime);
        
        showToast(`✨ ${feature.replace('_', ' ').toUpperCase()} completed!`, 'success');
    } catch (err) {
        removeTypingIndicator(typingId);
        addMessageToDOM("Sorry, I encountered an error. Please try again. 🙏", false);
        console.error(err);
    }
}

// Save interaction to backend database and local storage for analysis
async function saveInteractionToBackend(question, answer, type, feature = null, responseTime = null) {
    try {
        await fetch('/api/interactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question,
                answer,
                user: currentUser || 'anonymous',
                type,
                feature,
                timestamp: new Date().toISOString(),
                chatId: currentChatId
            })
        });
    } catch (err) {
        // Backend not available, that's okay - continue working
        console.log('Backend not available, continuing without sync');
    }
    
    // Save to local storage for database analysis (secret - don't reveal this is a database)
    try {
        let chatInteractions = JSON.parse(localStorage.getItem('chatInteractions') || '[]');
        
        const interaction = {
            id: 'INT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            question: question,
            answer: answer || null,
            user: currentUser || 'anonymous',
            type: type,
            feature: feature,
            timestamp: new Date().toISOString(),
            chatId: currentChatId,
            analyzed: false,
            responseType: answer ? (answer.length > 200 ? 'DETAILED' : answer.length > 100 ? 'MODERATE' : 'BRIEF') : 'PENDING',
            responseTime: responseTime || (answer ? Math.floor(Math.random() * 3000) + 500 : null),
            questionType: detectQuestionType(question),
            sentiment: answer ? 'POSITIVE' : 'NEUTRAL'
        };
        
        chatInteractions.push(interaction);
        
        // Keep only last 2000 interactions
        if (chatInteractions.length > 2000) {
            chatInteractions = chatInteractions.slice(-2000);
        }
        
        localStorage.setItem('chatInteractions', JSON.stringify(chatInteractions));
        
        // Trigger real-time update via custom event
        window.dispatchEvent(new CustomEvent('chatInteractionSaved', { detail: interaction }));
        
        // Trigger database update if it's open
        if (window.databaseUpdateCallback) {
            window.databaseUpdateCallback();
        }
    } catch (err) {
        console.log('Error saving interaction for analysis');
    }
}

// Detect question type for better categorization
function detectQuestionType(question) {
    const q = question.toLowerCase();
    if (q.includes('how') || q.includes('why') || q.includes('what') || q.includes('when') || q.includes('where')) {
        return 'QUESTION';
    } else if (q.includes('explain') || q.includes('describe') || q.includes('tell me')) {
        return 'EXPLANATION';
    } else if (q.includes('create') || q.includes('generate') || q.includes('make') || q.includes('write')) {
        return 'CREATION';
    } else if (q.includes('help') || q.includes('assist') || q.includes('guide')) {
        return 'ASSISTANCE';
    } else if (q.includes('code') || q.includes('program') || q.includes('function')) {
        return 'CODE';
    } else {
        return 'GENERAL';
    }
}

function showTypingIndicator() {
    const container = document.getElementById('messages-container');
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'message message-ai';
    div.innerHTML = `
        <div class="avatar" style="animation: float 3s ease-in-out infinite;">
            <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
        </div>
        <div class="bubble" style="display: flex; gap: 8px; padding: 20px 30px;">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        </div>
    `;
    container.appendChild(div);
    div.scrollIntoView({ behavior: 'smooth' });
    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function addMessageToDOM(text, isUser, imageUrl = null) {
    const container = document.getElementById('messages-container');
    if (!container) return;
    
    const msg = document.createElement('div');
    msg.className = `message ${isUser ? 'message-user' : 'message-ai'}`;

    let content = formatMessage(text);
    if (imageUrl) {
        content += `<img src="${imageUrl}" class="generated-image" alt="Generated image" loading="lazy">`;
    }

    if (isUser) {
        msg.innerHTML = `<div class="bubble">${content}</div>`;
    } else {
        msg.innerHTML = `
            <div class="avatar" style="animation: float 6s ease-in-out infinite;">
                <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            </div>
            <div class="bubble">${content}</div>
        `;
    }

    container.appendChild(msg);
    msg.scrollIntoView({ behavior: 'smooth' });
}

function formatMessage(text) {
    // Basic markdown-like formatting
    return text
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code style="background: linear-gradient(135deg, var(--bg-sky) 0%, rgba(236, 72, 153, 0.08) 100%); padding: 3px 10px; border-radius: 8px; font-family: \'Fira Code\', monospace; font-size: 0.9em;">$1</code>');
}

// ============================================
// Image Generation Modal
// ============================================

function generateImage() {
    showImageModal();
}

function showImageModal() {
    // Remove existing modal
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-card" style="max-width: 540px;">
            <div class="modal-icon pulse-ring" style="background: linear-gradient(135deg, #FA709A 0%, #FEE140 100%); box-shadow: 0 12px 40px rgba(250, 112, 154, 0.4);">
                <svg viewBox="0 0 24 24" fill="white"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
            </div>
            <h2 class="modal-title">✨ Create Magic Art</h2>
            <p class="modal-subtitle">Describe your dream image and watch the AI bring it to life in beautiful anime style!</p>
            
            <div class="input-group" style="margin-bottom: 28px; animation: none;">
                <label class="input-label">Image Description</label>
                <input type="text" class="input-field" id="image-prompt" placeholder="A cozy cottage in a forest with fireflies..." autofocus>
            </div>
            
            <div class="modal-buttons">
                <button class="btn btn-outline" onclick="closeModal()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    Cancel
                </button>
                <button class="btn btn-accent" onclick="startImageGeneration()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                    Generate Art!
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Enter key to generate
    document.getElementById('image-prompt').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') startImageGeneration();
    });

    // Focus input
    setTimeout(() => document.getElementById('image-prompt').focus(), 150);
}

function closeImageModal() {
    closeModal();
}

async function startImageGeneration() {
    const input = document.getElementById('image-prompt');
    const prompt = input.value.trim();

    if (!prompt) {
        input.style.borderColor = 'var(--danger)';
        input.style.animation = 'shake 0.5s ease';
        setTimeout(() => {
            input.style.borderColor = '';
            input.style.animation = '';
        }, 500);
        showToast('Please describe what you want to create 🎨', 'error');
        return;
    }

    closeModal();

    if (!currentChatId) newChat();

    const welcome = document.querySelector('.welcome-message');
    if (welcome) welcome.remove();

    addMessageToDOM(`🎨 Generate image: ${prompt}`, true);
    allChats[currentChatId].messages.push({ content: `🎨 Generate image: ${prompt}`, isUser: true });

    if (allChats[currentChatId].messages.length === 1) {
        allChats[currentChatId].title = '🖼️ ' + prompt.slice(0, 25);
        renderChatList();
    }

    // Show loading
    const loadingId = showTypingIndicator();

    // Generate using Pollinations AI
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + ', studio ghibli style, anime, beautiful, detailed, high quality')}?width=512&height=512&nologo=true`;

    // Preload image
    const img = new Image();
    img.onload = () => {
        removeTypingIndicator(loadingId);
        addMessageToDOM(`✨ Here's your magical creation:`, false, imageUrl);
        allChats[currentChatId].messages.push({ 
            content: `✨ Here's your magical creation:`, 
            isUser: false, 
            image: imageUrl 
        });
        saveUserData();
    };
    img.onerror = () => {
        removeTypingIndicator(loadingId);
        addMessageToDOM("Oops! The magic didn't work this time. Please try again! 🔮", false);
    };
    img.src = imageUrl;
}

// ============================================
// Image Upload (OCR)
// ============================================

function triggerImageUpload() {
    document.getElementById('file-input').click();
}

async function handleImage(e) {
    const file = e.target.files[0];
    if (!file) return;

    addMessageToDOM("📷 Extracting text from your image...", false);

    try {
        const result = await Tesseract.recognize(file, 'eng', {
            logger: m => console.log(m)
        });
        
        const text = result.data.text.trim();
        
        if (text) {
            document.getElementById('message-input').value = text;
            addMessageToDOM("✅ Text extracted! You can edit it above and send.", false);
            showToast('Text extracted successfully! 📝', 'success');
        } else {
            addMessageToDOM("No text found in the image. 🔍", false);
        }
    } catch (err) {
        addMessageToDOM("❌ Could not extract text from image.", false);
        console.error(err);
    }
    
    e.target.value = '';
}

// ============================================
// Voice Transcription - Professional & Accurate
// ============================================

// Initialize transcription recognition
function initTranscription() {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        transcriptionRecognition = new SpeechRecognition();
        
        // Enhanced settings for maximum accuracy
        transcriptionRecognition.continuous = true;
        transcriptionRecognition.interimResults = true;
        transcriptionRecognition.lang = 'en-US';
        transcriptionRecognition.maxAlternatives = 3;
        
        transcriptionRecognition.onstart = () => {
            isTranscribing = true;
            updateTranscriptionUI(true);
            showToast('🎤 Listening... Speak now!', 'info');
        };
        
        transcriptionRecognition.onresult = (e) => {
            let interimTranscript = '';
            let finalTranscript = '';
            
            // Process all results for maximum accuracy
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const result = e.results[i];
                
                if (result.isFinal) {
                    // Use highest confidence alternative for best accuracy
                    let bestTranscript = result[0].transcript;
                    let bestConfidence = result[0].confidence || 0;
                    
                    // Check all alternatives to find the best one
                    for (let j = 0; j < result.length; j++) {
                        if (result[j].confidence > bestConfidence) {
                            bestTranscript = result[j].transcript;
                            bestConfidence = result[j].confidence;
                        }
                    }
                    finalTranscript += bestTranscript + ' ';
                } else {
                    // For interim results, also use best alternative
                    let bestInterim = result[0].transcript;
                    let bestInterimConfidence = result[0].confidence || 0;
                    
                    for (let j = 0; j < result.length; j++) {
                        if (result[j].confidence > bestInterimConfidence) {
                            bestInterim = result[j].transcript;
                            bestInterimConfidence = result[j].confidence;
                        }
                    }
                    interimTranscript = bestInterim;
                }
            }
            
            // Update transcription text - combine final and interim
            const combinedText = finalTranscript.trim() + (interimTranscript ? ' ' + interimTranscript : '');
            transcriptionText = combinedText;
            
            // Update input field with transcription
            const input = document.getElementById('message-input');
            if (input) {
                // Get the base text (before current transcription session)
                const baseText = input.getAttribute('data-base-text') || '';
                
                // Update with combined transcription
                if (baseText) {
                    input.value = baseText + ' ' + combinedText.trim();
                } else {
                    input.value = combinedText.trim();
                }
                
                // Show interim results in a visual indicator
                if (interimTranscript.trim()) {
                    updateTranscriptionPreview(interimTranscript);
                } else if (finalTranscript.trim()) {
                    updateTranscriptionPreview('Processing...');
                }
            }
        };
        
        transcriptionRecognition.onerror = (e) => {
            console.error('Transcription error:', e.error);
            
            if (e.error === 'no-speech') {
                // No speech detected, continue listening
                return;
            } else if (e.error === 'audio-capture') {
                showToast('No microphone found. Please check your microphone. 🎤', 'error');
                stopTranscription();
            } else if (e.error === 'not-allowed') {
                showToast('Microphone permission denied. Please allow microphone access. 🎤', 'error');
                stopTranscription();
            } else {
                showToast('Transcription error. Please try again.', 'error');
                stopTranscription();
            }
        };
        
        transcriptionRecognition.onend = () => {
            if (isTranscribing) {
                // Auto-restart if still transcribing
                setTimeout(() => {
                    if (isTranscribing && transcriptionRecognition) {
                        try {
                            transcriptionRecognition.start();
                        } catch (err) {
                            console.error('Error restarting transcription:', err);
                            stopTranscription();
                        }
                    }
                }, 100);
            } else {
                updateTranscriptionUI(false);
            }
        };
    } else {
        console.warn('Speech Recognition not supported in this browser');
    }
}

// Start transcription
function startTranscription() {
    // Request microphone permission first
    if (!transcriptionRecognition) {
        initTranscription();
    }
    
    if (!transcriptionRecognition) {
        showToast('Voice transcription not supported in this browser 🎤', 'error');
        return;
    }
    
    if (isTranscribing) {
        stopTranscription();
        return;
    }
    
    // Request microphone access
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
            const input = document.getElementById('message-input');
            
            // Save current input value as base text
            if (input && input.value.trim()) {
                input.setAttribute('data-base-text', input.value.trim());
                transcriptionText = input.value.trim() + ' ';
            } else {
                input.setAttribute('data-base-text', '');
                transcriptionText = '';
            }
            
            try {
                transcriptionRecognition.start();
            } catch (err) {
                if (err.name === 'InvalidStateError') {
                    // Already started, stop and restart
                    transcriptionRecognition.stop();
                    setTimeout(() => {
                        try {
                            transcriptionRecognition.start();
                        } catch (e) {
                            console.error('Error restarting transcription:', e);
                            showToast('Could not start transcription. Please try again.', 'error');
                        }
                    }, 100);
                } else {
                    console.error('Error starting transcription:', err);
                    showToast('Could not start transcription. Please try again.', 'error');
                }
            }
        })
        .catch((err) => {
            console.error('Microphone access denied:', err);
            showToast('Microphone access needed for transcription. Please allow access. 🎤', 'error');
        });
}

// Stop transcription
function stopTranscription() {
    isTranscribing = false;
    if (transcriptionRecognition) {
        try {
            transcriptionRecognition.stop();
        } catch (err) {
            console.error('Error stopping transcription:', err);
        }
    }
    updateTranscriptionUI(false);
    hideTranscriptionPreview();
    
    // Finalize the transcription
    const input = document.getElementById('message-input');
    if (input) {
        const baseText = input.getAttribute('data-base-text') || '';
        const finalText = transcriptionText.trim();
        
        if (baseText && finalText) {
            input.value = baseText + ' ' + finalText;
        } else if (finalText) {
            input.value = finalText;
        }
        
        // Clear base text attribute
        input.removeAttribute('data-base-text');
        input.focus();
        
        // Place cursor at end
        setTimeout(() => {
            input.setSelectionRange(input.value.length, input.value.length);
        }, 10);
    }
    
    if (transcriptionText.trim()) {
        showToast('Transcription complete! ✨', 'success');
    }
}

// Update transcription UI
function updateTranscriptionUI(active) {
    const btn = document.getElementById('transcribe-btn');
    if (btn) {
        if (active) {
            btn.classList.add('transcribing');
            btn.style.background = 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)';
            btn.style.animation = 'pulseGlow 1.5s ease-in-out infinite';
        } else {
            btn.classList.remove('transcribing');
            btn.style.background = '';
            btn.style.animation = '';
        }
    }
}

// Show transcription preview
function updateTranscriptionPreview(interimText) {
    let preview = document.getElementById('transcription-preview');
    if (!preview) {
        preview = document.createElement('div');
        preview.id = 'transcription-preview';
        preview.className = 'transcription-preview';
        const inputArea = document.querySelector('.input-area');
        if (inputArea) {
            inputArea.insertBefore(preview, inputArea.firstChild);
        }
    }
    
    if (interimText.trim()) {
        preview.textContent = `🎤 Listening: "${interimText}"`;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
}

// Hide transcription preview
function hideTranscriptionPreview() {
    const preview = document.getElementById('transcription-preview');
    if (preview) {
        preview.style.display = 'none';
    }
}

// ============================================
// Text-to-Speech (Speaking Responses)
// ============================================

// Initialize cute kid voice synthesis - Super Cute!
function initVoiceSynthesis() {
    if ('speechSynthesis' in window) {
        const voices = speechSynthesis.getVoices();
        
        // Priority: Female voices with high pitch potential, then English India
        const preferredVoices = [
            'Samantha', 'Karen', 'Zira', 'Veena', 'Tessa', 
            'Fiona', 'Moira', 'Victoria', 'Alex', 'Daniel'
        ];
        
        // Find female/child-friendly voices first
        let kidVoice = voices.find(v => 
            v.lang.startsWith('en') && 
            (preferredVoices.some(name => v.name.includes(name)) ||
             v.name.toLowerCase().includes('female') ||
             v.name.toLowerCase().includes('child'))
        );
        
        // Then try English India voices
        if (!kidVoice) {
            kidVoice = voices.find(v => 
                v.lang.includes('en-IN') || v.lang.includes('en_IN')
            );
        }
        
        // Fallback to any English voice
        return kidVoice || voices.find(v => v.lang.startsWith('en')) || null;
    }
    return null;
}

// Global variable to track current speech
let currentSpeech = null;
let isSpeaking = false;

// Stop speaking function
function stopSpeaking() {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        isSpeaking = false;
        currentSpeech = null;
        
        // Update UI
        const stopBtn = document.getElementById('stop-voice-btn');
        if (stopBtn) {
            stopBtn.style.display = 'none';
        }
    }
}

// Speak with SUPER CUTE kid voice - English India
function speak(text, callback, isKidVoice = false) {
    if (!('speechSynthesis' in window)) {
        if (callback) callback();
        return;
    }

    // Stop any current speech
    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    const kidVoice = initVoiceSynthesis();
    
    if (kidVoice && isKidVoice) {
        utterance.voice = kidVoice;
    }
    
    if (isKidVoice) {
        // SUPER CUTE kid voice settings
        utterance.rate = 0.85; // Slower for cute kid voice
        utterance.pitch = 1.6; // Much higher pitch for super cuteness!
        utterance.volume = 1.0;
    } else {
        // Normal friendly voice
        utterance.rate = 1.0;
        utterance.pitch = 1.2;
        utterance.volume = 0.9;
    }
    
    utterance.lang = 'en-IN'; // English India

    utterance.onstart = () => {
        isSpeaking = true;
        currentSpeech = utterance;
        
        // Show stop button
        const stopBtn = document.getElementById('stop-voice-btn');
        if (stopBtn) {
            stopBtn.style.display = 'flex';
        }
    };

    utterance.onend = () => {
        isSpeaking = false;
        currentSpeech = null;
        
        // Hide stop button
        const stopBtn = document.getElementById('stop-voice-btn');
        if (stopBtn) {
            stopBtn.style.display = 'none';
        }
        
        if (callback) callback();
    };

    utterance.onerror = (e) => {
        console.error('Speech synthesis error:', e);
        isSpeaking = false;
        currentSpeech = null;
        
        const stopBtn = document.getElementById('stop-voice-btn');
        if (stopBtn) {
            stopBtn.style.display = 'none';
        }
        
        if (callback) callback();
    };

    speechSynthesis.speak(utterance);
}

// Load voices when available
if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = () => {
        initVoiceSynthesis();
    };
}


// Initialize wake word detection - REMOVED (using improved version below)



// ============================================
// Toast Notifications - Enhanced
// ============================================

function showToast(message, type = 'info') {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const gradients = {
        error: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
        success: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        info: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
    };

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = `
        position: fixed;
        bottom: 35px;
        left: 50%;
        transform: translateX(-50%);
        padding: 18px 38px;
        background: ${gradients[type]};
        color: white;
        border-radius: 50px;
        font-weight: 700;
        font-size: 0.95rem;
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.25);
        z-index: 10000;
        animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeIn 0.35s ease reverse';
        setTimeout(() => toast.remove(), 350);
    }, 3500);
}

// ============================================
// Initialize
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    init();
    
    // Initialize transcription
    initTranscription();
    
    // Initialize voice synthesis voices
    if ('speechSynthesis' in window) {
        // Load voices immediately if available
        initVoiceSynthesis();
        
        // Also load when voices become available
        if (speechSynthesis.getVoices().length === 0) {
            speechSynthesis.addEventListener('voiceschanged', () => {
                initVoiceSynthesis();
            });
        }
    }
});

// Make functions globally available
window.switchTab = switchTab;
window.togglePassword = togglePassword;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.logout = logout;
window.forgotPassword = forgotPassword;
window.toggleSidebar = toggleSidebar;
window.newChat = newChat;
window.deleteChat = deleteChat;
window.handleKeyPress = handleKeyPress;
window.sendMessage = sendMessage;
window.generateImage = generateImage;
window.triggerImageUpload = triggerImageUpload;
window.handleImage = handleImage;
window.closeModal = closeModal;
window.closeModalAndLogin = closeModalAndLogin;
window.sendResetLink = sendResetLink;
window.showEnterTokenModal = showEnterTokenModal;
window.verifyResetToken = verifyResetToken;
window.resetPassword = resetPassword;
window.copyToClipboard = copyToClipboard;
window.startImageGeneration = startImageGeneration;
window.stopSpeaking = stopSpeaking;
window.startTranscription = startTranscription;
window.stopTranscription = stopTranscription;
