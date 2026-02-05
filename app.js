// Application JLPT N5
const app = {
    data: {
        kanji: null,
        counters: null,
        verbs: null
    },
    state: {
        currentKanjiIndex: 0,
        currentPage: 'home',
        kanjiMode: 'flashcard',
        verbMode: 'practice',
        quizScore: 0,
        quizTotal: 0,
        currentQuizQuestion: null,
        currentVerbQuestion: null,
        allKanji: []
    },
    progress: {
        studiedKanji: new Set(),
        studiedCounters: new Set(),
        studiedVerbs: new Set(),
        correctAnswers: 0,
        totalAttempts: 0
    },

    // Initialisation
    async init() {
        await this.loadData();
        this.loadProgress();
        this.updateHomeStats();
        this.registerServiceWorker();
    },

    // Chargement des données
    async loadData() {
        try {
            const [kanjiResponse, countersResponse, verbsResponse] = await Promise.all([
                fetch('data/kanji.json'),
                fetch('data/counters.json'),
                fetch('data/verbs.json')
            ]);

            this.data.kanji = await kanjiResponse.json();
            this.data.counters = await countersResponse.json();
            this.data.verbs = await verbsResponse.json();

            // Créer une liste plate de tous les kanji
            this.state.allKanji = [];
            this.data.kanji.categories.forEach(category => {
                category.kanji.forEach(k => {
                    this.state.allKanji.push({
                        ...k,
                        category: category.name
                    });
                });
            });

            console.log('Données chargées avec succès');
        } catch (error) {
            console.error('Erreur de chargement des données:', error);
            alert('Erreur lors du chargement des données. Veuillez vérifier que les fichiers JSON sont présents.');
        }
    },

    // Gestion de la progression
    saveProgress() {
        localStorage.setItem('jlpt-progress', JSON.stringify({
            studiedKanji: Array.from(this.progress.studiedKanji),
            studiedCounters: Array.from(this.progress.studiedCounters),
            studiedVerbs: Array.from(this.progress.studiedVerbs),
            correctAnswers: this.progress.correctAnswers,
            totalAttempts: this.progress.totalAttempts
        }));
    },

    loadProgress() {
        const saved = localStorage.getItem('jlpt-progress');
        if (saved) {
            const data = JSON.parse(saved);
            this.progress.studiedKanji = new Set(data.studiedKanji || []);
            this.progress.studiedCounters = new Set(data.studiedCounters || []);
            this.progress.studiedVerbs = new Set(data.studiedVerbs || []);
            this.progress.correctAnswers = data.correctAnswers || 0;
            this.progress.totalAttempts = data.totalAttempts || 0;
        }
    },

    resetProgress() {
        if (confirm('Êtes-vous sûr de vouloir réinitialiser toute votre progression ?')) {
            this.progress = {
                studiedKanji: new Set(),
                studiedCounters: new Set(),
                studiedVerbs: new Set(),
                correctAnswers: 0,
                totalAttempts: 0
            };
            this.saveProgress();
            this.updateHomeStats();
            alert('Progression réinitialisée !');
        }
    },

    // Navigation
    showPage(pageName) {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById(`${pageName}-page`).classList.add('active');
        this.state.currentPage = pageName;
    },

    showMode(mode) {
        this.showPage(mode);

        if (mode === 'kanji') {
            this.initKanjiFlashcard();
            this.populateCategorySelect();
        } else if (mode === 'counters') {
            this.displayCounters();
        } else if (mode === 'verbs') {
            this.initVerbPractice();
        }
    },

    // Mise à jour des stats
    updateHomeStats() {
        const totalStudied = this.progress.studiedKanji.size +
                            this.progress.studiedCounters.size +
                            this.progress.studiedVerbs.size;

        const successRate = this.progress.totalAttempts > 0
            ? Math.round((this.progress.correctAnswers / this.progress.totalAttempts) * 100)
            : 0;

        document.getElementById('total-studied').textContent = totalStudied;
        document.getElementById('success-rate').textContent = `${successRate}%`;

        // Mise à jour des progrès par catégorie
        this.updateProgress('kanji', this.progress.studiedKanji.size, this.state.allKanji.length);
        this.updateProgress('counters', this.progress.studiedCounters.size, this.data.counters?.counters.length || 14);

        const totalVerbs = this.data.verbs ?
            this.data.verbs.groups.reduce((sum, group) => sum + group.verbs.length, 0) : 60;
        this.updateProgress('verbs', this.progress.studiedVerbs.size, totalVerbs);
    },

    updateProgress(type, current, total) {
        const percent = total > 0 ? (current / total) * 100 : 0;
        const progressBar = document.getElementById(`${type}-progress`);
        const progressCount = document.getElementById(`${type}-count`);

        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressCount) progressCount.textContent = `${current}/${total}`;
    },

    // ===== KANJI =====
    setKanjiMode(mode) {
        this.state.kanjiMode = mode;

        // Mettre à jour les boutons
        document.querySelectorAll('#kanji-page .mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        // Afficher le bon contenu
        document.getElementById('kanji-flashcard').style.display = 'none';
        document.getElementById('kanji-quiz').style.display = 'none';
        document.getElementById('kanji-list').style.display = 'none';

        if (mode === 'flashcard') {
            document.getElementById('kanji-flashcard').style.display = 'block';
            this.initKanjiFlashcard();
        } else if (mode === 'quiz') {
            document.getElementById('kanji-quiz').style.display = 'block';
            this.startQuiz();
        } else if (mode === 'list') {
            document.getElementById('kanji-list').style.display = 'block';
            this.displayKanjiList();
        }
    },

    initKanjiFlashcard() {
        if (this.state.allKanji.length === 0) return;
        this.displayKanji(this.state.currentKanjiIndex);
    },

    displayKanji(index) {
        if (!this.state.allKanji || this.state.allKanji.length === 0) return;

        const kanji = this.state.allKanji[index];

        document.getElementById('kanji-char').textContent = kanji.character;
        document.getElementById('kanji-meaning').textContent = kanji.meaning;
        document.getElementById('kanji-on').textContent = kanji.readings.onyomi.join(', ');
        document.getElementById('kanji-kun').textContent = kanji.readings.kunyomi.join(', ');

        const examplesContainer = document.getElementById('kanji-examples');
        examplesContainer.innerHTML = '<h4>Exemples:</h4>';
        kanji.examples.forEach(ex => {
            const exDiv = document.createElement('div');
            exDiv.className = 'example-item';
            exDiv.innerHTML = `
                <div class="example-word">${ex.word}</div>
                <div class="example-reading">${ex.reading}</div>
                <div class="example-meaning">${ex.meaning}</div>
            `;
            examplesContainer.appendChild(exDiv);
        });

        document.getElementById('card-counter').textContent =
            `${index + 1} / ${this.state.allKanji.length}`;

        // Marquer comme étudié
        this.progress.studiedKanji.add(kanji.character);
        this.saveProgress();
        this.updateHomeStats();

        // Réinitialiser le flip
        document.getElementById('flashcard').classList.remove('flipped');
    },

    flipCard() {
        document.getElementById('flashcard').classList.toggle('flipped');
    },

    nextCard() {
        this.state.currentKanjiIndex = (this.state.currentKanjiIndex + 1) % this.state.allKanji.length;
        this.displayKanji(this.state.currentKanjiIndex);
    },

    previousCard() {
        this.state.currentKanjiIndex = (this.state.currentKanjiIndex - 1 + this.state.allKanji.length) % this.state.allKanji.length;
        this.displayKanji(this.state.currentKanjiIndex);
    },

    // Quiz Kanji
    startQuiz() {
        this.state.quizScore = 0;
        this.state.quizTotal = 0;
        this.nextQuestion();
    },

    nextQuestion() {
        if (this.state.allKanji.length === 0) return;

        // Choisir un kanji aléatoire
        const correctKanji = this.state.allKanji[Math.floor(Math.random() * this.state.allKanji.length)];

        // Générer des options
        const options = [correctKanji.meaning];
        while (options.length < 4) {
            const randomKanji = this.state.allKanji[Math.floor(Math.random() * this.state.allKanji.length)];
            if (!options.includes(randomKanji.meaning)) {
                options.push(randomKanji.meaning);
            }
        }

        // Mélanger les options
        options.sort(() => Math.random() - 0.5);

        this.state.currentQuizQuestion = {
            kanji: correctKanji,
            options: options,
            correctAnswer: correctKanji.meaning
        };

        // Afficher
        document.getElementById('quiz-kanji').textContent = correctKanji.character;
        const optionsContainer = document.getElementById('quiz-options');
        optionsContainer.innerHTML = '';

        options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option';
            btn.textContent = option;
            btn.onclick = () => this.checkQuizAnswer(option);
            optionsContainer.appendChild(btn);
        });

        document.getElementById('quiz-feedback').innerHTML = '';
        document.getElementById('quiz-feedback').className = 'quiz-feedback';
        document.getElementById('next-question-btn').style.display = 'none';
    },

    checkQuizAnswer(selected) {
        const correct = selected === this.state.currentQuizQuestion.correctAnswer;
        this.state.quizTotal++;

        if (correct) {
            this.state.quizScore++;
            this.progress.correctAnswers++;
        }
        this.progress.totalAttempts++;
        this.saveProgress();
        this.updateHomeStats();

        // Désactiver les boutons
        const options = document.querySelectorAll('.quiz-option');
        options.forEach(opt => {
            opt.classList.add('disabled');
            opt.onclick = null;
            if (opt.textContent === this.state.currentQuizQuestion.correctAnswer) {
                opt.classList.add('correct');
            } else if (opt.textContent === selected && !correct) {
                opt.classList.add('incorrect');
            }
        });

        // Afficher feedback
        const feedback = document.getElementById('quiz-feedback');
        if (correct) {
            feedback.className = 'quiz-feedback correct';
            feedback.textContent = '✓ Correct !';
        } else {
            feedback.className = 'quiz-feedback incorrect';
            feedback.textContent = `✗ Incorrect. La bonne réponse était : ${this.state.currentQuizQuestion.correctAnswer}`;
        }

        document.getElementById('quiz-score').textContent =
            `Score: ${this.state.quizScore}/${this.state.quizTotal}`;
        document.getElementById('next-question-btn').style.display = 'block';
    },

    // Liste des kanji
    populateCategorySelect() {
        const select = document.getElementById('category-select');
        select.innerHTML = '<option value="all">Toutes les catégories</option>';

        this.data.kanji.categories.forEach((cat, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = cat.name;
            select.appendChild(option);
        });
    },

    filterByCategory() {
        const select = document.getElementById('category-select');
        const value = select.value;

        if (value === 'all') {
            this.displayKanjiList();
        } else {
            this.displayKanjiList(parseInt(value));
        }
    },

    displayKanjiList(categoryIndex = null) {
        const grid = document.getElementById('kanji-grid');
        grid.innerHTML = '';

        let kanjiToDisplay = [];
        if (categoryIndex === null) {
            kanjiToDisplay = this.state.allKanji;
        } else {
            kanjiToDisplay = this.data.kanji.categories[categoryIndex].kanji.map(k => ({
                ...k,
                category: this.data.kanji.categories[categoryIndex].name
            }));
        }

        kanjiToDisplay.forEach((kanji, index) => {
            const item = document.createElement('div');
            item.className = 'kanji-item';
            item.innerHTML = `
                <div class="kanji">${kanji.character}</div>
                <div class="meaning">${kanji.meaning.split('/')[0].trim()}</div>
            `;
            item.onclick = () => {
                this.state.currentKanjiIndex = this.state.allKanji.findIndex(k => k.character === kanji.character);
                this.setKanjiMode('flashcard');
            };
            grid.appendChild(item);
        });
    },

    // ===== COMPTEURS =====
    displayCounters() {
        const container = document.getElementById('counters-list');
        container.innerHTML = '';

        this.data.counters.counters.forEach(counter => {
            const card = document.createElement('div');
            card.className = 'counter-card';

            let numbersHTML = counter.numbers.map(num => `
                <div class="counter-number">
                    <div class="num">${num.number}</div>
                    <div class="hiragana">${num.hiragana}</div>
                    <div class="romaji">${num.romaji}</div>
                </div>
            `).join('');

            card.innerHTML = `
                <div class="counter-header">
                    <div class="counter-name">${counter.name}</div>
                </div>
                <div class="counter-description">${counter.description}</div>
                <div class="counter-usage">📝 ${counter.usage}</div>
                ${counter.note ? `<div class="counter-note">⚠️ ${counter.note}</div>` : ''}
                <div class="counter-numbers">${numbersHTML}</div>
            `;

            container.appendChild(card);

            // Marquer comme étudié
            this.progress.studiedCounters.add(counter.name);
        });

        this.saveProgress();
        this.updateHomeStats();
    },

    // ===== VERBES =====
    setVerbMode(mode) {
        this.state.verbMode = mode;

        // Mettre à jour les boutons
        document.querySelectorAll('#verbs-page .mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        document.getElementById('verb-practice').style.display = 'none';
        document.getElementById('verb-list').style.display = 'none';

        if (mode === 'practice') {
            document.getElementById('verb-practice').style.display = 'block';
            this.initVerbPractice();
        } else if (mode === 'list') {
            document.getElementById('verb-list').style.display = 'block';
            this.displayVerbList();
        }
    },

    initVerbPractice() {
        this.generateVerbQuestion();
    },

    generateVerbQuestion() {
        // Choisir un groupe aléatoire
        const group = this.data.verbs.groups[Math.floor(Math.random() * this.data.verbs.groups.length)];
        const verb = group.verbs[Math.floor(Math.random() * group.verbs.length)];

        // Choisir une conjugaison aléatoire
        const conjugations = [
            { name: 'Présent poli affirmatif', suffix: 'ます', rule: 'masu' },
            { name: 'Présent poli négatif', suffix: 'ません', rule: 'masen' },
            { name: 'Passé poli affirmatif', suffix: 'ました', rule: 'mashita' },
            { name: 'Forme en て', suffix: 'て', rule: 'te' }
        ];

        const conjugation = conjugations[Math.floor(Math.random() * conjugations.length)];

        this.state.currentVerbQuestion = {
            verb: verb,
            group: group,
            conjugation: conjugation
        };

        document.getElementById('verb-kanji').textContent = verb.kanji || verb.kana;
        document.getElementById('verb-meaning').textContent = `(${verb.meaning})`;
        document.getElementById('conjugation-type').textContent = conjugation.name;
        document.getElementById('verb-input').value = '';
        document.getElementById('verb-feedback').innerHTML = '';
        document.getElementById('verb-feedback').className = 'verb-feedback';
        document.querySelector('.next-verb-btn').style.display = 'none';

        // Marquer comme étudié
        this.progress.studiedVerbs.add(verb.kana);
        this.saveProgress();
        this.updateHomeStats();
    },

    checkVerbAnswer() {
        const userAnswer = document.getElementById('verb-input').value.trim();
        const feedback = document.getElementById('verb-feedback');

        // Cette partie nécessiterait une logique plus complexe pour vérifier les conjugaisons
        // Pour simplifier, on accepte n'importe quelle réponse et on montre la bonne
        const verb = this.state.currentVerbQuestion.verb;
        const conjugation = this.state.currentVerbQuestion.conjugation;

        feedback.style.display = 'block';
        feedback.innerHTML = `
            <p><strong>Votre réponse:</strong> ${userAnswer || '(vide)'}</p>
            <p><strong>Forme attendue:</strong> ${conjugation.name}</p>
            <p><em>Consultez vos notes pour vérifier la conjugaison exacte</em></p>
        `;

        this.progress.totalAttempts++;
        this.saveProgress();
        this.updateHomeStats();

        document.querySelector('.next-verb-btn').style.display = 'block';
    },

    nextVerb() {
        this.generateVerbQuestion();
    },

    displayVerbList() {
        const container = document.getElementById('verb-groups');
        container.innerHTML = '';

        this.data.verbs.groups.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'verb-group';

            let verbsHTML = group.verbs.map(verb => `
                <div class="verb-item">
                    <div class="verb-item-kanji">${verb.kanji || verb.kana}</div>
                    <div class="verb-item-kana">${verb.kana}</div>
                    <div class="verb-item-meaning">${verb.meaning}</div>
                </div>
            `).join('');

            groupDiv.innerHTML = `
                <h2>${group.name}</h2>
                <p class="verb-group-description">${group.description}</p>
                <div class="verb-list">${verbsHTML}</div>
            `;

            container.appendChild(groupDiv);
        });
    },

    // Service Worker
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('service-worker.js')
                .then(reg => console.log('Service Worker enregistré'))
                .catch(err => console.log('Erreur Service Worker:', err));
        }
    }
};

// Initialiser l'application
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
