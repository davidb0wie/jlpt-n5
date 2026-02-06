// Application JLPT N5
const app = {
    data: {
        kanji: null,
        counters: null,
        verbs: null,
        adverbs: null,
        particles: null
    },
    state: {
        currentKanjiIndex: 0,
        currentPage: 'home',
        kanjiMode: 'flashcard',
        counterMode: 'list',
        verbMode: 'practice',
        adverbMode: 'list',
        particleMode: 'list',
        quizScore: 0,
        quizTotal: 0,
        counterQuizScore: 0,
        counterQuizTotal: 0,
        verbQuizScore: 0,
        verbQuizTotal: 0,
        adverbQuizScore: 0,
        adverbQuizTotal: 0,
        particleQuiz1Score: 0,
        particleQuiz1Total: 0,
        particleQuiz2Score: 0,
        particleQuiz2Total: 0,
        currentQuizQuestion: null,
        currentCounterQuestion: null,
        currentVerbQuestion: null,
        currentAdverbQuestion: null,
        currentParticleQuestion: null,
        allKanji: []
    },
    progress: {
        studiedKanji: new Set(),
        studiedCounters: new Set(),
        studiedVerbs: new Set(),
        studiedAdverbs: new Set(),
        studiedParticles: new Set(),
        correctAnswers: 0,
        totalAttempts: 0
    },

    // Initialisation
    async init() {
        await this.loadData();
        this.loadProgress();
        this.updateHomeStats();
        this.registerServiceWorker();
        this.initSwipeGesture();
    },

    // Chargement des données
    async loadData() {
        try {
            const [kanjiResponse, countersResponse, verbsResponse, adverbsResponse, particlesResponse] = await Promise.all([
                fetch('data/kanji.json'),
                fetch('data/counters.json'),
                fetch('data/verbs.json'),
                fetch('data/adverbs.json'),
                fetch('data/particles.json')
            ]);

            this.data.kanji = await kanjiResponse.json();
            this.data.counters = await countersResponse.json();
            this.data.verbs = await verbsResponse.json();
            this.data.adverbs = await adverbsResponse.json();
            this.data.particles = await particlesResponse.json();

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
            studiedParticles: Array.from(this.progress.studiedParticles),
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
            this.progress.studiedParticles = new Set(data.studiedParticles || []);
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
                studiedParticles: new Set(),
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
            this.setCounterMode('list');
        } else if (mode === 'verbs') {
            this.initVerbPractice();
        } else if (mode === 'adverbs') {
            this.setAdverbMode('list');
        } else if (mode === 'particles') {
            this.setParticleMode('list');
        }
    },

    // Mise à jour des stats
    updateHomeStats() {
        const totalStudied = this.progress.studiedKanji.size +
                            this.progress.studiedCounters.size +
                            this.progress.studiedVerbs.size +
                            this.progress.studiedAdverbs.size +
                            this.progress.studiedParticles.size;

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

        const totalParticles = this.data.particles?.particles.length || 14;
        this.updateProgress('particles', this.progress.studiedParticles.size, totalParticles);
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

        const feedback = document.getElementById('quiz-feedback');
        feedback.innerHTML = '';
        feedback.className = 'quiz-feedback';
        feedback.style.cursor = 'default';
        feedback.onclick = null;
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
        const kanji = this.state.currentQuizQuestion.kanji;
        const pronunciations = [];
        if (kanji.on) pronunciations.push(`On: ${kanji.on}`);
        if (kanji.kun) pronunciations.push(`Kun: ${kanji.kun}`);
        const pronText = pronunciations.join(' | ');

        if (correct) {
            feedback.className = 'quiz-feedback correct';
            feedback.innerHTML = `✓ Correct !<br><span style="font-size: 0.9em; margin-top: 5px; display: block;">${pronText}</span>`;
        } else {
            feedback.className = 'quiz-feedback incorrect';
            feedback.innerHTML = `✗ Incorrect. La bonne réponse était : ${this.state.currentQuizQuestion.correctAnswer}<br><span style="font-size: 0.9em; margin-top: 5px; display: block;">${pronText}</span>`;
        }

        // Rendre la boîte de feedback cliquable pour passer à la question suivante
        feedback.style.cursor = 'pointer';
        feedback.onclick = () => this.nextQuestion();

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

    setCounterMode(mode) {
        this.state.counterMode = mode;

        // Mettre à jour les boutons
        document.querySelectorAll('#counters-page .mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        // Afficher le bon contenu
        document.getElementById('counter-list').style.display = 'none';
        document.getElementById('counter-quiz').style.display = 'none';

        if (mode === 'list') {
            document.getElementById('counter-list').style.display = 'block';
            this.displayCounters();
        } else if (mode === 'quiz') {
            document.getElementById('counter-quiz').style.display = 'block';
            this.startCounterQuiz();
        }
    },

    startCounterQuiz() {
        this.state.counterQuizScore = 0;
        this.state.counterQuizTotal = 0;
        this.nextCounterQuestion();
    },

    nextCounterQuestion() {
        if (!this.data.counters || this.data.counters.counters.length === 0) return;

        // Choisir un compteur aléatoire
        const correctCounter = this.data.counters.counters[Math.floor(Math.random() * this.data.counters.counters.length)];

        // Générer des options avec les descriptions d'autres compteurs
        const options = [correctCounter.description];

        // Ajouter des options incorrectes (descriptions d'autres compteurs)
        while (options.length < 4 && this.data.counters.counters.length >= 4) {
            const randomCounter = this.data.counters.counters[Math.floor(Math.random() * this.data.counters.counters.length)];
            if (!options.includes(randomCounter.description)) {
                options.push(randomCounter.description);
            }
        }

        // Mélanger les options
        options.sort(() => Math.random() - 0.5);

        this.state.currentCounterQuestion = {
            counter: correctCounter,
            correctAnswer: correctCounter.description,
            options: options
        };

        // Afficher la question (seulement le nom du compteur, sans l'usage!)
        document.getElementById('quiz-counter-name').textContent = correctCounter.name;
        document.getElementById('quiz-counter-usage').textContent = ''; // Ne rien afficher
        document.getElementById('quiz-counter-number').style.display = 'none'; // Cacher le nombre

        const optionsContainer = document.getElementById('counter-quiz-options');
        optionsContainer.innerHTML = '';

        options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option';
            btn.textContent = option;
            btn.onclick = () => this.checkCounterAnswer(option);
            optionsContainer.appendChild(btn);
        });

        const feedback = document.getElementById('counter-quiz-feedback');
        feedback.innerHTML = '';
        feedback.className = 'quiz-feedback';
        feedback.style.cursor = 'default';
        feedback.onclick = null;
        document.getElementById('counter-next-question-btn').style.display = 'none';
    },

    checkCounterAnswer(selected) {
        const correct = selected === this.state.currentCounterQuestion.correctAnswer;
        this.state.counterQuizTotal++;

        if (correct) {
            this.state.counterQuizScore++;
            this.progress.correctAnswers++;
        }
        this.progress.totalAttempts++;
        this.saveProgress();
        this.updateHomeStats();

        // Désactiver les boutons
        const options = document.querySelectorAll('#counter-quiz-options .quiz-option');
        options.forEach(opt => {
            opt.classList.add('disabled');
            opt.onclick = null;
            if (opt.textContent === this.state.currentCounterQuestion.correctAnswer) {
                opt.classList.add('correct');
            } else if (opt.textContent === selected && !correct) {
                opt.classList.add('incorrect');
            }
        });

        // Afficher feedback avec usage
        const feedback = document.getElementById('counter-quiz-feedback');
        const counter = this.state.currentCounterQuestion.counter;
        const usage = counter.usage;

        if (correct) {
            feedback.className = 'quiz-feedback correct';
            feedback.innerHTML = `✓ Correct !<br><span style="font-size: 0.9em; margin-top: 5px; display: block;">Usage : ${usage}</span>`;
        } else {
            feedback.className = 'quiz-feedback incorrect';
            feedback.innerHTML = `✗ Incorrect. La bonne réponse était : ${this.state.currentCounterQuestion.correctAnswer}<br><span style="font-size: 0.9em; margin-top: 5px; display: block;">Usage : ${usage}</span>`;
        }

        // Rendre la boîte de feedback cliquable pour passer à la question suivante
        feedback.style.cursor = 'pointer';
        feedback.onclick = () => this.nextCounterQuestion();

        document.getElementById('counter-quiz-score').textContent =
            `Score: ${this.state.counterQuizScore}/${this.state.counterQuizTotal}`;
        document.getElementById('counter-next-question-btn').style.display = 'block';
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
        this.state.verbQuizScore = 0;
        this.state.verbQuizTotal = 0;
        this.nextVerbQuestion();
    },

    nextVerbQuestion() {
        if (!this.data.verbs || this.data.verbs.groups.length === 0) return;

        // Créer une liste de tous les verbes
        const allVerbs = [];
        this.data.verbs.groups.forEach(group => {
            group.verbs.forEach(verb => {
                allVerbs.push({ ...verb, groupName: group.name });
            });
        });

        if (allVerbs.length === 0) return;

        // Choisir un verbe aléatoire
        const correctVerb = allVerbs[Math.floor(Math.random() * allVerbs.length)];

        // Choisir une conjugaison aléatoire
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
        const conjugatedForm = correctVerb.conjugations[conjugation.key];

        // Générer des options (autres verbes)
        const options = [`${correctVerb.kana} (${correctVerb.meaning})`];

        while (options.length < 4 && allVerbs.length >= 4) {
            const randomVerb = allVerbs[Math.floor(Math.random() * allVerbs.length)];
            const option = `${randomVerb.kana} (${randomVerb.meaning})`;
            if (!options.includes(option)) {
                options.push(option);
            }
        }

        // Mélanger les options
        options.sort(() => Math.random() - 0.5);

        this.state.currentVerbQuestion = {
            verb: correctVerb,
            conjugation: conjugation,
            conjugatedForm: conjugatedForm,
            correctAnswer: `${correctVerb.kana} (${correctVerb.meaning})`,
            options: options
        };

        // Afficher la question
        document.getElementById('conjugated-verb').textContent = conjugatedForm.kanji;
        document.getElementById('verb-form-label').textContent = conjugation.name;

        const optionsContainer = document.getElementById('verb-quiz-options');
        optionsContainer.innerHTML = '';

        options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option';
            btn.textContent = option;
            btn.onclick = () => this.checkVerbAnswer(option);
            optionsContainer.appendChild(btn);
        });

        const feedback = document.getElementById('verb-quiz-feedback');
        feedback.innerHTML = '';
        feedback.className = 'quiz-feedback';
        feedback.style.cursor = 'default';
        feedback.onclick = null;
        document.getElementById('verb-next-question-btn').style.display = 'none';

        // Marquer comme étudié
        this.progress.studiedVerbs.add(correctVerb.kana);
        this.saveProgress();
        this.updateHomeStats();
    },

    checkVerbAnswer(selected) {
        const correct = selected === this.state.currentVerbQuestion.correctAnswer;
        this.state.verbQuizTotal++;

        if (correct) {
            this.state.verbQuizScore++;
            this.progress.correctAnswers++;
        }
        this.progress.totalAttempts++;
        this.saveProgress();
        this.updateHomeStats();

        // Désactiver les boutons
        const options = document.querySelectorAll('#verb-quiz-options .quiz-option');
        options.forEach(opt => {
            opt.classList.add('disabled');
            opt.onclick = null;
            if (opt.textContent === this.state.currentVerbQuestion.correctAnswer) {
                opt.classList.add('correct');
            } else if (opt.textContent === selected && !correct) {
                opt.classList.add('incorrect');
            }
        });

        // Afficher feedback avec romaji
        const feedback = document.getElementById('verb-quiz-feedback');
        const romaji = this.state.currentVerbQuestion.conjugatedForm.romaji;
        const verb = this.state.currentVerbQuestion.verb;

        if (correct) {
            feedback.className = 'quiz-feedback correct';
            feedback.innerHTML = `✓ Correct !<br><span style="font-size: 0.9em; margin-top: 5px; display: block;">${romaji}</span>`;
        } else {
            feedback.className = 'quiz-feedback incorrect';
            feedback.innerHTML = `✗ Incorrect. La bonne réponse était : ${verb.kana} (${verb.meaning})<br><span style="font-size: 0.9em; margin-top: 5px; display: block;">${romaji}</span>`;
        }

        // Rendre la boîte de feedback cliquable pour passer à la question suivante
        feedback.style.cursor = 'pointer';
        feedback.onclick = () => this.nextVerbQuestion();

        document.getElementById('verb-quiz-score').textContent =
            `Score: ${this.state.verbQuizScore}/${this.state.verbQuizTotal}`;
        document.getElementById('verb-next-question-btn').style.display = 'block';
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

        // Créer la grille d'adverbes (3 par ligne)
        const grid = document.createElement('div');
        grid.className = 'adverbs-grid';

        this.data.adverbs.adverbs.forEach((adverb) => {
            const item = document.createElement('div');
            item.className = 'adverb-item';

            item.innerHTML = `
                <div class="adverb-main">
                    <div class="adverb-kanji">${adverb.kanji}</div>
                    <div class="adverb-hiragana">${adverb.hiragana}</div>
                    <div class="adverb-meaning">${adverb.meaning}</div>
                </div>
                <div class="adverb-details" style="display: none;">
                    <div class="example-sentence">${adverb.example.sentence}</div>
                    <div class="example-reading">${adverb.example.reading}</div>
                    <div class="example-translation">${adverb.example.translation}</div>
                </div>
            `;

            // Toggle détails au clic
            item.onclick = () => {
                const details = item.querySelector('.adverb-details');
                const isVisible = details.style.display !== 'none';
                details.style.display = isVisible ? 'none' : 'block';
                item.classList.toggle('expanded');
            };

            grid.appendChild(item);

            // Marquer comme étudié
            this.progress.studiedAdverbs.add(adverb.hiragana);
        });

        container.appendChild(grid);

        this.saveProgress();
        this.updateHomeStats();
    },

    setAdverbMode(mode) {
        this.state.adverbMode = mode;

        // Mettre à jour les boutons
        document.querySelectorAll('#adverbs-page .mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        // Afficher le bon contenu
        document.getElementById('adverb-list').style.display = 'none';
        document.getElementById('adverb-quiz').style.display = 'none';

        if (mode === 'list') {
            document.getElementById('adverb-list').style.display = 'block';
            this.displayAdverbs();
        } else if (mode === 'quiz') {
            document.getElementById('adverb-quiz').style.display = 'block';
            this.startAdverbQuiz();
        }
    },

    startAdverbQuiz() {
        this.state.adverbQuizScore = 0;
        this.state.adverbQuizTotal = 0;
        this.nextAdverbQuestion();
    },

    nextAdverbQuestion() {
        if (!this.data.adverbs || this.data.adverbs.adverbs.length === 0) return;

        // Choisir un adverbe aléatoire
        const correctAdverb = this.data.adverbs.adverbs[Math.floor(Math.random() * this.data.adverbs.adverbs.length)];

        // Générer des options (significations d'autres adverbes)
        const options = [correctAdverb.meaning];

        // Ajouter des options incorrectes
        while (options.length < 4 && this.data.adverbs.adverbs.length >= 4) {
            const randomAdverb = this.data.adverbs.adverbs[Math.floor(Math.random() * this.data.adverbs.adverbs.length)];
            if (!options.includes(randomAdverb.meaning)) {
                options.push(randomAdverb.meaning);
            }
        }

        // Mélanger les options
        options.sort(() => Math.random() - 0.5);

        this.state.currentAdverbQuestion = {
            adverb: correctAdverb,
            correctAnswer: correctAdverb.meaning,
            options: options
        };

        // Afficher la question
        document.getElementById('quiz-adverb-kanji').textContent = correctAdverb.kanji;
        document.getElementById('quiz-adverb-hiragana').textContent = correctAdverb.hiragana;

        const optionsContainer = document.getElementById('adverb-quiz-options');
        optionsContainer.innerHTML = '';

        options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option';
            btn.textContent = option;
            btn.onclick = () => this.checkAdverbAnswer(option);
            optionsContainer.appendChild(btn);
        });

        const feedback = document.getElementById('adverb-quiz-feedback');
        feedback.innerHTML = '';
        feedback.className = 'quiz-feedback';
        feedback.style.cursor = 'default';
        feedback.onclick = null;
        document.getElementById('adverb-next-question-btn').style.display = 'none';

        // Marquer comme étudié
        this.progress.studiedAdverbs.add(correctAdverb.hiragana);
        this.saveProgress();
        this.updateHomeStats();
    },

    checkAdverbAnswer(selected) {
        const correct = selected === this.state.currentAdverbQuestion.correctAnswer;
        this.state.adverbQuizTotal++;

        if (correct) {
            this.state.adverbQuizScore++;
            this.progress.correctAnswers++;
        }
        this.progress.totalAttempts++;
        this.saveProgress();
        this.updateHomeStats();

        // Désactiver les boutons
        const options = document.querySelectorAll('#adverb-quiz-options .quiz-option');
        options.forEach(opt => {
            opt.classList.add('disabled');
            opt.onclick = null;
            if (opt.textContent === this.state.currentAdverbQuestion.correctAnswer) {
                opt.classList.add('correct');
            } else if (opt.textContent === selected && !correct) {
                opt.classList.add('incorrect');
            }
        });

        // Afficher feedback avec exemple
        const feedback = document.getElementById('adverb-quiz-feedback');
        const adverb = this.state.currentAdverbQuestion.adverb;
        const example = `${adverb.example.sentence}<br><small>${adverb.example.translation}</small>`;

        if (correct) {
            feedback.className = 'quiz-feedback correct';
            feedback.innerHTML = `✓ Correct !<br><span style="font-size: 0.9em; margin-top: 5px; display: block;">${example}</span>`;
        } else {
            feedback.className = 'quiz-feedback incorrect';
            feedback.innerHTML = `✗ Incorrect. La bonne réponse était : ${this.state.currentAdverbQuestion.correctAnswer}<br><span style="font-size: 0.9em; margin-top: 5px; display: block;">${example}</span>`;
        }

        // Rendre la boîte de feedback cliquable pour passer à la question suivante
        feedback.style.cursor = 'pointer';
        feedback.onclick = () => this.nextAdverbQuestion();

        document.getElementById('adverb-quiz-score').textContent =
            `Score: ${this.state.adverbQuizScore}/${this.state.adverbQuizTotal}`;
        document.getElementById('adverb-next-question-btn').style.display = 'block';
    },

    // ===== PARTICULES =====
    displayParticles() {
        const container = document.getElementById('particles-list');
        container.innerHTML = '';

        const grid = document.createElement('div');
        grid.className = 'particles-grid';

        this.data.particles.particles.forEach((particle) => {
            const item = document.createElement('div');
            item.className = 'particle-item';

            item.innerHTML = `
                <div class="particle-main">
                    <div class="particle-char">${particle.particle}</div>
                    <div class="particle-romaji-small">${particle.romaji}</div>
                    <div class="particle-desc">${particle.description}</div>
                </div>
                <div class="particle-details" style="display: none;">
                    <div class="particle-usage"><strong>Usage:</strong> ${particle.usage}</div>
                    <div class="particle-example">${particle.example}</div>
                </div>
            `;

            item.onclick = () => {
                const details = item.querySelector('.particle-details');
                const isVisible = details.style.display !== 'none';
                details.style.display = isVisible ? 'none' : 'block';
                item.classList.toggle('expanded');
            };

            grid.appendChild(item);
            this.progress.studiedParticles.add(particle.particle);
        });

        container.appendChild(grid);
        this.saveProgress();
        this.updateHomeStats();
    },

    setParticleMode(mode) {
        this.state.particleMode = mode;

        document.querySelectorAll('#particles-page .mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        document.getElementById('particle-list').style.display = 'none';
        document.getElementById('particle-quiz1').style.display = 'none';
        document.getElementById('particle-quiz2').style.display = 'none';

        if (mode === 'list') {
            document.getElementById('particle-list').style.display = 'block';
            this.displayParticles();
        } else if (mode === 'quiz1') {
            document.getElementById('particle-quiz1').style.display = 'block';
            this.startParticleQuiz1();
        } else if (mode === 'quiz2') {
            document.getElementById('particle-quiz2').style.display = 'block';
            this.startParticleQuiz2();
        }
    },

    // Quiz 1: À quoi sert cette particule?
    startParticleQuiz1() {
        this.state.particleQuiz1Score = 0;
        this.state.particleQuiz1Total = 0;
        this.nextParticleQuiz1();
    },

    nextParticleQuiz1() {
        if (!this.data.particles || this.data.particles.particles.length === 0) return;

        const correctParticle = this.data.particles.particles[Math.floor(Math.random() * this.data.particles.particles.length)];

        const options = [correctParticle.description];

        while (options.length < 4 && this.data.particles.particles.length >= 4) {
            const randomParticle = this.data.particles.particles[Math.floor(Math.random() * this.data.particles.particles.length)];
            if (!options.includes(randomParticle.description)) {
                options.push(randomParticle.description);
            }
        }

        options.sort(() => Math.random() - 0.5);

        this.state.currentParticleQuestion = {
            particle: correctParticle,
            correctAnswer: correctParticle.description,
            options: options
        };

        document.getElementById('quiz1-particle').textContent = correctParticle.particle;
        document.getElementById('quiz1-romaji').textContent = correctParticle.romaji;

        const optionsContainer = document.getElementById('particle-quiz1-options');
        optionsContainer.innerHTML = '';

        options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option';
            btn.textContent = option;
            btn.onclick = () => this.checkParticleQuiz1Answer(option);
            optionsContainer.appendChild(btn);
        });

        const feedback = document.getElementById('particle-quiz1-feedback');
        feedback.innerHTML = '';
        feedback.className = 'quiz-feedback';
        feedback.style.cursor = 'default';
        feedback.onclick = null;
        document.getElementById('particle-quiz1-next-btn').style.display = 'none';

        this.progress.studiedParticles.add(correctParticle.particle);
        this.saveProgress();
        this.updateHomeStats();
    },

    checkParticleQuiz1Answer(selected) {
        const correct = selected === this.state.currentParticleQuestion.correctAnswer;
        this.state.particleQuiz1Total++;

        if (correct) {
            this.state.particleQuiz1Score++;
            this.progress.correctAnswers++;
        }
        this.progress.totalAttempts++;
        this.saveProgress();
        this.updateHomeStats();

        const options = document.querySelectorAll('#particle-quiz1-options .quiz-option');
        options.forEach(opt => {
            opt.classList.add('disabled');
            opt.onclick = null;
            if (opt.textContent === this.state.currentParticleQuestion.correctAnswer) {
                opt.classList.add('correct');
            } else if (opt.textContent === selected && !correct) {
                opt.classList.add('incorrect');
            }
        });

        const feedback = document.getElementById('particle-quiz1-feedback');
        const particle = this.state.currentParticleQuestion.particle;
        const usage = particle.usage;

        if (correct) {
            feedback.className = 'quiz-feedback correct';
            feedback.innerHTML = `✓ Correct !<br><span style="font-size: 0.9em; margin-top: 5px; display: block;">${usage}</span>`;
        } else {
            feedback.className = 'quiz-feedback incorrect';
            feedback.innerHTML = `✗ Incorrect. La bonne réponse était : ${this.state.currentParticleQuestion.correctAnswer}<br><span style="font-size: 0.9em; margin-top: 5px; display: block;">${usage}</span>`;
        }

        feedback.style.cursor = 'pointer';
        feedback.onclick = () => this.nextParticleQuiz1();

        document.getElementById('particle-quiz1-score').textContent =
            `Score: ${this.state.particleQuiz1Score}/${this.state.particleQuiz1Total}`;
        document.getElementById('particle-quiz1-next-btn').style.display = 'block';
    },

    // Quiz 2: Quelle particule dans cette phrase?
    startParticleQuiz2() {
        this.state.particleQuiz2Score = 0;
        this.state.particleQuiz2Total = 0;
        this.nextParticleQuiz2();
    },

    nextParticleQuiz2() {
        if (!this.data.particles || this.data.particles.sentences.length === 0) return;

        const sentence = this.data.particles.sentences[Math.floor(Math.random() * this.data.particles.sentences.length)];

        // Générer des options avec la bonne particule et 3 mauvaises
        const allParticles = this.data.particles.particles.map(p => p.particle);
        const options = [sentence.correctParticle];

        while (options.length < 4) {
            const randomParticle = allParticles[Math.floor(Math.random() * allParticles.length)];
            if (!options.includes(randomParticle)) {
                options.push(randomParticle);
            }
        }

        options.sort(() => Math.random() - 0.5);

        this.state.currentParticleQuestion = {
            sentence: sentence,
            correctAnswer: sentence.correctParticle,
            options: options
        };

        document.getElementById('quiz2-sentence').textContent = sentence.sentence;
        document.getElementById('quiz2-reading').textContent = sentence.reading;
        document.getElementById('quiz2-translation').textContent = sentence.translation;

        const optionsContainer = document.getElementById('particle-quiz2-options');
        optionsContainer.innerHTML = '';

        options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option';
            btn.textContent = option;
            btn.onclick = () => this.checkParticleQuiz2Answer(option);
            optionsContainer.appendChild(btn);
        });

        const feedback = document.getElementById('particle-quiz2-feedback');
        feedback.innerHTML = '';
        feedback.className = 'quiz-feedback';
        feedback.style.cursor = 'default';
        feedback.onclick = null;
        document.getElementById('particle-quiz2-next-btn').style.display = 'none';
    },

    checkParticleQuiz2Answer(selected) {
        const correct = selected === this.state.currentParticleQuestion.correctAnswer;
        this.state.particleQuiz2Total++;

        if (correct) {
            this.state.particleQuiz2Score++;
            this.progress.correctAnswers++;
        }
        this.progress.totalAttempts++;
        this.saveProgress();
        this.updateHomeStats();

        const options = document.querySelectorAll('#particle-quiz2-options .quiz-option');
        options.forEach(opt => {
            opt.classList.add('disabled');
            opt.onclick = null;
            if (opt.textContent === this.state.currentParticleQuestion.correctAnswer) {
                opt.classList.add('correct');
            } else if (opt.textContent === selected && !correct) {
                opt.classList.add('incorrect');
            }
        });

        const feedback = document.getElementById('particle-quiz2-feedback');
        const sentence = this.state.currentParticleQuestion.sentence;
        const completeSentence = sentence.sentence.replace('___', sentence.correctParticle);

        if (correct) {
            feedback.className = 'quiz-feedback correct';
            feedback.innerHTML = `✓ Correct !<br><span style="font-size: 0.9em; margin-top: 5px; display: block;">${completeSentence}</span>`;
        } else {
            feedback.className = 'quiz-feedback incorrect';
            feedback.innerHTML = `✗ Incorrect. La bonne particule était : ${this.state.currentParticleQuestion.correctAnswer}<br><span style="font-size: 0.9em; margin-top: 5px; display: block;">${completeSentence}</span>`;
        }

        feedback.style.cursor = 'pointer';
        feedback.onclick = () => this.nextParticleQuiz2();

        document.getElementById('particle-quiz2-score').textContent =
            `Score: ${this.state.particleQuiz2Score}/${this.state.particleQuiz2Total}`;
        document.getElementById('particle-quiz2-next-btn').style.display = 'block';
    },

    // Service Worker
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('service-worker.js')
                .then(reg => console.log('Service Worker enregistré'))
                .catch(err => console.log('Erreur Service Worker:', err));
        }
    },

    // Gestion du swipe
    initSwipeGesture() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;

        const minSwipeDistance = 50; // Distance minimale pour considérer un swipe
        const maxVerticalDistance = 100; // Distance verticale max pour un swipe horizontal

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            this.handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY, minSwipeDistance, maxVerticalDistance);
        }, { passive: true });
    },

    handleSwipe(startX, startY, endX, endY, minDistance, maxVerticalDistance) {
        const deltaX = endX - startX;
        const deltaY = Math.abs(endY - startY);

        // Vérifier que le mouvement est assez horizontal
        if (Math.abs(deltaX) > minDistance && deltaY < maxVerticalDistance) {
            // Comportement spécial pour la page flashcards kanji
            if (this.state.currentPage === 'kanji' && this.state.kanjiMode === 'flashcard') {
                if (deltaX < 0) {
                    // Swipe gauche → carte suivante
                    this.nextCard();
                } else {
                    // Swipe droite → carte précédente
                    this.previousCard();
                }
            } else {
                // Pour toutes les autres pages : swipe gauche = retour au menu
                if (deltaX < 0 && this.state.currentPage !== 'home') {
                    this.showPage('home');
                }
            }
        }
    }
};

// Initialiser l'application
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
