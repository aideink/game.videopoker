class VideoPoker {
    constructor() {
        this.credits = 100;
        this.bet = 1;
        this.deck = [];
        this.hand = [];
        this.held = new Set();
        this.gameState = 'betting'; // betting, drawing

        this.initializeElements();
        this.initializeEventListeners();
        this.updateDisplay();
    }

    initializeElements() {
        this.creditsEl = document.getElementById('credits');
        this.betEl = document.getElementById('betAmount');
        this.messageEl = document.getElementById('message');
        this.dealBtn = document.getElementById('dealBtn');
        this.drawBtn = document.getElementById('drawBtn');
        this.cards = document.querySelectorAll('.card');
    }

    initializeEventListeners() {
        document.getElementById('betUp').addEventListener('click', () => this.adjustBet(1));
        document.getElementById('betDown').addEventListener('click', () => this.adjustBet(-1));
        this.dealBtn.addEventListener('click', () => this.deal());
        this.drawBtn.addEventListener('click', () => this.draw());
        
        this.cards.forEach(card => {
            card.addEventListener('click', () => {
                if (this.gameState === 'drawing') {
                    const index = parseInt(card.dataset.index);
                    this.toggleHold(index);
                }
            });
        });
    }

    createDeck() {
        const suits = ['♠', '♣', '♥', '♦'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        this.deck = [];
        
        for (let suit of suits) {
            for (let value of values) {
                this.deck.push({ suit, value });
            }
        }
        
        // Shuffle deck
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }

        // Validate deck
        if (this.deck.length !== 52) {
            console.error('Invalid deck size');
            this.createDeck(); // Recreate deck if invalid
        }
    }

    deal() {
        if (this.credits < this.bet) {
            this.messageEl.textContent = "Not enough credits!";
            return;
        }

        this.credits -= this.bet;
        this.createDeck();
        
        // Flip cards face down first
        this.cards.forEach(card => {
            card.classList.add('flipped');
        });

        // Deal new cards with delay
        setTimeout(() => {
            this.hand = this.deck.splice(0, 5);
            this.held.clear();
            this.gameState = 'drawing';
            this.updateDisplay();
            this.dealBtn.disabled = true;
            this.drawBtn.disabled = false;
        }, 600);
    }

    draw() {
        // Replace non-held cards
        for (let i = 0; i < 5; i++) {
            if (!this.held.has(i)) {
                this.hand[i] = this.deck.pop();
            }
        }

        const result = this.evaluateHand();
        this.credits += result.payout * this.bet;
        
        // Update win amount and add animation
        const winAmountEl = document.getElementById('winAmount');
        if (winAmountEl) {
            winAmountEl.textContent = result.payout * this.bet;
        }
        
        if (result.payout > 0) {
            this.cards.forEach(card => {
                card.classList.add('winning-hand');
                setTimeout(() => card.classList.remove('winning-hand'), 500);
            });
        }
        
        this.messageEl.textContent = `${result.name}!`;
        
        this.gameState = 'betting';
        this.dealBtn.disabled = false;
        this.drawBtn.disabled = true;
        this.held.clear();
        this.updateDisplay();
    }

    toggleHold(index) {
        if (this.held.has(index)) {
            this.held.delete(index);
            this.cards[index].classList.remove('held');
        } else {
            this.held.add(index);
            this.cards[index].classList.add('held');
        }
    }

    adjustBet(amount) {
        if (this.gameState !== 'betting') return;
        
        const newBet = this.bet + amount;
        if (newBet >= 1 && newBet <= 5) {
            this.bet = newBet;
            this.updateDisplay();
        }
    }

    updateDisplay() {
        this.creditsEl.textContent = this.credits;
        this.betEl.textContent = this.bet;

        this.cards.forEach((cardEl, i) => {
            const cardFace = cardEl.querySelector('.card-face');
            if (this.hand[i]) {
                const card = this.hand[i];
                cardEl.classList.remove('flipped');
                cardFace.setAttribute('data-value', card.value);
                
                // Add suit to center
                const suitCenter = cardFace.querySelector('.suit-center') || document.createElement('div');
                suitCenter.className = 'suit-center';
                suitCenter.textContent = card.suit;
                if (!cardFace.querySelector('.suit-center')) {
                    cardFace.appendChild(suitCenter);
                }
                
                cardEl.className = `card ${this.held.has(i) ? 'held' : ''}`;
                cardEl.classList.add(card.suit === '♥' || card.suit === '♦' ? 'red' : 'black');
            } else {
                cardEl.classList.add('flipped');
                cardFace.removeAttribute('data-value');
                const suitCenter = cardFace.querySelector('.suit-center');
                if (suitCenter) {
                    suitCenter.remove();
                }
                cardEl.className = 'card flipped';
            }
        });

        // Update win amount display if it exists
        const winAmountEl = document.getElementById('winAmount');
        if (winAmountEl) {
            winAmountEl.textContent = '0';
        }
    }

    evaluateHand() {
        // Convert hand to numeric values for easier evaluation
        const values = this.hand.map(card => {
            if (card.value === 'A') return 14;
            if (card.value === 'K') return 13;
            if (card.value === 'Q') return 12;
            if (card.value === 'J') return 11;
            return parseInt(card.value);
        });

        const sortedValues = [...values].sort((a, b) => a - b);
        const suits = this.hand.map(card => card.suit);
        const isFlush = new Set(suits).size === 1;
        const isStraight = this.checkStraight(sortedValues);

        // Count value frequencies
        const valueCounts = new Map();
        values.forEach(v => valueCounts.set(v, (valueCounts.get(v) || 0) + 1));
        const frequencies = Array.from(valueCounts.values()).sort((a, b) => b - a);

        // Royal Flush: A, K, Q, J, 10 of the same suit
        if (isFlush && isStraight && sortedValues[0] === 10 && sortedValues[4] === 14) {
            return { name: "Royal Flush", payout: 800 };
        }
        
        // Straight Flush: Five consecutive cards of the same suit
        if (isFlush && isStraight) {
            return { name: "Straight Flush", payout: 50 };
        }

        // Four of a Kind: Four cards of the same value
        if (frequencies[0] === 4) {
            return { name: "Four of a Kind", payout: 25 };
        }

        // Full House: Three of a kind plus a pair
        if (frequencies[0] === 3 && frequencies[1] === 2) {
            return { name: "Full House", payout: 9 };
        }

        // Flush: Any five cards of the same suit
        if (isFlush) {
            return { name: "Flush", payout: 6 };
        }

        // Straight: Five consecutive cards of mixed suits
        if (isStraight) {
            return { name: "Straight", payout: 4 };
        }

        // Three of a Kind: Three cards of the same value
        if (frequencies[0] === 3) {
            return { name: "Three of a Kind", payout: 3 };
        }

        // Two Pair: Two different pairs
        if (frequencies[0] === 2 && frequencies[1] === 2) {
            return { name: "Two Pair", payout: 2 };
        }

        // Jacks or Better: A pair of Jacks, Queens, Kings, or Aces
        if (frequencies[0] === 2) {
            for (const [value, count] of valueCounts) {
                if (count === 2 && value >= 11) {
                    return { name: "Jacks or Better", payout: 1 };
                }
            }
        }

        return { name: "No Win", payout: 0 };
    }

    checkStraight(values) {
        // Check for regular straight
        if (values[4] - values[0] === 4 && new Set(values).size === 5) {
            return true;
        }
        
        // Check for Ace-low straight (A,2,3,4,5)
        if (values[0] === 2 && 
            values[1] === 3 && 
            values[2] === 4 && 
            values[3] === 5 && 
            values[4] === 14) {
            return true;
        }
        
        return false;
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new VideoPoker();
}); 