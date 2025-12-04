// Global o'zgaruvchilar
let allQuestions = [];
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let score = 0;
let quizStarted = false;
let startTime = null;
let selectedOptions = {};
let shuffleAnswersEnabled = true; // YANGI: Javoblarni aralashtirish holati

// Savollarni yuklash
async function loadQuestions() {
    try {
        // Agar data.json fayli bo'lmasa, ichki ma'lumotlardan foydalanamiz
        if (!window.questionsData) {
            const response = await fetch('data.json');
            if (!response.ok) throw new Error('Faylni yuklab bo‘lmadi');
            allQuestions = await response.json();
        } else {
            allQuestions = window.questionsData;
        }
        
        console.log(`${allQuestions.length} ta savol yuklandi`);
        return true;
    } catch (error) {
        console.error('Xatolik:', error);
        // Agar fetch ishlamasa, ichki ma'lumotlardan foydalanamiz
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

// Massivni aralashtirish (Fisher-Yates algoritmi)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Javoblarni har bir savol ichida aralashtirish (YANGI FUNKSIYA)
function shuffleAnswersInQuestions(questions) {
    return questions.map(question => {
        // Asl javobni saqlash
        const originalCorrectIndex = question.correctAnswer;
        const originalOptions = [...question.options];
        
        // Variantlar va ularning indekslarini yaratish
        const indexedOptions = originalOptions.map((option, index) => ({ 
            option, 
            originalIndex: index 
        }));
        
        // Aralashtirish
        const shuffled = shuffleArray(indexedOptions);
        
        // Yangi options va correctAnswer ni aniqlash
        const newOptions = shuffled.map(item => item.option);
        const newCorrectIndex = shuffled.findIndex(item => item.originalIndex === originalCorrectIndex);
        
        // Yangi savol obyektini qaytarish
        return {
            ...question,
            options: newOptions,
            correctAnswer: newCorrectIndex,
            // Asl holatni saqlash (natijalarni ko'rsatish uchun)
            originalOptions: originalOptions,
            originalCorrectIndex: originalCorrectIndex
        };
    });
}

// Testni boshlash
function startQuiz() {
    const questionCount = parseInt(document.getElementById('questionCount').value) || 20;
    const shuffleQuestions = document.getElementById('shuffleQuestions').checked;
    const shuffleAnswers = document.getElementById('shuffleAnswers').checked; // YANGI
    
    // Sozlamalarni saqlash
    shuffleAnswersEnabled = shuffleAnswers; // YANGI
    
    // Savollarni tayyorlash
    currentQuestions = [...allQuestions];
    
    if (shuffleQuestions) {
        currentQuestions = shuffleArray(currentQuestions);
    }
    
    currentQuestions = currentQuestions.slice(0, Math.min(questionCount, currentQuestions.length));
    
    // Agar javoblarni aralashtirish kerak bo'lsa (YANGI BLOK)
    if (shuffleAnswers) {
        currentQuestions = shuffleAnswersInQuestions(currentQuestions);
    }
    
    // O'zgaruvchilarni qayta sozlash
    currentQuestionIndex = 0;
    userAnswers = new Array(currentQuestions.length).fill(null);
    selectedOptions = {};
    score = 0;
    quizStarted = true;
    startTime = new Date();
    
    // Oynalarni ko'rsatish/yashirish
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('quizContainer').style.display = 'block';
    document.getElementById('resultsContainer').style.display = 'none';
    
    // Dastlabki savolni ko'rsatish
    showCurrentQuestion();
    updateProgress();
}

// Joriy savolni ko'rsatish
function showCurrentQuestion() {
    if (currentQuestionIndex >= currentQuestions.length) {
        finishQuiz();
        return;
    }
    
    const question = currentQuestions[currentQuestionIndex];
    const questionElem = document.getElementById('questionText');
    const optionsContainer = document.getElementById('optionsContainer');
    
    // Savol matni
    questionElem.textContent = `${question.id}. ${question.question}`;
    
    // Kategoriya va tur
    document.getElementById('questionCategory').textContent = question.category || "Umumiy";
    document.getElementById('questionType').textContent = question.type || "Tanlash";
    
    // Variantlar
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
    
    // Tugmalarni sozlash
    document.getElementById('prevBtn').style.display = currentQuestionIndex > 0 ? 'inline-flex' : 'none';
    document.getElementById('nextBtn').style.display = currentQuestionIndex < currentQuestions.length - 1 ? 'inline-flex' : 'none';
    document.getElementById('finishBtn').style.display = currentQuestionIndex === currentQuestions.length - 1 ? 'inline-flex' : 'none';
    
    // Progress va ballar
    updateProgress();
}

// Variantni tanlash
function selectOption(optionIndex) {
    // Avvalgi tanlovni olib tashlash
    const options = document.querySelectorAll('.option-btn');
    options.forEach(opt => opt.classList.remove('selected', 'correct', 'incorrect'));
    
    // Yangisini tanlash
    options[optionIndex].classList.add('selected');
    userAnswers[currentQuestionIndex] = optionIndex;
    
    // To'g'riligini tekshirish (agar ko'rsatish rejimi bo'lsa)
    const question = currentQuestions[currentQuestionIndex];
    if (question.correctAnswer === optionIndex) {
        options[optionIndex].classList.add('correct');
    } else {
        options[optionIndex].classList.add('incorrect');
        // To'g'ri javobni ko'rsatish
        if (question.correctAnswer !== null) {
            options[question.correctAnswer].classList.add('correct');
        }
    }
}

// Oldingi savol
function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        showCurrentQuestion();
    }
}

