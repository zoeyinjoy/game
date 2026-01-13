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

/**
 * gameEngine.js
 * Fruit Catcher Logic - Strictly following GAME_RULE.md
 * 
 * Rules:
 * - 3 Lanes: Left, Center, Right
 * - Player moves Basket 🧺 based on Pose
 * - Items fall: Apple 🍎 (+100), Grape 🍇 (+300), Golden Apple 🍏 (+1000, SpeedUp, CoinFX), Bomb 💣 (Game Over)
 * - Game Over: Time 0 or Bomb Hit
 */

class GameEngine {
  constructor() {
    this.ctx = null;
    this.score = 0;
    this.level = 1;
    this.timeLimit = 60;
    this.life = 1; // 1 Life because bomb is instant kill
    this.isGameActive = false;
    this.gameOver = false;

    // Game State
    this.items = []; // {x, y, type, speed, lane}
    this.particles = []; // {x, y, vx, vy, life, color, label}
    this.playerLane = 1; // 0:Left, 1:Center, 2:Right
    this.spawnTimer = 0;
    this.spawnInterval = 60;
    this.speedMultiplier = 1.0; // Increases on Golden Apple

    // Constants - Canvas Size Increased to 600x600
    this.CANVAS_WIDTH = 600;
    this.CANVAS_HEIGHT = 600;
    this.LANE_WIDTH = 600 / 3; // 200
    // Centers: 100, 300, 500
    this.LANE_CENTERS = [100, 300, 500];

    this.ITEM_TYPES = [
      { id: 'apple', label: '🍎', score: 100, baseSpeed: 3, isBomb: false },
      { id: 'grape', label: '🍇', score: 300, baseSpeed: 5, isBomb: false },
      { id: 'golden', label: '🍏', score: 1000, baseSpeed: 7, isBomb: false, isSpecial: true },
      { id: 'bomb', label: '💣', score: 0, baseSpeed: 4, isBomb: true }
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
    this.life = 1;
    this.timeLimit = 60;
    this.items = [];
    this.particles = [];
    this.playerLane = 1;
    this.spawnInterval = 60;
    this.spawnTimer = 0;
    this.speedMultiplier = 1.0;

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
    // Add Keyboard Listener
    this.handleKeydown = (e) => {
      // Debugging log
      const debugDiv = document.getElementById("debug-log");
      if (debugDiv) debugDiv.innerText = `Key: ${e.key} | Active: ${this.isGameActive}`;

      if (!this.isGameActive || this.gameOver) return;

      // Activate Keyboard Override (3 seconds = 180 frames)
      this.keyboardOverrideTimer = 180;

      if (e.key === "ArrowLeft") {
        // Move Left (Relative)
        this.playerLane = Math.max(0, this.playerLane - 1);
        e.preventDefault();
      } else if (e.key === "ArrowRight") {
        // Move Right (Relative)
        this.playerLane = Math.min(2, this.playerLane + 1);
        e.preventDefault();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        // Optional: Center? Or just ignore? 
        // Let's keep it as "Center" shortcut for convenience
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
    // Spawn faster as multiplier increases
    if (this.spawnTimer > (this.spawnInterval / Math.max(1, this.speedMultiplier * 0.5))) {
      this.spawnItem();
      this.spawnTimer = 0;
      // Increase difficulty cap
      if (this.spawnInterval > 20) this.spawnInterval -= 0.1;
    }

    // 2. Move Items
    const basketYTop = 500; // Basket Capture Area Top
    const basketYBottom = 580; // Basket Capture Area Bottom (Canvas 600)

    for (let i = this.items.length - 1; i >= 0; i--) {
      let item = this.items[i];
      item.y += item.speed * this.speedMultiplier;

      // 3. Collision Detection
      if (item.y > basketYTop && item.y < basketYBottom) {
        // Check horizontal lane
        if (item.lane === this.playerLane) {
          this.handleCollision(item);
          this.items.splice(i, 1); // Remove item
          continue;
        }
      }

      // 4. Remove if out of screen
      if (item.y > this.CANVAS_HEIGHT + 50) {
        this.items.splice(i, 1);
      }
    }

    // 5. Update Particles
    this.updateParticles();
  }

  spawnItem() {
    const lane = Math.floor(Math.random() * 3); // 0, 1, 2

    // Logic: 
    // 45% Apple
    // 25% Grape
    // 20% Bomb
    // 10% Golden Apple
    const r = Math.random();
    let type = this.ITEM_TYPES[0]; // Apple

    if (r > 0.9) type = this.ITEM_TYPES[2]; // Golden Apple
    else if (r > 0.7) type = this.ITEM_TYPES[3]; // Bomb
    else if (r > 0.45) type = this.ITEM_TYPES[1]; // Grape

    this.items.push({
      x: this.LANE_CENTERS[lane],
      y: -50,
      lane: lane,
      speed: type.baseSpeed, // Assign base speed
      ...type // Copy props
    });
  }

  handleCollision(item) {
    if (item.isBomb) {
      console.log("Bomb hit! Game Over.");
      this.triggerGameOver();
    } else {
      this.score += item.score;

      if (item.isSpecial) { // Golden Apple
        // 1. Speed Up
        this.speedMultiplier *= 1.2; // 20% faster
        console.log("Golden Apple! Speed Up:", this.speedMultiplier);

        // 2. Bonus Time (Optional, rule didn't say, but nice to have? maybe not according to strict rule)
        // Rule said: "score 1000, speed up, coin explosion"

        // 3. Coin Explosion
        this.createCoinExplosion(item.x, item.y);
      }
    }
  }

  // --- Particle/Visual Effects ---

  createCoinExplosion(x, y) {
    // Create 10-15 coins
    const count = 15;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 1) * 10 - 5, // Upward burst
        gravity: 0.5,
        life: 60, // frames
        label: '🪙'
      });
    }
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      let p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life--;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  drawParticles(ctx) {
    ctx.font = "20px Arial";
    for (let p of this.particles) {
      ctx.globalAlpha = p.life / 60;
      ctx.fillText(p.label, p.x, p.y);
    }
    ctx.globalAlpha = 1.0;
  }


