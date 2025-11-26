/**
 * Koodev-Hock - Field Hockey Penalty Shootout Game
 * Main entry point
 */

import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder, StandardMaterial, Color3, Color4 } from '@babylonjs/core';
import '@babylonjs/loaders';

// Game constants based on FIH rules
const GAME_CONFIG = {
  // Field dimensions (in meters, scaled for game)
  GOAL_WIDTH: 3.66,
  GOAL_HEIGHT: 2.14,
  SHOOTING_CIRCLE_RADIUS: 14.63,
  
  // Ball properties
  BALL_RADIUS: 0.0365, // 73mm diameter
  BALL_MASS: 0.160, // 160 grams
  MAX_SHOT_SPEED: 31, // m/s (world record ~112 km/h)
  
  // Game rules
  SHOT_TIME_LIMIT: 8, // seconds per attempt
  ROUNDS: 5,
  
  // Physics
  TURF_FRICTION: 0.4,
  RESTITUTION: 0.5
};

class KoodevHock {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  
  // Game state
  private playerScore: number = 0;
  private aiScore: number = 0;
  private currentRound: number = 1;
  private isPlayerTurn: boolean = true;
  private shotTimer: number = GAME_CONFIG.SHOT_TIME_LIMIT;
  private gameState: 'menu' | 'playing' | 'aiming' | 'shooting' | 'result' = 'menu';

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.engine = new Engine(this.canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this.scene = new Scene(this.engine);
    this.camera = this.setupCamera();
    
    this.init();
  }

  private async init(): Promise<void> {
    // Set sky color
    this.scene.clearColor = new Color4(0.5, 0.7, 0.9, 1);
    
    // Setup lighting
    this.setupLighting();
    
    // Create playing field
    this.createField();
    
    // Create goal
    this.createGoal();
    
    // Create ball
    this.createBall();
    
    // Setup UI
    this.setupUI();
    
    // Start render loop
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.engine.resize();
    });
    
    // Show start screen
    this.showStartScreen();
  }

  private setupCamera(): ArcRotateCamera {
    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 3,
      20,
      new Vector3(0, 0, 5),
      this.scene
    );
    camera.attachControl(this.canvas, true);
    camera.lowerRadiusLimit = 10;
    camera.upperRadiusLimit = 30;
    return camera;
  }

  private setupLighting(): void {
    // Main sunlight
    const sunLight = new HemisphericLight('sun', new Vector3(0, 1, 0), this.scene);
    sunLight.intensity = 1.0;
    sunLight.diffuse = new Color3(1, 0.95, 0.9);
    sunLight.groundColor = new Color3(0.2, 0.4, 0.2);
  }

  private createField(): void {
    // Create the turf
    const field = MeshBuilder.CreateGround('field', {
      width: 30,
      height: 25
    }, this.scene);
    
    const fieldMaterial = new StandardMaterial('fieldMat', this.scene);
    fieldMaterial.diffuseColor = new Color3(0.1, 0.5, 0.2); // Green turf
    fieldMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
    field.material = fieldMaterial;
    
    // Create shooting circle (D-shape representation)
    this.createShootingCircle();
  }
  
  private createShootingCircle(): void {
    // Create a disc to represent the shooting circle
    const circle = MeshBuilder.CreateDisc('shootingCircle', {
      radius: GAME_CONFIG.SHOOTING_CIRCLE_RADIUS / 2, // Scaled
      tessellation: 64
    }, this.scene);
    circle.rotation.x = Math.PI / 2;
    circle.position.y = 0.01; // Slightly above field
    
    const circleMat = new StandardMaterial('circleMat', this.scene);
    circleMat.diffuseColor = new Color3(0.15, 0.55, 0.25);
    circleMat.alpha = 0.5;
    circle.material = circleMat;
  }

  private createGoal(): void {
    const goalWidth = GAME_CONFIG.GOAL_WIDTH;
    const goalHeight = GAME_CONFIG.GOAL_HEIGHT;
    const postRadius = 0.05;
    
    // Left post
    const leftPost = MeshBuilder.CreateCylinder('leftPost', {
      height: goalHeight,
      diameter: postRadius * 2
    }, this.scene);
    leftPost.position = new Vector3(-goalWidth / 2, goalHeight / 2, 0);
    
    // Right post  
    const rightPost = MeshBuilder.CreateCylinder('rightPost', {
      height: goalHeight,
      diameter: postRadius * 2
    }, this.scene);
    rightPost.position = new Vector3(goalWidth / 2, goalHeight / 2, 0);
    
    // Crossbar
    const crossbar = MeshBuilder.CreateCylinder('crossbar', {
      height: goalWidth,
      diameter: postRadius * 2
    }, this.scene);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position = new Vector3(0, goalHeight, 0);
    
    // Goal material (white posts)
    const goalMat = new StandardMaterial('goalMat', this.scene);
    goalMat.diffuseColor = new Color3(1, 1, 1);
    leftPost.material = goalMat;
    rightPost.material = goalMat;
    crossbar.material = goalMat;
    
    // Net (simple back plane)
    const net = MeshBuilder.CreatePlane('net', {
      width: goalWidth,
      height: goalHeight
    }, this.scene);
    net.position = new Vector3(0, goalHeight / 2, -0.5);
    
    const netMat = new StandardMaterial('netMat', this.scene);
    netMat.diffuseColor = new Color3(0.9, 0.9, 0.9);
    netMat.alpha = 0.3;
    net.material = netMat;
  }

  private createBall(): void {
    const ball = MeshBuilder.CreateSphere('ball', {
      diameter: GAME_CONFIG.BALL_RADIUS * 20 // Scaled for visibility
    }, this.scene);
    ball.position = new Vector3(0, GAME_CONFIG.BALL_RADIUS * 10, 10);
    
    const ballMat = new StandardMaterial('ballMat', this.scene);
    ballMat.diffuseColor = new Color3(1, 1, 1); // White ball
    ball.material = ballMat;
  }

  private setupUI(): void {
    this.updateScoreDisplay();
    this.updateTimerDisplay();
  }
  
  private updateScoreDisplay(): void {
    const scoreEl = document.getElementById('score');
    if (scoreEl) {
      scoreEl.textContent = `Player ${this.playerScore} - ${this.aiScore} AI`;
    }
  }
  
  private updateTimerDisplay(): void {
    const timerEl = document.getElementById('timer');
    if (timerEl) {
      timerEl.textContent = `${this.shotTimer.toFixed(1)}s`;
    }
  }
  
  private showStartScreen(): void {
    const startScreen = document.getElementById('startScreen');
    if (startScreen) {
      startScreen.style.display = 'flex';
    }
  }
  
  public startGame(): void {
    const startScreen = document.getElementById('startScreen');
    if (startScreen) {
      startScreen.style.display = 'none';
    }
    this.gameState = 'aiming';
    this.currentRound = 1;
    this.playerScore = 0;
    this.aiScore = 0;
    this.updateScoreDisplay();
  }
}

// Initialize game when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  const game = new KoodevHock();
  
  // Expose start function to button
  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    startBtn.addEventListener('click', () => game.startGame());
  }
});
