// Application JLPT N5
const app = {
    data: {
        kanji: null,
        counters: null,
        verbs: null,
        adverbs: null
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
        studiedAdverbs: new Set(),
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
            const [kanjiResponse, countersResponse, verbsResponse, adverbsResponse] = await Promise.all([
                fetch('data/kanji.json'),
                fetch('data/counters.json'),
                fetch('data/verbs.json'),
                fetch('data/adverbs.json')
            ]);

            this.data.kanji = await kanjiResponse.json();
            this.data.counters = await countersResponse.json();
            this.data.verbs = await verbsResponse.json();
            this.data.adverbs = await adverbsResponse.json();

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
            studiedAdverbs: Array.from(this.progress.studiedAdverbs),
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
            this.progress.studiedAdverbs = new Set(data.studiedAdverbs || []);
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
                studiedAdverbs: new Set(),
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
        } else if (mode === 'adverbs') {
            this.displayAdverbs();
        }
    },

    // Mise à jour des stats
    updateHomeStats() {
        const totalStudied = this.progress.studiedKanji.size +
                            this.progress.studiedCounters.size +
                            this.progress.studiedVerbs.size +
                            this.progress.studiedAdverbs.size;

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

        const totalAdverbs = this.data.adverbs?.adverbs.length || 50;
        this.updateProgress('adverbs', this.progress.studiedAdverbs.size, totalAdverbs);
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

        // Créer le tableau de navigation en haut
        const navGrid = document.createElement('div');
        navGrid.className = 'counters-nav-grid';

        this.data.counters.counters.forEach((counter, index) => {
            const navItem = document.createElement('div');
            navItem.className = 'counter-nav-item';

            // Extraire le kanji et la lecture du nom (ex: "つ (tsu)" -> kanji="つ", reading="tsu")
            const match = counter.name.match(/^(.+?)\s*\((.+?)\)$/);
            const kanji = match ? match[1] : counter.kanji || counter.name;
            const reading = match ? match[2] : '';

            navItem.innerHTML = `
                <div class="nav-kanji">${kanji}</div>
                <div class="nav-reading">${reading}</div>
            `;
            navItem.onclick = () => {
                document.getElementById(`counter-${index}`).scrollIntoView({ behavior: 'smooth', block: 'start' });
            };
            navGrid.appendChild(navItem);
        });

        container.appendChild(navGrid);

        // Créer les cartes détaillées
        this.data.counters.counters.forEach((counter, index) => {
            const card = document.createElement('div');
            card.className = 'counter-card';
            card.id = `counter-${index}`;

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

        // Choisir une conjugaison aléatoire (toutes les 10 formes)
        const conjugations = [
            { name: 'Présent neutre', key: 'present_neutral' },
            { name: 'Présent poli', key: 'present_polite' },
            { name: 'Présent neutre négatif', key: 'present_neutral_negative' },
            { name: 'Présent poli négatif', key: 'present_polite_negative' },
            { name: 'Passé neutre', key: 'past_neutral' },
            { name: 'Passé poli', key: 'past_polite' },
            { name: 'Passé neutre négatif', key: 'past_neutral_negative' },
            { name: 'Passé poli négatif', key: 'past_polite_negative' },
            { name: 'Forme en -て', key: 'te_form' },
            { name: 'Forme en -ている', key: 'te_iru' }
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
        const userAnswer = document.getElementById('verb-input').value.trim().toLowerCase();
        const feedback = document.getElementById('verb-feedback');
        const verb = this.state.currentVerbQuestion.verb;
        const conjugation = this.state.currentVerbQuestion.conjugation;

        // Récupérer la bonne réponse en romaji depuis les conjugaisons du verbe
        const conjugationData = verb.conjugations[conjugation.key];
        const correctAnswerRomaji = conjugationData.romaji.toLowerCase();
        const correctAnswerKanji = conjugationData.kanji;

        // Vérifier si la réponse est correcte (comparaison en romaji)
        const isCorrect = userAnswer === correctAnswerRomaji;

        feedback.style.display = 'block';

        if (isCorrect) {
            feedback.className = 'verb-feedback correct';
            feedback.innerHTML = `
                <p>✓ <strong>Correct !</strong></p>
                <p><strong>Romaji:</strong> ${conjugationData.romaji}</p>
                <p><strong>Kanji:</strong> ${correctAnswerKanji}</p>
            `;
            this.progress.correctAnswers++;
        } else {
            feedback.className = 'verb-feedback incorrect';
            feedback.innerHTML = `
                <p>✗ <strong>Incorrect</strong></p>
                <p><strong>Votre réponse:</strong> ${userAnswer || '(vide)'}</p>
                <p><strong>Bonne réponse (romaji):</strong> ${conjugationData.romaji}</p>
                <p><strong>Kanji:</strong> ${correctAnswerKanji}</p>
            `;
        }

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

            const verbsList = document.createElement('div');
            verbsList.className = 'verb-list';

            group.verbs.forEach((verb) => {
                const verbItem = document.createElement('div');
                verbItem.className = 'verb-item';
                verbItem.innerHTML = `
                    <div class="verb-item-kanji">${verb.kanji || verb.kana}</div>
                    <div class="verb-item-kana">${verb.kana}</div>
                    <div class="verb-item-meaning">${verb.meaning}</div>
                    <div class="verb-conjugations" style="display: none;">
                        <div class="conjugation-item">
                            <span class="conj-label">Présent neutre:</span>
                            <span class="conj-value">${verb.conjugations.present_neutral.kanji} (${verb.conjugations.present_neutral.romaji})</span>
                        </div>
                        <div class="conjugation-item">
                            <span class="conj-label">Présent poli:</span>
                            <span class="conj-value">${verb.conjugations.present_polite.kanji} (${verb.conjugations.present_polite.romaji})</span>
                        </div>
                        <div class="conjugation-item">
                            <span class="conj-label">Présent neutre négatif:</span>
                            <span class="conj-value">${verb.conjugations.present_neutral_negative.kanji} (${verb.conjugations.present_neutral_negative.romaji})</span>
                        </div>
                        <div class="conjugation-item">
                            <span class="conj-label">Présent poli négatif:</span>
                            <span class="conj-value">${verb.conjugations.present_polite_negative.kanji} (${verb.conjugations.present_polite_negative.romaji})</span>
                        </div>
                        <div class="conjugation-item">
                            <span class="conj-label">Passé neutre:</span>
                            <span class="conj-value">${verb.conjugations.past_neutral.kanji} (${verb.conjugations.past_neutral.romaji})</span>
                        </div>
                        <div class="conjugation-item">
                            <span class="conj-label">Passé poli:</span>
                            <span class="conj-value">${verb.conjugations.past_polite.kanji} (${verb.conjugations.past_polite.romaji})</span>
                        </div>
                        <div class="conjugation-item">
                            <span class="conj-label">Passé neutre négatif:</span>
                            <span class="conj-value">${verb.conjugations.past_neutral_negative.kanji} (${verb.conjugations.past_neutral_negative.romaji})</span>
                        </div>
                        <div class="conjugation-item">
                            <span class="conj-label">Passé poli négatif:</span>
                            <span class="conj-value">${verb.conjugations.past_polite_negative.kanji} (${verb.conjugations.past_polite_negative.romaji})</span>
                        </div>
                        <div class="conjugation-item">
                            <span class="conj-label">Forme en -て:</span>
                            <span class="conj-value">${verb.conjugations.te_form.kanji} (${verb.conjugations.te_form.romaji})</span>
                        </div>
                        <div class="conjugation-item">
                            <span class="conj-label">Forme en -ている:</span>
                            <span class="conj-value">${verb.conjugations.te_iru.kanji} (${verb.conjugations.te_iru.romaji})</span>
                        </div>
                    </div>
                `;

                // Toggle conjugations on click
                verbItem.onclick = () => {
                    const conjugationsDiv = verbItem.querySelector('.verb-conjugations');
                    const isVisible = conjugationsDiv.style.display !== 'none';
                    conjugationsDiv.style.display = isVisible ? 'none' : 'block';
                    verbItem.classList.toggle('expanded');
                };

                verbsList.appendChild(verbItem);
            });

            groupDiv.innerHTML = `
                <h2>${group.name}</h2>
                <p class="verb-group-description">${group.description}</p>
            `;
            groupDiv.appendChild(verbsList);

            container.appendChild(groupDiv);
        });
    },

    // ===== ADVERBES =====
    displayAdverbs() {
        const container = document.getElementById('adverbs-list');
        container.innerHTML = '';

        // Créer la grille de navigation en haut
        const navGrid = document.createElement('div');
        navGrid.className = 'adverbs-nav-grid';

        this.data.adverbs.adverbs.forEach((adverb, index) => {
            const navItem = document.createElement('div');
            navItem.className = 'adverb-nav-item';

            navItem.innerHTML = `
                <div class="nav-kanji">${adverb.kanji}</div>
                <div class="nav-hiragana">${adverb.hiragana}</div>
                <div class="nav-meaning">${adverb.meaning}</div>
            `;
            navItem.onclick = () => {
                document.getElementById(`adverb-${index}`).scrollIntoView({ behavior: 'smooth', block: 'start' });
            };
            navGrid.appendChild(navItem);
        });

        container.appendChild(navGrid);

        // Créer les cartes détaillées
        this.data.adverbs.adverbs.forEach((adverb, index) => {
            const card = document.createElement('div');
            card.className = 'adverb-card';
            card.id = `adverb-${index}`;

            card.innerHTML = `
                <div class="adverb-header">
                    <div class="adverb-kanji">${adverb.kanji}</div>
                    <div class="adverb-hiragana">${adverb.hiragana}</div>
                </div>
                <div class="adverb-meaning">${adverb.meaning}</div>
                <div class="adverb-example">
                    <div class="example-sentence">${adverb.example.sentence}</div>
                    <div class="example-reading">${adverb.example.reading}</div>
                    <div class="example-translation">${adverb.example.translation}</div>
                </div>
            `;

            container.appendChild(card);

            // Marquer comme étudié
            this.progress.studiedAdverbs.add(adverb.hiragana);
        });

        this.saveProgress();
        this.updateHomeStats();
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
