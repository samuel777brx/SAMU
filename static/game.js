// Math Game JavaScript - Main game logic and UI interactions

class MathGame {
    constructor() {
        this.currentGameState = null;
        this.isSubmitting = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadGameState();
    }

    bindEvents() {
        // Submit answer button
        document.getElementById('submit-btn').addEventListener('click', () => {
            this.submitAnswer();
        });

        // Enter key submission
        document.getElementById('answer-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitAnswer();
            }
        });

        // New game button
        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.startNewGame();
        });

        // Continue button in result modal
        document.getElementById('continue-btn').addEventListener('click', () => {
            this.hideResultModal();
        });

        // Restart game button in complete modal
        document.getElementById('restart-game-btn').addEventListener('click', () => {
            this.startNewGame();
        });

        // Focus input when page loads
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('answer-input').focus();
        });
    }

    async loadGameState() {
        try {
            const response = await fetch('/get_game_state');
            const data = await response.json();
            this.currentGameState = data;
            this.updateUI();
        } catch (error) {
            console.error('Error loading game state:', error);
            this.showError('Erro ao carregar o jogo. Recarregue a página.');
        }
    }

    updateUI() {
        if (!this.currentGameState) return;

        const { level, level_name, score, question, score_to_advance } = this.currentGameState;

        // Update level display
        document.getElementById('level-name').textContent = level_name;
        
        // Update score and progress
        document.getElementById('current-score').textContent = score;
        document.getElementById('score-needed').textContent = score_to_advance;
        
        const progressPercent = (score / score_to_advance) * 100;
        document.getElementById('score-progress').style.width = `${progressPercent}%`;
        
        // Update question
        document.getElementById('question-text').textContent = question;
        
        // Clear and focus input
        const answerInput = document.getElementById('answer-input');
        answerInput.value = '';
        answerInput.focus();
        
        // Remove any feedback classes
        answerInput.classList.remove('feedback-correct', 'feedback-incorrect');
    }

    async submitAnswer() {
        if (this.isSubmitting) return;

        const answerInput = document.getElementById('answer-input');
        const answer = answerInput.value.trim();

        if (!answer) {
            this.showError('Por favor, digite uma resposta!');
            answerInput.focus();
            return;
        }

        this.isSubmitting = true;
        this.setLoading(true);

        try {
            const response = await fetch('/submit_answer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ answer: answer })
            });

            const result = await response.json();

            if (!result.success) {
                this.showError(result.message);
                answerInput.focus();
                return;
            }

            // Update game state
            this.currentGameState = {
                level: result.level,
                level_name: result.level_name,
                score: result.score,
                question: result.next_question,
                score_to_advance: result.score_to_advance
            };

            // Show feedback
            this.showFeedback(result);

            // Check for game completion or level advancement
            if (result.game_complete) {
                setTimeout(() => {
                    this.showGameComplete();
                }, 1500);
            } else if (result.should_advance) {
                setTimeout(() => {
                    this.showLevelAdvancement(result);
                }, 1500);
            }

        } catch (error) {
            console.error('Error submitting answer:', error);
            this.showError('Erro ao enviar resposta. Tente novamente.');
        } finally {
            this.isSubmitting = false;
            this.setLoading(false);
        }
    }

    showFeedback(result) {
        const answerInput = document.getElementById('answer-input');
        
        // Add visual feedback to input
        if (result.is_correct) {
            answerInput.classList.add('feedback-correct');
            this.animateScore();
        } else {
            answerInput.classList.add('feedback-incorrect');
        }

        // Show result modal
        document.getElementById('result-emoji').textContent = result.emoji;
        document.getElementById('result-message').textContent = result.message;
        document.getElementById('result-score').textContent = 
            `Pontuação: ${result.score}/${result.score_to_advance}`;

        this.showResultModal();
    }

    showLevelAdvancement(result) {
        document.getElementById('result-emoji').textContent = result.emoji;
        document.getElementById('result-message').textContent = result.message;
        document.getElementById('result-score').textContent = 
            `Novo nível desbloqueado: ${result.level_name}!`;

        this.showResultModal();
    }

    showGameComplete() {
        const completeModal = new bootstrap.Modal(document.getElementById('completeModal'));
        completeModal.show();
    }

    showResultModal() {
        const resultModal = new bootstrap.Modal(document.getElementById('resultModal'));
        resultModal.show();
    }

    hideResultModal() {
        const resultModal = bootstrap.Modal.getInstance(document.getElementById('resultModal'));
        if (resultModal) {
            resultModal.hide();
        }
        
        // Update UI with new question/state
        setTimeout(() => {
            this.updateUI();
        }, 300);
    }

    animateScore() {
        const scoreElement = document.getElementById('current-score');
        scoreElement.classList.add('score-update');
        setTimeout(() => {
            scoreElement.classList.remove('score-update');
        }, 500);
    }

    setLoading(isLoading) {
        const submitBtn = document.getElementById('submit-btn');
        const answerInput = document.getElementById('answer-input');
        
        if (isLoading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Verificando...';
            answerInput.disabled = true;
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check me-2"></i>Responder';
            answerInput.disabled = false;
        }
    }

    showError(message) {
        // Create a temporary alert
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed';
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 300px;';
        alertDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    async startNewGame() {
        try {
            // Hide any open modals
            const modals = ['resultModal', 'completeModal'];
            modals.forEach(modalId => {
                const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
                if (modal) {
                    modal.hide();
                }
            });

            // Redirect to new game
            window.location.href = '/new_game';
        } catch (error) {
            console.error('Error starting new game:', error);
            this.showError('Erro ao iniciar novo jogo. Recarregue a página.');
        }
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MathGame();
});

// Add some utility functions for enhanced UX
document.addEventListener('DOMContentLoaded', () => {
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Alt + N for new game
        if (e.altKey && e.key === 'n') {
            e.preventDefault();
            document.getElementById('new-game-btn').click();
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal.show');
            if (openModal) {
                const modal = bootstrap.Modal.getInstance(openModal);
                if (modal) {
                    modal.hide();
                }
            }
        }
    });

    // Add touch-friendly interactions for mobile
    const answerInput = document.getElementById('answer-input');
    
    // Auto-focus on touch devices when tapping the question
    document.getElementById('question-text').addEventListener('click', () => {
        answerInput.focus();
    });

    // Improve mobile keyboard experience
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        answerInput.setAttribute('inputmode', 'decimal');
        answerInput.setAttribute('pattern', '[0-9]*');
    }
});