// Keyingi savol
function nextQuestion() {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        showCurrentQuestion();
    }
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
    
    // Ballarni hisoblash
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
    // Ballarni hisoblash
    score = 0;
    for (let i = 0; i < currentQuestions.length; i++) {
        if (userAnswers[i] !== null && 
            currentQuestions[i] && 
            currentQuestions[i].correctAnswer === userAnswers[i]) {
            score++;
        }
    }
    
    // Vaqtni hisoblash
    const endTime = new Date();
    const timeSpent = Math.round((endTime - startTime) / 1000 / 60 * 10) / 10;
    
    // Natijalarni ko'rsatish
    showResults(score, timeSpent);
}

// Natijalarni ko'rsatish
function showResults(finalScore = null, timeSpent = null) {
    if (finalScore === null) {
        // Oldingi natijalarni ko'rsatish
        const savedResults = localStorage.getItem('nemisTestResults');
        if (savedResults) {
            displaySavedResults(JSON.parse(savedResults));
        } else {
            alert("Hali natijalar mavjud emas. Avval test ishlang!");
            return;
        }
    } else {
        // Yangi natijalarni saqlash va ko'rsatish
        const results = {
            score: finalScore,
            total: currentQuestions.length,
            percentage: Math.round((finalScore / currentQuestions.length) * 100),
            timeSpent: timeSpent || 0,
            date: new Date().toLocaleString('uz-UZ'),
            questions: currentQuestions,
            answers: userAnswers,
            shuffleAnswers: shuffleAnswersEnabled, // YANGI: aralashtirish holati
            settings: {
                questionCount: document.getElementById('questionCount').value,
                shuffleQuestions: document.getElementById('shuffleQuestions').checked,
                shuffleAnswers: shuffleAnswersEnabled // YANGI
            }
        };
        
        // LocalStorage ga saqlash
        localStorage.setItem('nemisTestResults', JSON.stringify(results));
        
        // Ko'rsatish
        displayResults(results);
    }
    
    // Oynalarni ko'rsatish/yashirish
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('quizContainer').style.display = 'none';
    document.getElementById('resultsContainer').style.display = 'block';
}

// Natijalarni ekranga chiqarish
function displayResults(results) {
    // Asosiy ballar
    document.getElementById('finalScore').textContent = results.score;
    document.getElementById('totalPossible').textContent = results.total;
    document.getElementById('percentageScore').textContent = `${results.percentage}%`;
    
    // Doira diagramma
    const circle = document.getElementById('scoreCircle');
    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (results.percentage / 100) * circumference;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = offset;
    
    // Xabar
    let message = "";
    if (results.percentage >= 90) message = "Ajoyib! Siz juda yaxshi bilasiz! 🎉";
    else if (results.percentage >= 70) message = "Yaxshi natija! Davom eting! 👍";
    else if (results.percentage >= 50) message = "Qoniqarli. Yana mashq qilishingiz kerak. 💪";
    else message = "Ko'proq o'rganish kerak. Omad keyingi safar! 📚";
    document.getElementById('resultMessage').textContent = message;
    
    // Tafsilotlar
    document.getElementById('correctCount').textContent = results.score;
    document.getElementById('incorrectCount').textContent = results.total - results.score;
    document.getElementById('timeSpent').textContent = `${results.timeSpent} daqiqa`;
    document.getElementById('resultDate').textContent = results.date;
    
    // Ko'rib chiqish bo'limi
    displayReviewQuestions(results);
}

// Saqlangan natijalarni ko'rsatish
function displaySavedResults(results) {
    // Oddiy ko'rinish
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
        
        // Agar javoblar aralashtirilgan bo'lsa, asl holatni ko'rsatish
        let correctAnswerText = question.options[question.correctAnswer];
        let userAnswerText = userAnswer !== null ? question.options[userAnswer] : 'Javob berilmagan';
        
        // Agar asl ma'lumotlar saqlangan bo'lsa
        if (question.originalOptions && question.originalCorrectIndex !== undefined) {
            correctAnswerText = question.originalOptions[question.originalCorrectIndex];
            // Foydalanuvchi javobini asl variantlarga o'tkazish
            if (userAnswer !== null) {
                const originalOptions = question.originalOptions;
                const currentOptions = question.options;
                // Joriy javobni original variantlar ichida qidirish
                const currentAnswerText = currentOptions[userAnswer];
                userAnswerText = originalOptions.find(opt => opt === currentAnswerText) || currentAnswerText;
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
    
    // Til o'zgarishi logikasi (soddalashtirilgan)
    alert(`Til ${lang === 'uz' ? "O'zbekcha" : "Nemis"}ga o'zgartirildi`);
}

// Dastlabki ma'lumotlarni yuklash
document.addEventListener('DOMContentLoaded', async () => {
    await loadQuestions();
    console.log("Ilova yuklandi. Savollar soni:", allQuestions.length);
});