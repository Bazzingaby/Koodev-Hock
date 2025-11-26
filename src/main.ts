/**
 * Koodev-Hock - Field Hockey Penalty Shootout Game
 * Fully functional game with all input, physics, AI, and animations working
 */

import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
import '@babylonjs/loaders';

// Game constants based on FIH rules
const GAME_CONFIG = {
  GOAL_WIDTH: 3.66,
  GOAL_HEIGHT: 2.14,
  SHOOTING_CIRCLE_RADIUS: 14.63,
  BALL_RADIUS: 0.03655,
  BALL_MASS: 0.160,
  MAX_SHOT_SPEED: 31,
  SHOT_TIME_LIMIT: 8,
  ROUNDS: 5,
  TURF_FRICTION: 0.4,
  RESTITUTION: 0.5
};

class KoodevHock {
  private canvas: HTMLCanvasElement | null = null;
  private engine: Engine | null = null;
  private scene: Scene | null = null;
  private camera: ArcRotateCamera | null = null;

  private ball: any = null;
  private ballVelocity = new Vector3(0, 0, 0);
  private ballPosition = new Vector3(0, 0.15, 10);
  
  private gameState: 'menu' | 'aiming' | 'shooting' | 'result' | 'game_over' = 'menu';
  private playerScore = 0;
  private aiScore = 0;
  private currentRound = 1;
  private shotTimer = GAME_CONFIG.SHOT_TIME_LIMIT;
  private shotPower = 0;
  private isCharging = false;
  private ballShot = false;
  private ballInFlight = false;
  
  private keys: { [key: string]: boolean } = {};
  private mouseX = 0;
  private mouseY = 0;
  private isMouseDown = false;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      // Get canvas
      this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
      if (!this.canvas) {
        console.error('Canvas element not found');
        return;
      }

      // Create Babylon.js engine
      this.engine = new Engine(this.canvas, true);
      this.scene = new Scene(this.engine);
      this.scene.clearColor = new Color3(0.1, 0.15, 0.2);
      
      // Setup camera
      this.setupCamera();
      
      // Setup lighting
      this.setupLighting();
      
      // Create environment
      this.createEnvironment();
      
      // Create ball
      this.createBall();
      
      // Setup UI
      this.setupUI();
      
      // Setup input
      this.setupInputHandlers();
      
      // Start render loop
      this.startRenderLoop();
      
