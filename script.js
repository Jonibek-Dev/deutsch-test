// Global o'zgaruvchilar
let allQuestions = [];
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let score = 0;
let quizStarted = false;
let startTime = null;
let selectedOptions = {};
let shuffleAnswersEnabled = true;
let autoNextTimeout = null;
let isAnswerChecked = false;

// Savollarni yuklash
async function loadQuestions() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('Faylni yuklab bo‘lmadi');
        allQuestions = await response.json();
        console.log(`${allQuestions.length} ta savol yuklandi`);
        return true;
    } catch (error) {
        console.error('Xatolik:', error);
        allQuestions = getDefaultQuestions();
        return true;
    }
}

// Ichki ma'lumotlar (agar data.json bo'lmasa)
function getDefaultQuestions() {
    return [
        {
            id: 1,
            question: "Woher komm ..... Sie?",
            options: ["-en", "-st", "-t", "-e"],
            correctAnswer: 0,
            category: "Grammatika",
            type: "To'ldirish"
        },
        {
            id: 2,
            question: "Übersetzen Sie 'verheiratet' auf Usbekisch",
            options: ["turmush qurmoq", "ishlamoq", "ajrashmoq", "yashamoq"],
            correctAnswer: 0,
            category: "Tarjima",
            type: "Nemis → O'zbek"
        },
        {
            id: 3,
            question: "Was passt nicht? Apfel, Banane, Flasche, Birne",
            options: ["Flasche", "Apfel", "Banane", "Birne"],
            correctAnswer: 0,
            category: "So'z boyligi",
            type: "Saralash"
        }
    ];
}

// Massivni aralashtirish
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Javoblarni har bir savol ichida aralashtirish
function shuffleAnswersInQuestions(questions) {
    return questions.map(question => {
        const originalCorrectIndex = question.correctAnswer;
        const originalOptions = [...question.options];
        
        const indexedOptions = originalOptions.map((option, index) => ({ 
            option, 
            originalIndex: index 
        }));
        
        const shuffled = shuffleArray(indexedOptions);
        const newOptions = shuffled.map(item => item.option);
        const newCorrectIndex = shuffled.findIndex(item => item.originalIndex === originalCorrectIndex);
        
        return {
            ...question,
            options: newOptions,
            correctAnswer: newCorrectIndex,
            originalOptions: originalOptions,
            originalCorrectIndex: originalCorrectIndex
        };
    });
}

// Testni boshlash
function startQuiz() {
    const questionCount = parseInt(document.getElementById('questionCount').value) || 20;
    const shuffleQuestions = document.getElementById('shuffleQuestions').checked;
    const shuffleAnswers = document.getElementById('shuffleAnswers').checked;
    
    shuffleAnswersEnabled = shuffleAnswers;
    currentQuestions = [...allQuestions];
    
    if (shuffleQuestions) {
        currentQuestions = shuffleArray(currentQuestions);
    }
    
    currentQuestions = currentQuestions.slice(0, Math.min(questionCount, currentQuestions.length));
    
    if (shuffleAnswers) {
        currentQuestions = shuffleAnswersInQuestions(currentQuestions);
    }
    
    currentQuestionIndex = 0;
    userAnswers = new Array(currentQuestions.length).fill(null);
    selectedOptions = {};
    score = 0;
    quizStarted = true;
    startTime = new Date();
    
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('quizContainer').style.display = 'block';
    document.getElementById('resultsContainer').style.display = 'none';
    
    showCurrentQuestion();
    updateProgress();
}

// Joriy savolni ko'rsatish
function showCurrentQuestion() {
    hideCelebration();
    document.getElementById('autoNextTimer').style.display = 'none';
    
    if (autoNextTimeout) {
        clearTimeout(autoNextTimeout);
        autoNextTimeout = null;
    }
    
    isAnswerChecked = false;
    enableButtons();
    
    if (currentQuestionIndex >= currentQuestions.length) {
        finishQuiz();
        return;
    }
    
    const question = currentQuestions[currentQuestionIndex];
    document.getElementById('questionText').textContent = `${question.id}. ${question.question}`;
    document.getElementById('questionCategory').textContent = question.category || "Umumiy";
    document.getElementById('questionType').textContent = question.type || "Tanlash";
    
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];
    
    question.options.forEach((option, index) => {
        const optionBtn = document.createElement('button');
        optionBtn.className = 'option-btn';
        if (userAnswers[currentQuestionIndex] === index) {
            optionBtn.classList.add('selected');
        }
        
        optionBtn.innerHTML = `
            <div class="option-letter">${letters[index]}</div>
            <div class="option-text">${option}</div>
        `;
        
        optionBtn.onclick = () => selectOption(index);
        optionsContainer.appendChild(optionBtn);
    });
    
    document.getElementById('prevBtn').style.display = currentQuestionIndex > 0 ? 'inline-flex' : 'none';
    document.getElementById('nextBtn').style.display = currentQuestionIndex < currentQuestions.length - 1 ? 'inline-flex' : 'none';
    document.getElementById('finishBtn').style.display = currentQuestionIndex === currentQuestions.length - 1 ? 'inline-flex' : 'none';
    
    updateProgress();
}