  /**
   * Draw Rendering (Called every frame from main.js)
   * @param {CanvasRenderingContext2D} ctx 
   */
  draw(ctx) {
    if (!this.isGameActive && !this.gameOver) return;

    ctx.save();

    // Resize Note: Main.js creates a 600x600 canvas now.

    // Draw Lane dividers
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 4; // Thicker lines for bigger screen
    ctx.beginPath();
    ctx.moveTo(this.LANE_WIDTH, 0); ctx.lineTo(this.LANE_WIDTH, 600);
    ctx.moveTo(this.LANE_WIDTH * 2, 0); ctx.lineTo(this.LANE_WIDTH * 2, 600);
    ctx.stroke();

    // Draw Player Basket
    const basketX = this.LANE_CENTERS[this.playerLane];
    ctx.font = "80px Arial"; // Bigger basket
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Place near bottom. Canvas H=600.
    ctx.fillText("🧺", basketX, 550);

    // Draw Items
    ctx.font = "60px Arial"; // Bigger fruits
    for (let item of this.items) {
      ctx.fillText(item.label, item.x, item.y);
    }

    // Draw Particles
    this.drawParticles(ctx);

    // Draw HUD
    // Background bar
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, 600, 60); // Taller HUD

    // Text
    ctx.fillStyle = "white";
    ctx.font = "30px sans-serif";
    ctx.textBaseline = "middle";

    ctx.textAlign = "left";
    ctx.fillText(`Score: ${this.score}`, 20, 30);

    ctx.textAlign = "center";
    ctx.fillText(`Time: ${this.timeLimit}`, 300, 30);

    // Actually, Life is irrelevant now since bomb is instant death, but let's keep it just in case
    // Or maybe just show "Speed"
    ctx.textAlign = "right";
    ctx.fillText(`Spd: x${this.speedMultiplier.toFixed(1)}`, 580, 30);

    // Draw Game Over Overlay
    if (this.gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.fillRect(0, 0, 600, 600);

      ctx.fillStyle = "red";
      ctx.shadowColor = "black";
      ctx.shadowBlur = 10;
      ctx.font = "bold 60px Arial";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", 300, 250);

      ctx.fillStyle = "white";
      ctx.font = "40px Arial";
      ctx.fillText(`Final Score: ${this.score}`, 300, 330);
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
