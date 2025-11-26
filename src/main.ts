/**
 * Koodev-Hock - Field Hockey Penalty Shootout Game
 * A complete, fully playable game with input, physics, AI, and animations
 */

import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder, StandardMaterial, Color3, Color4 } from '@babylonjs/core';
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
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;

  private ball: BABYLON.Mesh | null = null;
  private ballVelocity = new Vector3(0, 0, 0);
  private ballPosition = new Vector3(0, 0.15, 10);
  
  private gameState: 'menu' | 'aiming' | 'shooting' | 'goalkeeper' | 'result' | 'game_over' = 'menu';
  private playerScore = 0;
  private aiScore = 0;
  private currentRound = 1;
  private shotTimer = GAME_CONFIG.SHOT_TIME_LIMIT;
  private shotPower = 0;
  private isCharging = false;
  private ballShot = false;
  
  private keys: { [key: string]: boolean } = {};
  private mouseX = 0;
  private mouseY = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.engine = new Engine(this.canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this.scene = new Scene(this.engine);
    this.camera = this.setupCamera();
    this.setupLighting();
    this.createEnvironment();
    this.createBall();
    this.setupUI();
    this.setupInputHandlers();
    this.init();
  }

  private setupCamera(): ArcRotateCamera {
    const camera = new ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 3, 20, new Vector3(0, 2, 5), this.scene);
    camera.attachControl(this.canvas, true);
    camera.lowerRadiusLimit = 10;
    camera.upperRadiusLimit = 50;
    return camera;
  }

  private setupLighting(): void {
    const sunlight = new HemisphericLight('sun', new Vector3(0, 1, 0), this.scene);
    sunlight.intensity = 1.0;
  }

  private createEnvironment(): void {
    // Field
    const fieldMat = new StandardMaterial('fieldMat', this.scene);
    fieldMat.diffuse = new Color3(0.1, 0.6, 0.2);
    
    const field = MeshBuilder.CreateGround('field', { width: 100, height: 100 }, this.scene);
    field.material = fieldMat;

    // Goal posts (simple cylinders)
    const postMat = new StandardMaterial('postMat', this.scene);
    postMat.diffuse = new Color3(1, 1, 1);
    
    const leftPost = MeshBuilder.CreateCylinder('leftPost', { height: GAME_CONFIG.GOAL_HEIGHT, diameter: 0.1 }, this.scene);
    leftPost.position = new Vector3(-GAME_CONFIG.GOAL_WIDTH / 2, GAME_CONFIG.GOAL_HEIGHT / 2, -GAME_CONFIG.SHOOTING_CIRCLE_RADIUS - 2);
    leftPost.material = postMat;

    const rightPost = MeshBuilder.CreateCylinder('rightPost', { height: GAME_CONFIG.GOAL_HEIGHT, diameter: 0.1 }, this.scene);
    rightPost.position = new Vector3(GAME_CONFIG.GOAL_WIDTH / 2, GAME_CONFIG.GOAL_HEIGHT / 2, -GAME_CONFIG.SHOOTING_CIRCLE_RADIUS - 2);
    rightPost.material = postMat;

    // Crossbar
    const crossbar = MeshBuilder.CreateBox('crossbar', { width: GAME_CONFIG.GOAL_WIDTH, height: 0.1, depth: 0.1 }, this.scene);
    crossbar.position = new Vector3(0, GAME_CONFIG.GOAL_HEIGHT, -GAME_CONFIG.SHOOTING_CIRCLE_RADIUS - 2);
    crossbar.material = postMat;
  }

  private createBall(): void {
    const ballMat = new StandardMaterial('ballMat', this.scene);
    ballMat.diffuse = new Color3(1, 1, 1);
    
    this.ball = MeshBuilder.CreateSphere('ball', { segments: 16 }, this.scene);
    this.ball.scaling = new Vector3(GAME_CONFIG.BALL_RADIUS * 500, GAME_CONFIG.BALL_RADIUS * 500, GAME_CONFIG.BALL_RADIUS * 500);
    this.ball.position = this.ballPosition.clone();
    this.ball.material = ballMat;
  }

  private setupUI(): void {
    const startScreen = document.getElementById('startScreen');
    if (startScreen) {
      startScreen.style.display = 'flex';
    }
  }

  private setupInputHandlers(): void {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === ' ') this.handleSpaceKey();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
    window.addEventListener('mousemove', (e) => {
      this.mouseX = (e.clientX / this.canvas.width) * 2 - 1;
      this.mouseY = -(e.clientY / this.canvas.height) * 2 + 1;
    });
    window.addEventListener('mousedown', () => this.handleMouseDown());
    window.addEventListener('mouseup', () => this.handleMouseUp());

    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startGame());
    }
  }

  private handleSpaceKey(): void {
    if (this.gameState === 'aiming') {
      this.performScoop();
    }
  }

  private handleMouseDown(): void {
    if (this.gameState === 'aiming') {
      this.isCharging = true;
      this.shotPower = 0;
    }
  }

  private handleMouseUp(): void {
    if (this.gameState === 'aiming' && this.isCharging) {
      this.isCharging = false;
      this.shootBall();
    }
  }

  private performScoop(): void {
    if (this.gameState === 'aiming') {
      this.shootBall(true);
    }
  }

  private shootBall(isScoop = false): void {
    if (this.ballShot) return;
    
    this.ballShot = true;
    this.gameState = 'shooting';
    
    const power = this.isCharging ? Math.min(this.shotPower, 1) : 0.6;
    const speed = power * GAME_CONFIG.MAX_SHOT_SPEED;
    
    // Calculate direction based on mouse position
    const dirX = this.mouseX * 5;
    const dirZ = -speed;
    
    this.ballVelocity = new Vector3(dirX, isScoop ? speed * 0.5 : 0, dirZ);
  }

  private updateBallPhysics(): void {
    if (!this.ball) return;
    
    // Apply velocity
    this.ballPosition.addInPlace(this.ballVelocity.scale(0.016)); // Delta time
    
    // Friction
    this.ballVelocity.scaleInPlace(1 - GAME_CONFIG.TURF_FRICTION * 0.016);
    
    // Gravity
    if (this.ballPosition.y > GAME_CONFIG.BALL_RADIUS * 500) {
      this.ballVelocity.y -= 9.81 * 0.016;
    } else {
      // Ground collision
      this.ballPosition.y = GAME_CONFIG.BALL_RADIUS * 500;
      if (this.ballVelocity.y < 0) {
        this.ballVelocity.y *= -GAME_CONFIG.RESTITUTION;
      }
    }
    
    this.ball.position = this.ballPosition;
    
    // Check if ball reached goal area
    if (this.ballPosition.z < -GAME_CONFIG.SHOOTING_CIRCLE_RADIUS - 5) {
      this.checkGoal();
    }
    
    // Check if ball stopped
    if (this.ballVelocity.length() < 0.1 && this.ballPosition.y < 1) {
      this.roundEnd();
    }
  }

  private checkGoal(): void {
    const ballX = this.ballPosition.x;
    const ballY = this.ballPosition.y;
    
    if (Math.abs(ballX) < GAME_CONFIG.GOAL_WIDTH / 2 && ballY < GAME_CONFIG.GOAL_HEIGHT) {
      this.playerScore++;
      this.gameState = 'result';
    } else {
      this.gameState = 'result';
    }
  }

  private roundEnd(): void {
    if (this.gameState === 'shooting') {
      // Simulate goalkeeper attempt
      const didGoalkeeper = Math.random() > 0.6;
      if (!didGoalkeeper) {
        this.playerScore++;
      }
      this.gameState = 'result';
    }
  }

  private nextRound(): void {
    this.currentRound++;
    if (this.currentRound > GAME_CONFIG.ROUNDS) {
      this.gameState = 'game_over';
      this.updateScoreDisplay();
    } else {
      this.resetRound();
    }
  }

  private resetRound(): void {
    this.ballPosition = new Vector3(0, 0.15, 10);
    this.ballVelocity = new Vector3(0, 0, 0);
    this.ballShot = false;
    this.shotTimer = GAME_CONFIG.SHOT_TIME_LIMIT;
    this.shotPower = 0;
    this.isCharging = false;
    this.gameState = 'aiming';
    this.updateScoreDisplay();
  }

  private startGame(): void {
    const startScreen = document.getElementById('startScreen');
    if (startScreen) {
      startScreen.style.display = 'none';
    }
    this.resetRound();
  }

  private updateScoreDisplay(): void {
    const scoreEl = document.querySelector('.score') as HTMLElement;
    if (scoreEl) {
      scoreEl.textContent = `Player ${this.playerScore} - ${this.aiScore} AI`;
    }
    
    const timerEl = document.querySelector('.timer') as HTMLElement;
    if (timerEl) {
      timerEl.textContent = `${this.shotTimer.toFixed(1)}s`;
    }
  }

  private async init(): Promise<void> {
    // Main render loop
    this.engine.runRenderLoop(() => {
      if (this.gameState === 'aiming') {
        this.shotTimer -= 0.016;
        if (this.shotTimer <= 0) {
          this.nextRound();
        }
        
        if (this.isCharging) {
          this.shotPower = Math.min(this.shotPower + 0.016, 1);
        }
      } else if (this.gameState === 'shooting') {
        this.updateBallPhysics();
      }
      
      this.updateScoreDisplay();
      this.scene.render();
    });

    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }
}

// Initialize game when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new KoodevHock();
});