// Variantni tanlash
function selectOption(optionIndex) {
    if (isAnswerChecked) return;
    
    const options = document.querySelectorAll('.option-btn');
    options.forEach(opt => opt.classList.remove('selected', 'correct', 'incorrect'));
    
    options[optionIndex].classList.add('selected');
    userAnswers[currentQuestionIndex] = optionIndex;
    
    const question = currentQuestions[currentQuestionIndex];
    const isCorrect = question.correctAnswer === optionIndex;
    
    if (isCorrect) {
        options[optionIndex].classList.add('correct');
        score++;
        showCelebration();
    } else {
        options[optionIndex].classList.add('incorrect');
        if (question.correctAnswer !== null) {
            options[question.correctAnswer].classList.add('correct');
        }
    }
    
    disableButtons();
    isAnswerChecked = true;
    startAutoNextTimer();
}

// Tugmalarni vaqtincha o'chirish
function disableButtons() {
    const optionButtons = document.querySelectorAll('.option-btn');
    const controlButtons = document.querySelectorAll('.quiz-controls button');
    
    optionButtons.forEach(btn => {
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.7';
    });
    
    controlButtons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    });
}

// Tugmalarni qayta yoqish
function enableButtons() {
    const optionButtons = document.querySelectorAll('.option-btn');
    const controlButtons = document.querySelectorAll('.quiz-controls button');
    
    optionButtons.forEach(btn => {
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '1';
    });
    
    controlButtons.forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    });
}

// Avtomatik o'tish taymeri
function startAutoNextTimer() {
    let seconds = 3;
    const timerElement = document.getElementById('timerCount');
    const timerContainer = document.getElementById('autoNextTimer');
    
    timerContainer.style.display = 'flex';
    timerElement.textContent = seconds;
    
    const timerInterval = setInterval(() => {
        seconds--;
        timerElement.textContent = seconds;
        
        if (seconds <= 0) {
            clearInterval(timerInterval);
            timerContainer.style.display = 'none';
            nextQuestionOrFinish();
        }
    }, 1000);
}

// Keyingi savolga o'tish yoki testni yakunlash
function nextQuestionOrFinish() {
    hideCelebration();
    enableButtons();
    isAnswerChecked = false;
    
    if (currentQuestionIndex === currentQuestions.length - 1) {
        finishQuiz();
    } else {
        currentQuestionIndex++;
        showCurrentQuestion();
    }
}

// Salyut animatsiyasi
function showCelebration() {
    const container = document.getElementById('celebrationContainer');
    container.innerHTML = '';
    container.style.display = 'block';
    
    // 30 ta konfetti yaratish
    for (let i = 0; i < 30; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.position = 'absolute';
        confetti.style.width = `${Math.random() * 10 + 5}px`;
        confetti.style.height = `${Math.random() * 10 + 5}px`;
        confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        confetti.style.borderRadius = '50%';
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.top = `${Math.random() * 100}%`;
        confetti.style.animation = `confettiFall ${Math.random() * 1 + 1}s ease-out forwards`;
        container.appendChild(confetti);
    }
    
    // Salyut matni
    const text = document.createElement('div');
    text.id = 'celebrationText';
    text.style.position = 'absolute';
    text.style.top = '50%';
    text.style.left = '50%';
    text.style.transform = 'translate(-50%, -50%)';
    text.style.fontSize = '3rem';
    text.style.fontWeight = 'bold';
    text.style.color = '#4361ee';
    text.style.textShadow = '2px 2px 4px rgba(0,0,0,0.3)';
    text.style.opacity = '0';
    text.style.animation = 'celebrationText 1s ease-out forwards';
    text.textContent = ' Ajoyib! ';
    container.appendChild(text);
    
    // Ovoz efekti (agar ruxsat berilsa)
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        playCelebrationSound(audioContext);
    } catch (e) {
        console.log("Ovoz efekti ishlamadi");
    }
}

