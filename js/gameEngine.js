/**
 * gameEngine.js
 * Fruit Catcher Logic - Strictly following GAME_RULE.md
 * 
 * Rules:
 * - 3 Lanes: Left, Center, Right
 * - Player moves Basket 🧺 based on Pose
 * - Items fall: Apple 🍎 (+100), Grape 🍇 (+300), Bomb 💣 (-Life)
 * - Game Over: Time 0 or Life 0
 */

class GameEngine {
  constructor() {
    this.ctx = null;
    this.score = 0;
    this.level = 1;
    this.timeLimit = 60;
    this.life = 3;
    this.isGameActive = false;
    this.gameOver = false;

    // Game State
    this.items = []; // {x, y, type, speed, lane}
    this.playerLane = 1; // 0:Left, 1:Center, 2:Right
    this.spawnTimer = 0;
    this.spawnInterval = 60;

    // Constants
    this.CANVAS_WIDTH = 200;
    this.CANVAS_HEIGHT = 200;
    this.LANE_WIDTH = 200 / 3;
    // Centers: approx 33, 100, 166
    this.LANE_CENTERS = [33, 100, 166];

    this.ITEM_TYPES = [
      { id: 'apple', label: '🍎', score: 100, speed: 2, isBomb: false },
      { id: 'grape', label: '🍇', score: 300, speed: 4, isBomb: false },
      { id: 'bomb', label: '💣', score: 0, speed: 3, isBomb: true }
    ];

    // Callbacks
    this.onScoreChange = null;
    this.onGameEnd = null;

    this.timerInterval = null;
    this.keyboardOverrideTimer = 0; // Frames to ignore pose after key press
  }

  /**
   * Start Game
   */
  start(config = {}) {
    this.isGameActive = true;
    this.gameOver = false;
    this.score = 0;
    this.life = 3;
    this.timeLimit = 60;
    this.items = [];
    this.playerLane = 1;
    this.spawnInterval = 60;
    this.spawnTimer = 0;

    // Clear previous timer if any
    if (this.timerInterval) clearInterval(this.timerInterval);

    // Start Timer (1 second decrement)
    this.timerInterval = setInterval(() => {
      if (this.isGameActive && !this.gameOver) {
        this.timeLimit--;
        if (this.timeLimit <= 0) {
          this.triggerGameOver();
        }
      }
    }, 1000);

    console.log("Game Started! Lane centers:", this.LANE_CENTERS);

    // Add Keyboard Listener
    this.handleKeydown = (e) => {
      // Debugging log
      console.log("Key pressed:", e.key, "| Active:", this.isGameActive, "| GameOver:", this.gameOver);

      if (!this.isGameActive || this.gameOver) return;

      if (e.key === "ArrowLeft") {
        this.playerLane = 0;
        e.preventDefault();
      } else if (e.key === "ArrowRight") {
        this.playerLane = 2;
        e.preventDefault();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        this.playerLane = 1;
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", this.handleKeydown);
  }

  /**
   * Stop Game
   */
  stop() {
    this.isGameActive = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.handleKeydown) {
      window.removeEventListener("keydown", this.handleKeydown);
      this.handleKeydown = null;
    }
  }

  triggerGameOver() {
    this.gameOver = true;
    this.isGameActive = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
    setTimeout(() => alert(`GAME OVER\nFinal Score: ${this.score}`), 100);
  }

  /**
   * Update Game Logic (Called every frame from main.js)
   */
  update() {
    if (!this.isGameActive || this.gameOver) return;

    if (this.keyboardOverrideTimer > 0) this.keyboardOverrideTimer--;

    // 1. Spawning
    this.spawnTimer++;
    if (this.spawnTimer > this.spawnInterval) {
      this.spawnItem();
      this.spawnTimer = 0;
      // Increase difficulty
      if (this.spawnInterval > 20) this.spawnInterval -= 0.5;
    }

    // 2. Move Items
    for (let i = this.items.length - 1; i >= 0; i--) {
      let item = this.items[i];
      item.y += item.speed;

      // 3. Collision Detection
      // Basket Y is around 170-190. Item center is item.y.
      // Check if item is within vertical range of basket
      if (item.y > 170 && item.y < 200) {
        // Check horizontal lane
        if (item.lane === this.playerLane) {
          this.handleCollision(item);
          this.items.splice(i, 1); // Remove item
          continue;
        }
      }

      // 4. Remove if out of screen
      if (item.y > 210) {
        this.items.splice(i, 1);
      }
    }
  }

  spawnItem() {
    const lane = Math.floor(Math.random() * 3); // 0, 1, 2

    // Logic: 50% Apple, 30% Bomb, 20% Grape
    const r = Math.random();
    let type = this.ITEM_TYPES[0]; // Apple
    if (r > 0.8) type = this.ITEM_TYPES[1]; // Grape
    else if (r > 0.5) type = this.ITEM_TYPES[2]; // Bomb

    this.items.push({
      x: this.LANE_CENTERS[lane],
      y: -20,
      lane: lane,
      ...type
    });
  }

  handleCollision(item) {
    if (item.isBomb) {
      this.life--;
      console.log("Bomb hit! Life:", this.life);
      if (this.life <= 0) {
        this.triggerGameOver();
      }
    } else {
      this.score += item.score;
      // console.log("Fruit collected! Score:", this.score);
    }
  }

  /**
   * Draw Rendering (Called every frame from main.js)
   * @param {CanvasRenderingContext2D} ctx 
   */
  draw(ctx) {
    if (!this.isGameActive && !this.gameOver) return;

    ctx.save();

    // Draw Lane dividers
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.LANE_WIDTH, 0); ctx.lineTo(this.LANE_WIDTH, 200);
    ctx.moveTo(this.LANE_WIDTH * 2, 0); ctx.lineTo(this.LANE_WIDTH * 2, 200);
    ctx.stroke();

    // Draw Player Basket
    const basketX = this.LANE_CENTERS[this.playerLane];
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🧺", basketX, 185);

    // Draw Items
    ctx.font = "24px Arial";
    for (let item of this.items) {
      ctx.fillText(item.label, item.x, item.y);
    }

    // Draw HUD
    // Background bar
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, 200, 30);

    // Text
    ctx.fillStyle = "white";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Sc: ${this.score}`, 5, 20);

    ctx.textAlign = "center";
    ctx.fillText(`Time: ${this.timeLimit}`, 100, 20);

    ctx.textAlign = "right";
    ctx.fillText(`Life: ${this.life}`, 195, 20);

    // Draw Game Over Overlay
    if (this.gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = "red";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", 100, 80);
      ctx.fillStyle = "white";
      ctx.font = "16px Arial";
      ctx.fillText(`Score: ${this.score}`, 100, 110);
    }

    ctx.restore();
  }

  /**
   * Handle Pose Detection input
   * @param {string} className "Left", "Right", "Center"
   */
  onPoseDetected(className) {
    if (this.gameOver) return;
    if (this.keyboardOverrideTimer > 0) return; // Ignore pose if keyboard used recently

    if (className === "Left") this.playerLane = 0;
    else if (className === "Center") this.playerLane = 1;
    else if (className === "Right") this.playerLane = 2;
  }

  // Callbacks setters (optional use)
  setScoreChangeCallback(cb) { this.onScoreChange = cb; }
  setGameEndCallback(cb) { this.onGameEnd = cb; }
}

// Global Export
window.GameEngine = GameEngine;