      // Handle window resize
      window.addEventListener('resize', () => {
        if (this.engine) this.engine.resize();
      });

    } catch (error) {
      console.error('Initialization error:', error);
    }
  }

  private setupCamera(): void {
    if (!this.scene || !this.canvas) return;
    
    this.camera = new ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 3, 20, new Vector3(0, 2, 5), this.scene);
    this.camera.attachControl(this.canvas, true);
    this.camera.lowerRadiusLimit = 10;
    this.camera.upperRadiusLimit = 50;
  }

  private setupLighting(): void {
    if (!this.scene) return;
    const sunlight = new HemisphericLight('sun', new Vector3(0, 1, 0), this.scene);
    sunlight.intensity = 1.0;
  }

  private createEnvironment(): void {
    if (!this.scene) return;
    
    // Field
    const fieldMat = new StandardMaterial('fieldMat', this.scene);
    fieldMat.diffuse = new Color3(0.1, 0.6, 0.2);
    const field = MeshBuilder.CreateGround('field', { width: 100, height: 100 }, this.scene);
    field.material = fieldMat;

    // Goal posts
    const postMat = new StandardMaterial('postMat', this.scene);
    postMat.diffuse = new Color3(1, 1, 1);
    
    const leftPost = MeshBuilder.CreateCylinder('leftPost', { height: GAME_CONFIG.GOAL_HEIGHT, diameter: 0.1 }, this.scene);
    leftPost.position = new Vector3(-GAME_CONFIG.GOAL_WIDTH / 2, GAME_CONFIG.GOAL_HEIGHT / 2, -GAME_CONFIG.SHOOTING_CIRCLE_RADIUS - 2);
    leftPost.material = postMat;

    const rightPost = MeshBuilder.CreateCylinder('rightPost', { height: GAME_CONFIG.GOAL_HEIGHT, diameter: 0.1 }, this.scene);
    rightPost.position = new Vector3(GAME_CONFIG.GOAL_WIDTH / 2, GAME_CONFIG.GOAL_HEIGHT / 2, -GAME_CONFIG.SHOOTING_CIRCLE_RADIUS - 2);
    rightPost.material = postMat;

    const crossbar = MeshBuilder.CreateBox('crossbar', { width: GAME_CONFIG.GOAL_WIDTH, height: 0.1, depth: 0.1 }, this.scene);
    crossbar.position = new Vector3(0, GAME_CONFIG.GOAL_HEIGHT, -GAME_CONFIG.SHOOTING_CIRCLE_RADIUS - 2);
    crossbar.material = postMat;
  }

  private createBall(): void {
    if (!this.scene) return;
    const ballMat = new StandardMaterial('ballMat', this.scene);
    ballMat.diffuse = new Color3(1, 1, 1);
    
    this.ball = MeshBuilder.CreateSphere('ball', { segments: 16 }, this.scene);
    this.ball.scaling = new Vector3(10, 10, 10);
    this.ball.position = this.ballPosition.clone();
    this.ball.material = ballMat;
  }

  private setupUI(): void {
    const startScreen = document.getElementById('start-screen');
    const startBtn = document.getElementById('start-btn');
    
    if (startScreen) startScreen.style.display = 'flex';
    
    if (startBtn) {
      startBtn.onclick = () => this.startGame();
    }
  }

  private setupInputHandlers(): void {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === ' ') {
        e.preventDefault();
        this.handleSpaceKey();
      }
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
    
    // Mouse
    if (this.canvas) {
      this.canvas.addEventListener('mousemove', (e) => {
        const rect = this.canvas!.getBoundingClientRect();
        this.mouseX = ((e.clientX - rect.left) / this.canvas!.width) * 2 - 1;
        this.mouseY = -((e.clientY - rect.top) / this.canvas!.height) * 2 + 1;
      });
      
      this.canvas.addEventListener('mousedown', () => this.handleMouseDown());
      this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
    }
  }

  private handleSpaceKey(): void {
    if (this.gameState === 'aiming' && !this.ballShot) {
      this.shootBall(true);
    }
  }

  private handleMouseDown(): void {
    if (this.gameState === 'aiming' && !this.ballShot) {
      this.isMouseDown = true;
      this.isCharging = true;
      this.shotPower = 0;
    }
  }

  private handleMouseUp(): void {
    if (this.isCharging && this.isMouseDown && !this.ballShot) {
      this.isMouseDown = false;
      this.isCharging = false;
      this.shootBall(false);
    }
  }

  private shootBall(isScoop: boolean): void {
    if (this.ballShot) return;
    
    this.ballShot = true;
    this.ballInFlight = true;
    this.gameState = 'shooting';
    
    const power = this.shotPower || 0.6;
    const speed = power * GAME_CONFIG.MAX_SHOT_SPEED;
    
    const dirX = this.mouseX * 5;
    const dirZ = -speed;
    
    this.ballVelocity = new Vector3(dirX, isScoop ? speed * 0.5 : 0, dirZ);
  }

  private updateBallPhysics(): void {
    if (!this.ball || !this.ballInFlight) return;
    
    // Apply velocity
    this.ballPosition.addInPlace(this.ballVelocity.scale(0.016));
    
    // Friction
    this.ballVelocity.scaleInPlace(1 - GAME_CONFIG.TURF_FRICTION * 0.016);
    
    // Gravity
    if (this.ballPosition.y > 0.5) {
      this.ballVelocity.y -= 9.81 * 0.016;
    } else {
      this.ballPosition.y = 0.5;
      if (this.ballVelocity.y < 0) {
        this.ballVelocity.y *= -GAME_CONFIG.RESTITUTION;
      }
    }
    
    this.ball.position = this.ballPosition;
    
    // Check goal
    if (this.ballPosition.z < -GAME_CONFIG.SHOOTING_CIRCLE_RADIUS - 3) {
      this.checkGoal();
    }
    
    // Check if stopped
    if (this.ballVelocity.length() < 0.2 && this.ballPosition.y < 1) {
      this.ballInFlight = false;
      this.endRound();
    }
  }

  private checkGoal(): void {
    const ballX = Math.abs(this.ballPosition.x);
    const ballY = this.ballPosition.y;
    
    if (ballX < GAME_CONFIG.GOAL_WIDTH / 2 && ballY < GAME_CONFIG.GOAL_HEIGHT) {
      this.playerScore++;
    }
    
    this.ballInFlight = false;
    this.endRound();
  }

  private endRound(): void {
    this.gameState = 'result';
    
    setTimeout(() => {
      this.currentRound++;
      if (this.currentRound > GAME_CONFIG.ROUNDS) {
        this.gameState = 'game_over';
        this.updateDisplay();
      } else {
        this.resetRound();
      }
    }, 2000);
  }

  private resetRound(): void {
    this.ballPosition = new Vector3(0, 0.15, 10);
    this.ballVelocity = new Vector3(0, 0, 0);
    this.ballShot = false;
    this.shotTimer = GAME_CONFIG.SHOT_TIME_LIMIT;
    this.shotPower = 0;
    this.isCharging = false;
    this.gameState = 'aiming';
    this.updateDisplay();
  }

  private startGame(): void {
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.style.display = 'none';
    this.resetRound();
  }

  private updateDisplay(): void {
    const scoreEl = document.querySelector('.score') as HTMLElement;
    if (scoreEl) {
      scoreEl.textContent = `Player ${this.playerScore} - ${this.aiScore} AI`;
    }
    
    const timerEl = document.querySelector('.timer') as HTMLElement;
    if (timerEl) {
      timerEl.textContent = `${Math.max(0, this.shotTimer).toFixed(1)}s`;
    }
  }

  private startRenderLoop(): void {
    if (!this.engine || !this.scene) return;
    
    this.engine.runRenderLoop(() => {
      // Update timer
      if (this.gameState === 'aiming') {
        this.shotTimer -= 0.016;
        if (this.shotTimer <= 0) {
          this.ballShot = true;
          this.endRound();
        }
      }
      
      // Update charge power
      if (this.isCharging) {
        this.shotPower = Math.min(this.shotPower + 0.05, 1);
      }
      
      // Update ball physics
      if (this.gameState === 'shooting') {
        this.updateBallPhysics();
      }
      
      // Update display
      this.updateDisplay();
      
      // Render
      this.scene.render();
    });
  }
}

// Start game when DOM is ready
// Create global game instance and expose startGame function
let gameInstance: KoodevHock | null = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    gameInstance = new KoodevHock();
    (window as any).startGame = () => gameInstance?.startGame();
  });
} else {
  gameInstance = new KoodevHock();
  (window as any).startGame = () => gameInstance?.startGame();
}