// Ovoz efekti
function playCelebrationSound(audioContext) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// Animatsiyani yashirish
function hideCelebration() {
    const container = document.getElementById('celebrationContainer');
    container.style.display = 'none';
    container.innerHTML = '';
}

// Oldingi savol
function previousQuestion() {
    if (isAnswerChecked || currentQuestionIndex <= 0) return;
    
    if (autoNextTimeout) {
        clearTimeout(autoNextTimeout);
        autoNextTimeout = null;
    }
    hideCelebration();
    document.getElementById('autoNextTimer').style.display = 'none';
    
    currentQuestionIndex--;
    isAnswerChecked = false;
    enableButtons();
    showCurrentQuestion();
}

// Keyingi savol
function nextQuestion() {
    if (isAnswerChecked || currentQuestionIndex >= currentQuestions.length - 1) return;
    
    if (autoNextTimeout) {
        clearTimeout(autoNextTimeout);
        autoNextTimeout = null;
    }
    hideCelebration();
    document.getElementById('autoNextTimer').style.display = 'none';
    
    currentQuestionIndex++;
    isAnswerChecked = false;
    enableButtons();
    showCurrentQuestion();
}

// Progressni yangilash
function updateProgress() {
    const progressFill = document.getElementById('progressFill');
    const currentElem = document.getElementById('currentQuestion');
    const totalElem = document.getElementById('totalQuestions');
    const scoreElem = document.getElementById('currentScore');
    
    const progress = ((currentQuestionIndex + 1) / currentQuestions.length) * 100;
    progressFill.style.width = `${progress}%`;
    
    currentElem.textContent = currentQuestionIndex + 1;
    totalElem.textContent = currentQuestions.length;
    
    let tempScore = 0;
    for (let i = 0; i <= currentQuestionIndex; i++) {
        if (userAnswers[i] !== null && 
            currentQuestions[i] && 
            currentQuestions[i].correctAnswer === userAnswers[i]) {
            tempScore++;
        }
    }
    scoreElem.textContent = `${tempScore} ball`;
}

// Testni yakunlash
function finishQuiz() {
    hideCelebration();
    document.getElementById('autoNextTimer').style.display = 'none';
    
    if (autoNextTimeout) {
        clearTimeout(autoNextTimeout);
        autoNextTimeout = null;
    }
    
    score = 0;
    for (let i = 0; i < currentQuestions.length; i++) {
        if (userAnswers[i] !== null && 
            currentQuestions[i] && 
            currentQuestions[i].correctAnswer === userAnswers[i]) {
            score++;
        }
    }
    
    const endTime = new Date();
    const timeSpent = Math.round((endTime - startTime) / 1000 / 60 * 10) / 10;
    showResults(score, timeSpent);
}

// Natijalarni ko'rsatish
function showResults(finalScore = null, timeSpent = null) {
    if (finalScore === null) {
        const savedResults = localStorage.getItem('nemisTestResults');
        if (savedResults) {
            displaySavedResults(JSON.parse(savedResults));
        } else {
            alert("Hali natijalar mavjud emas. Avval test ishlang!");
            return;
        }
    } else {
        const results = {
            score: finalScore,
            total: currentQuestions.length,
            percentage: Math.round((finalScore / currentQuestions.length) * 100),
            timeSpent: timeSpent || 0,
            date: new Date().toLocaleString('uz-UZ'),
            questions: currentQuestions,
            answers: userAnswers,
            shuffleAnswers: shuffleAnswersEnabled,
            settings: {
                questionCount: document.getElementById('questionCount').value,
                shuffleQuestions: document.getElementById('shuffleQuestions').checked,
                shuffleAnswers: shuffleAnswersEnabled
            }
        };
        
        localStorage.setItem('nemisTestResults', JSON.stringify(results));
        displayResults(results);
    }
    
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('quizContainer').style.display = 'none';
    document.getElementById('resultsContainer').style.display = 'block';
}

