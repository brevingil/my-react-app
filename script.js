// Initialize EmailJS
emailjs.init("vIiTo9v1RVq4Owd5I");

// Test questions
const testQuestions = [
    "I'm looking for a fuck buddy or Friends with benefits for regular hookups.",
    "You are a gorgeous woman. I hope we can figure out how to come together.",
    "I won't spend money on things better left to face-to-face. You want to know what my expectations are? Meet me and find out.", 
    "Yes, of course, it's completely discreet here at my place. You need to tell me what night, that's all.",
    "You don't want me, honey! You just want an endless stream of chit-chat.",
    "I can tongue you like a kid. When we get around to our first date, will you allow me to show you what my tongue is capable of?",
    "No, I think I've learned to love every part of my body at this point I don't have any distinct that I don't like. Do you have something you don't like about your body?",
    "What would you do if I start masturbating in front of you, I bet you will get more horny and wet when we cum together.",
    "When we get a chance, I want to hold your naked body for a while. We will rest, and after we rest, I will turn you so I can fuck your ass.",
    "I will get turned on and horny. I might grab your head and grind your face in my ass. Will that turn on?",
    "Okay, never mind! I have explained these things to you, and you won't meet me. I am done being foolish. Not one more credit for your nonsense! Make a date and meet me for real!",
    "Show up in person, babe, and I'm all yours! Ask me to chit-chat, and I'm done, and it's up to you."
];

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - initializing application');

    // DOM Elements
    const accessDeniedDiv = document.getElementById('access-denied');
    const registrationDiv = document.getElementById('registration');
    const otpVerificationDiv = document.getElementById('otp-verification');
    const mainContentDiv = document.getElementById('main-content');
    const testInterface = document.getElementById('test-interface');
    
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const startBtn = document.getElementById('start-btn');
    
    const otpEmailDisplay = document.getElementById('otp-email-display');
    const otpInputs = document.querySelectorAll('.otp-input');
    const verifyOtpBtn = document.getElementById('verify-otp-btn');
    const resendOtpBtn = document.getElementById('resend-otp-btn');
    const otpTimer = document.getElementById('otp-timer');
    const otpError = document.getElementById('otp-error');
    const otpSuccess = document.getElementById('otp-success');
    const otpLoading = document.getElementById('otp-loading');

    // Global Variables
    let otpCode = '';
    let otpExpiryTime = 0;
    let otpTimerInterval = null;
    let userEmail = '';
    let userName = '';
    let currentSessionId = null;
    let currentQuestion = 0;
    let timeLeft = 300;
    let testTimer = null;
    const userResponses = [];

    // Show/hide sections
    function showSection(section) {
        console.log('Showing section:', section.id);
        accessDeniedDiv.style.display = 'none';
        registrationDiv.style.display = 'none';
        otpVerificationDiv.classList.add('hidden');
        mainContentDiv.classList.add('hidden');
        
        if (section === accessDeniedDiv) {
            accessDeniedDiv.style.display = 'block';
        } else if (section === registrationDiv) {
            registrationDiv.style.display = 'block';
        } else if (section === otpVerificationDiv) {
            otpVerificationDiv.classList.remove('hidden');
        } else if (section === mainContentDiv) {
            mainContentDiv.classList.remove('hidden');
        }
    }

    // Email validation functions - UPDATED WITH BACKEND CHECK
    async function isEmailUsedInCompletedTest(email) {
        const normalizedEmail = email.toLowerCase().trim();
        
        // Check localStorage first (fast)
        const allResponses = JSON.parse(localStorage.getItem('allTestResponses') || '[]');
        const localMatch = allResponses.some(response => 
            response.email && response.email.toLowerCase() === normalizedEmail
        );
        
        if (localMatch) {
            console.log('Email found in localStorage - access denied');
            return true;
        }
        
        // Check backend (more reliable)
        try {
            console.log('Checking backend for email:', normalizedEmail);
            const response = await fetch('/admin/responses');
            const backendData = await response.json();
            
            if (backendData.sessions) {
                const backendMatch = backendData.sessions.some(session => 
                    session.email && session.email.toLowerCase() === normalizedEmail && session.completed
                );
                
                if (backendMatch) {
                    console.log('Email found in backend - access denied');
                    // Also update localStorage for future checks
                    const matchingSession = backendData.sessions.find(session => 
                        session.email && session.email.toLowerCase() === normalizedEmail
                    );
                    const testData = {
                        name: matchingSession.name,
                        email: normalizedEmail,
                        responses: [],
                        timestamp: new Date().toISOString()
                    };
                    let localResponses = JSON.parse(localStorage.getItem('allTestResponses') || '[]');
                    localResponses.push(testData);
                    localStorage.setItem('allTestResponses', JSON.stringify(localResponses));
                    
                    return true;
                }
            }
        } catch (error) {
            console.error('Error checking backend for email:', error);
            // If backend check fails, continue with localStorage only
        }
        
        return false;
    }
    
    async function validateEmail() {
    const email = emailInput.value.trim();
    const emailDuplicateError = document.getElementById('email-duplicate-error');
    
    if (email === '') {
        emailDuplicateError.style.display = 'none';
        startBtn.disabled = true;
        return false;
    }
    
    // Comprehensive email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        emailDuplicateError.style.display = 'none';
        startBtn.disabled = true;
        return false;
    }
    
    // Check for common disposable email domains
    const disposableDomains = [
        'tempmail.com', 'throwaway.com', 'fake.com', 'guerrillamail.com',
        'mailinator.com', '10minutemail.com', 'yopmail.com', 'trashmail.com'
    ];
    const emailDomain = email.split('@')[1]?.toLowerCase();
    
    if (disposableDomains.includes(emailDomain)) {
        emailDuplicateError.textContent = 'Disposable email addresses are not allowed. Please use a permanent email.';
        emailDuplicateError.style.display = 'block';
        startBtn.disabled = true;
        return false;
    }
    
    // Check if email is already used (async)
    const isUsed = await isEmailUsedInCompletedTest(email);
    if (isUsed) {
        emailDuplicateError.textContent = 'This email address has already been used for this test.';
        emailDuplicateError.style.display = 'block';
        startBtn.disabled = true;
        return false;
    } else {
        emailDuplicateError.style.display = 'none';
        startBtn.disabled = false;
        return true;
    }
}
    
    function validateName() {
        const name = nameInput.value.trim();
        return name.length >= 2;
    }

    // Form validation - UPDATED TO ASYNC
    async function validateForm() {
        const nameValid = validateName();
        const emailValid = await validateEmail();
        
        if (!nameValid) {
            alert('Please enter your full name (at least 2 characters)');
            return false;
        }
        
        if (!emailValid) {
            if (await isEmailUsedInCompletedTest(emailInput.value.trim())) {
                alert('This email has already completed the test.');
            } else {
                alert('Please enter a valid email address');
            }
            return false;
        }
        
        return true;
    }

    // OTP Functions
    function generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async function sendOTP(email, otp) {
        try {
            console.log('Sending OTP to:', email);
            otpLoading.style.display = 'block';
            otpError.style.display = 'none';
            
            const templateParams = {
                user_name: userName,
                otp_code: otp,
                email: email
            };

            const response = await emailjs.send(
                "service_g0j2lrc",
                "template_oa3s5se", 
                templateParams
            );

            console.log('OTP sent successfully');
            otpLoading.style.display = 'none';
            return true;
        } catch (error) {
            console.error('Failed to send OTP:', error);
            otpLoading.style.display = 'none';
            let errorMessage = 'Failed to send verification code. ';
            if (error.text) {
                errorMessage += 'Error: ' + error.text;
            }
            alert(errorMessage);
            return false;
        }
    }

    function startOTPTimer() {
        clearInterval(otpTimerInterval);
        
        function updateOTPTimer() {
            const now = Date.now();
            const timeLeft = otpExpiryTime - now;
            
            if (timeLeft <= 0) {
                clearInterval(otpTimerInterval);
                otpTimer.textContent = 'Code expired';
                verifyOtpBtn.disabled = true;
                return;
            }
            
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            otpTimer.textContent = `Code expires in: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        updateOTPTimer();
        otpTimerInterval = setInterval(updateOTPTimer, 1000);
    }

   async function showOTPVerification() {
    // Validate email format before proceeding
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
        alert('Please enter a valid email address before proceeding.');
        showSection(registrationDiv);
        return;
    }

    // Validate email domain (optional but recommended)
    const allowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
    const emailDomain = userEmail.split('@')[1]?.toLowerCase();
    
    if (!emailDomain || !allowedDomains.includes(emailDomain)) {
        alert('Please use a valid email provider (Gmail, Yahoo, Outlook, etc.).');
        showSection(registrationDiv);
        return;
    }

    otpCode = generateOTP();
    otpExpiryTime = Date.now() + 5 * 60 * 1000;
    
    const maskedEmail = userEmail.replace(/(.{2})(.*)(?=@)/, 
        (match, p1, p2) => p1 + '*'.repeat(p2.length));
    otpEmailDisplay.textContent = maskedEmail;
    
    otpInputs.forEach(input => input.value = '');
    otpError.style.display = 'none';
    otpSuccess.style.display = 'none';
    verifyOtpBtn.disabled = true;
    resendOtpBtn.disabled = true;
    
    showSection(otpVerificationDiv);
    
    const otpSent = await sendOTP(userEmail, otpCode);
    
    if (otpSent) {
        // Start backend session first
        try {
            console.log('Starting backend session...');
            const response = await fetch('/api/start-test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: userName,
                    email: userEmail
                })
            });
            
            const result = await response.json();
            console.log('Backend response:', result);

            if (result.success) {
                currentSessionId = result.sessionId;
                console.log('Session created:', currentSessionId);
                
                // Start OTP timer only after backend session is created
                startOTPTimer();
                setTimeout(() => {
                    resendOtpBtn.disabled = false;
                }, 30000);
            } else {
                alert('Failed to start test session: ' + result.error);
                showSection(registrationDiv);
            }
        } catch (error) {
            console.error('Error starting test:', error);
            alert('Failed to start test. Please try again.');
            showSection(registrationDiv);
        }
    } else {
        alert('Could not send verification code. Please check your email address and try again.');
        showSection(registrationDiv);
    }
}

    function verifyOTP() {
        const enteredOTP = Array.from(otpInputs).map(input => input.value).join('');
        
        if (enteredOTP === otpCode) {
            otpError.style.display = 'none';
            otpSuccess.style.display = 'block';
            verifyOtpBtn.disabled = true;
            resendOtpBtn.disabled = true;
            
            setTimeout(() => {
                startTest();
            }, 1500);
        } else {
            otpError.style.display = 'block';
            otpSuccess.style.display = 'none';
            otpInputs.forEach(input => input.value = '');
            if (otpInputs[0]) otpInputs[0].focus();
        }
    }

    async function resendOTP() {
        if (userEmail) {
            otpCode = generateOTP();
            otpExpiryTime = Date.now() + 5 * 60 * 1000;
            
            otpError.style.display = 'none';
            resendOtpBtn.disabled = true;
            otpInputs.forEach(input => input.value = '');
            verifyOtpBtn.disabled = true;
            
            const otpSent = await sendOTP(userEmail, otpCode);
            
            if (otpSent) {
                startOTPTimer();
                setTimeout(() => {
                    resendOtpBtn.disabled = false;
                }, 30000);
            }
        }
    }

    // Test Functions
    function startTest() {
        console.log('=== STARTING TEST ===');
        console.log('User:', userName, userEmail);
        console.log('Session ID:', currentSessionId);
        
        showSection(mainContentDiv);
        
        // Make sure the test interface elements are visible
        document.getElementById('message-container').style.display = 'block';
        document.getElementById('completed').style.display = 'none';
        document.getElementById('timeout-message').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'none';
        
        console.log('Test interface should be visible now');
        
        // Initialize the test
        initializeTest();
    }

    function initializeTest() {
        console.log('=== INITIALIZING TEST ===');
        console.log('Test questions available:', testQuestions.length);
        
        // Reset test variables
        currentQuestion = 0;
        timeLeft = 300;
        userResponses.length = 0; // Clear any previous responses
        
        // Setup event listeners
        setupTestEventListeners();
        
        // Start with first question
        showQuestion(0);
        
        console.log('Test initialized, showing first question');
    }

    function setupTestEventListeners() {
        const responseEl = document.getElementById('response');
        const submitBtn = document.getElementById('submit-btn');
        const restartBtn = document.getElementById('restart-btn');

        // Remove existing listeners by cloning elements
        const newResponseEl = responseEl.cloneNode(true);
        const newSubmitBtn = submitBtn.cloneNode(true);
        
        responseEl.parentNode.replaceChild(newResponseEl, responseEl);
        submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);

        // Response input listener
        newResponseEl.addEventListener('input', updateCharCount);
        
        // Submit button listener
        newSubmitBtn.addEventListener('click', saveResponse);
        
        // Restart button
        restartBtn.addEventListener('click', function() {
            localStorage.removeItem('allTestResponses');
            location.reload();
        });

        // Setup paste prevention
        setupPastePrevention();
    }

    function setupPastePrevention() {
        const responseEl = document.getElementById('response');
        
        responseEl.addEventListener('paste', function(e) {
            e.preventDefault();
            showPasteWarning();
            return false;
        });
        
        responseEl.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            return false;
        });
        
        responseEl.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                e.preventDefault();
                showPasteWarning();
                return false;
            }
        });
    }

    function showPasteWarning() {
        let warningEl = document.getElementById('paste-warning');
        if (!warningEl) {
            warningEl = document.createElement('div');
            warningEl.id = 'paste-warning';
            document.body.appendChild(warningEl);
        }
        
        warningEl.textContent = 'Copy-pasting is not allowed! Please type your response.';
        warningEl.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #ff4444; color: white; padding: 20px; border-radius: 8px; z-index: 10000; font-weight: bold; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 300px;';
        
        setTimeout(() => {
            if (warningEl && warningEl.parentNode) {
                warningEl.parentNode.removeChild(warningEl);
            }
        }, 3000);
    }

    function showQuestion(index) {
        console.log('=== SHOWING QUESTION ===', index);
        
        if (index >= testQuestions.length) {
            completeTest();
            return;
        }
        
        currentQuestion = index;
        document.getElementById('message-text').textContent = testQuestions[index];
        document.getElementById('response').value = '';
        updateCharCount();
        
        // Update progress
        document.getElementById('progress').textContent = 'Message ' + (index + 1) + ' of ' + testQuestions.length;
        
        // Reset timer
        timeLeft = 300;
        updateTimer();
        
        // Clear existing timer
        if (testTimer) {
            clearInterval(testTimer);
        }
        
        // Start new timer
        testTimer = setInterval(function() {
            timeLeft--;
            updateTimer();
            
            if (timeLeft <= 0) {
                clearInterval(testTimer);
                autoSubmitResponse();
            }
        }, 1000);
        
        console.log('Question displayed:', testQuestions[index]);
    }

    function updateTimer() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        const timerEl = document.getElementById('timer');
        timerEl.textContent = minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
        
        if (timeLeft <= 60) {
            timerEl.style.color = '#e74c3c';
            if (timeLeft <= 30) {
                timerEl.classList.add('critical');
            }
        } else {
            timerEl.style.color = '#e74c3c';
            timerEl.classList.remove('critical');
        }
    }

    function updateCharCount() {
        const responseEl = document.getElementById('response');
        const charCountEl = document.getElementById('char-count');
        const submitBtn = document.getElementById('submit-btn');
        
        const length = responseEl.value.length;
        charCountEl.textContent = length + '/85 characters';
        
        if (length >= 85) {
            charCountEl.style.color = '#27ae60';
            submitBtn.disabled = false;
        } else {
            charCountEl.style.color = '#e74c3c';
            submitBtn.disabled = true;
        }
    }

    async function saveResponse() {
        console.log('=== SAVING RESPONSE ===');
        const responseEl = document.getElementById('response');
        const response = responseEl.value.trim();
        
        console.log('Response length:', response.length);
        
        if (response.length >= 85) {
            const timeSpent = 300 - timeLeft;
            
            // Store locally
            userResponses.push({
                message: testQuestions[currentQuestion],
                response: response,
                timeSpent: timeSpent,
                autoSubmitted: false
            });
            
            // Send to backend
            try {
                console.log('Sending to backend...');
                const backendResponse = await fetch('/api/submit-response', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sessionId: currentSessionId,
                        messageIndex: currentQuestion,
                        response: response,
                        isAutoSubmit: false,
                        timeSpent: timeSpent
                    })
                });
                
                const result = await backendResponse.json();
                console.log('Response saved to backend:', result);
                
            } catch (error) {
                console.error('Error saving response to backend:', error);
            }
            
            console.log('Moving to next question...');
            clearInterval(testTimer);
            showQuestion(currentQuestion + 1);
        } else {
            alert('Please write at least 85 characters before submitting.');
        }
    }

    async function autoSubmitResponse() {
        const responseEl = document.getElementById('response');
        const response = responseEl.value.trim();
        const timeSpent = 300 - timeLeft;
        
        // Store locally
        userResponses.push({
            message: testQuestions[currentQuestion],
            response: response || 'No response submitted (timeout)',
            timeSpent: timeSpent,
            autoSubmitted: true
        });
        
        // Send to backend if there's a response
        if (response && response.length > 0) {
            try {
                await fetch('/api/submit-response', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sessionId: currentSessionId,
                        messageIndex: currentQuestion,
                        response: response,
                        isAutoSubmit: true,
                        timeSpent: timeSpent
                    })
                });
            } catch (error) {
                console.error('Error auto-saving response:', error);
            }
        }
        
        showQuestion(currentQuestion + 1);
    }

    async function completeTest() {
        console.log('=== COMPLETING TEST ===');
        clearInterval(testTimer);
        document.getElementById('message-container').style.display = 'none';
        document.getElementById('completed').style.display = 'block';
        
        // Store responses locally
        const testData = {
            name: userName,
            email: userEmail,
            responses: userResponses,
            timestamp: new Date().toISOString()
        };
        
        let allResponses = JSON.parse(localStorage.getItem('allTestResponses') || '[]');
        allResponses.push(testData);
        localStorage.setItem('allTestResponses', JSON.stringify(allResponses));
        
        // Mark test as completed in backend
        try {
            const response = await fetch('/api/complete-test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sessionId: currentSessionId
                    })
                });
                
                const result = await response.json();
                console.log('Test completed in backend:', result);
            } catch (error) {
                console.error('Error completing test in backend:', error);
            }
            
            console.log('Test completed successfully');
        }
        
        // Contact support functions
        function openEmailClient() {
            const email = 'info@thereplysuite.com';
            const subject = 'Access Issue - Chat Moderating Test';
            const body = `Hello,\n\nI am having trouble accessing the Chat Moderating Test.\n\nPlease assist.\n\nThank you.`;
            window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        }
        
        function copyEmailToClipboard() {
            const email = 'info@thereplysuite.com';
            navigator.clipboard.writeText(email).then(function() {
                alert('Email address copied to clipboard: ' + email);
            }, function(err) {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = email;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('Email address copied to clipboard: ' + email);
            });
        }
        
        // Event Listeners - UPDATED TO ASYNC
        nameInput.addEventListener('input', function() {
            startBtn.disabled = !(validateName() && emailInput.value.trim() !== '');
        });
        
        emailInput.addEventListener('input', async function() {
    const email = emailInput.value.trim();
    const emailError = document.getElementById('email-error');
    const emailDuplicateError = document.getElementById('email-duplicate-error');
    
    // Clear previous errors
    emailError.style.display = 'none';
    emailDuplicateError.style.display = 'none';
    
    if (email === '') {
        startBtn.disabled = true;
        return;
    }
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        emailError.textContent = 'Please enter a valid email address (e.g., name@example.com)';
        emailError.style.display = 'block';
        startBtn.disabled = true;
        return;
    }
    
    // Check for valid domain
    const allowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com', 'protonmail.com'];
    const emailDomain = email.split('@')[1]?.toLowerCase();
    
    if (!allowedDomains.includes(emailDomain)) {
        emailError.textContent = 'Please use a supported email provider (Gmail, Yahoo, Outlook, etc.)';
        emailError.style.display = 'block';
        startBtn.disabled = true;
        return;
    }
    
    // Check for duplicates (async)
    const isUsed = await isEmailUsedInCompletedTest(email);
    if (isUsed) {
        emailDuplicateError.style.display = 'block';
        startBtn.disabled = true;
    } else {
        startBtn.disabled = !validateName();
    }
});
        
        startBtn.addEventListener('click', async function() {
            console.log('Start button clicked');
            if (await validateForm()) {
                userEmail = emailInput.value.trim();
                userName = nameInput.value.trim();
                
                if (await isEmailUsedInCompletedTest(userEmail)) {
                    showSection(accessDeniedDiv);
                    return;
                }
                
                showOTPVerification();
            }
        });
        
        verifyOtpBtn.addEventListener('click', verifyOTP);
        resendOtpBtn.addEventListener('click', resendOTP);
        
        // OTP Input handling
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                
                if (value.length === 1) {
                    if (index < otpInputs.length - 1) {
                        otpInputs[index + 1].focus();
                    }
                }
                
                const allFilled = Array.from(otpInputs).every(input => input.value.length === 1);
                verifyOtpBtn.disabled = !allFilled;
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && input.value.length === 0 && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });
        });
        
        document.getElementById('email-link').addEventListener('click', openEmailClient);
        document.getElementById('email-btn').addEventListener('click', openEmailClient);
        document.getElementById('copy-email-btn').addEventListener('click', copyEmailToClipboard);
        
        // Check if user should be denied access - UPDATED TO ASYNC
        async function checkInitialAccess() {
            const urlParams = new URLSearchParams(window.location.search);
            const email = urlParams.get('email');
            
            if (email && await isEmailUsedInCompletedTest(email)) {
                showSection(accessDeniedDiv);
            } else {
                showSection(registrationDiv);
            }
        }
        
        // Initialize
        checkInitialAccess();
    });