// Natijalarni ekranga chiqarish
function displayResults(results) {
    document.getElementById('finalScore').textContent = results.score;
    document.getElementById('totalPossible').textContent = results.total;
    document.getElementById('percentageScore').textContent = `${results.percentage}%`;
    
    const circle = document.getElementById('scoreCircle');
    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (results.percentage / 100) * circumference;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = offset;
    
    let message = "";
    if (results.percentage >= 90) message = "Ajoyib! Siz juda yaxshi bilasiz! 🎉";
    else if (results.percentage >= 70) message = "Yaxshi natija! Davom eting! 👍";
    else if (results.percentage >= 50) message = "Qoniqarli. Yana mashq qilishingiz kerak. 💪";
    else message = "Ko'proq o'rganish kerak. Omad keyingi safar! 📚";
    document.getElementById('resultMessage').textContent = message;
    
    document.getElementById('correctCount').textContent = results.score;
    document.getElementById('incorrectCount').textContent = results.total - results.score;
    document.getElementById('timeSpent').textContent = `${results.timeSpent} daqiqa`;
    document.getElementById('resultDate').textContent = results.date;
    
    displayReviewQuestions(results);
}

// Saqlangan natijalarni ko'rsatish
function displaySavedResults(results) {
    document.getElementById('finalScore').textContent = results.score || 0;
    document.getElementById('totalPossible').textContent = results.total || 0;
    document.getElementById('percentageScore').textContent = `${results.percentage || 0}%`;
    document.getElementById('correctCount').textContent = results.score || 0;
    document.getElementById('incorrectCount').textContent = (results.total || 0) - (results.score || 0);
    document.getElementById('timeSpent').textContent = results.timeSpent ? `${results.timeSpent} daqiqa` : "Noma'lum";
    document.getElementById('resultDate').textContent = results.date || "-";
    document.getElementById('resultMessage').textContent = "Oldingi natijangiz";
}

// Savollarni ko'rib chiqish
function displayReviewQuestions(results) {
    const reviewContainer = document.getElementById('reviewQuestions');
    reviewContainer.innerHTML = '';
    
    if (!results.questions || !results.answers) return;
    
    results.questions.forEach((question, index) => {
        const userAnswer = results.answers[index];
        let correctAnswerText = question.options[question.correctAnswer];
        let userAnswerText = userAnswer !== null ? question.options[userAnswer] : 'Javob berilmagan';
        
        if (question.originalOptions && question.originalCorrectIndex !== undefined) {
            correctAnswerText = question.originalOptions[question.originalCorrectIndex];
            if (userAnswer !== null) {
                const currentAnswerText = question.options[userAnswer];
                userAnswerText = question.originalOptions.find(opt => opt === currentAnswerText) || currentAnswerText;
            }
        }
        
        const isCorrect = userAnswer === question.correctAnswer;
        const reviewItem = document.createElement('div');
        reviewItem.className = `review-item ${isCorrect ? 'correct' : 'incorrect'}`;
        
        reviewItem.innerHTML = `
            <div class="review-question">
                ${index + 1}. ${question.question}
                ${results.shuffleAnswers ? '<small style="color:#666;font-size:0.8rem;display:block;margin-top:5px;">(Javoblar aralashtirilgan)</small>' : ''}
            </div>
            <div class="review-answer">
                <span>Sizning javobingiz: <strong>${userAnswerText}</strong></span>
                ${!isCorrect ? `<span>To'g'ri javob: <strong>${correctAnswerText}</strong></span>` : ''}
            </div>
        `;
        
        reviewContainer.appendChild(reviewItem);
    });
}

// Testni qayta boshlash
function restartQuiz() {
    startQuiz();
}

// Asosiy menyuga qaytish
function goToMenu() {
    document.getElementById('mainMenu').style.display = 'grid';
    document.getElementById('quizContainer').style.display = 'none';
    document.getElementById('resultsContainer').style.display = 'none';
}

// Tilni o'zgartirish
function setLanguage(lang) {
    const langs = document.querySelectorAll('.lang');
    langs.forEach(l => l.classList.remove('active'));
    event.target.classList.add('active');
    alert(`Til ${lang === 'uz' ? "O'zbekcha" : "Nemis"}ga o'zgartirildi`);
}

// Dastlabki ma'lumotlarni yuklash
document.addEventListener('DOMContentLoaded', async () => {
    await loadQuestions();
    console.log("Ilova yuklandi. Savollar soni:", allQuestions.length);
});