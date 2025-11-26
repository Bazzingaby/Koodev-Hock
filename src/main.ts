import {
  Engine, Scene, Vector3, HemisphericLight, MeshBuilder,
  StandardMaterial, Color3, ArcRotateCamera, PhysicsAggregate,
  PhysicsShapeType, HavokPlugin, ActionManager, ExecuteCodeAction,
  Scalar, PointerEventTypes
} from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';

const FIELD_WIDTH = 55;
const FIELD_LENGTH = 91.4;
const GOAL_WIDTH = 3.66;
const GOAL_HEIGHT = 2.14;
const BALL_RADIUS = 0.15;
const TIMEOUT_SECONDS = 8;
const TOTAL_ROUNDS = 5;

interface GameState {
  round: number;
  playerTurn: boolean;
  scores: { home: number; away: number };
  shotTaken: boolean;
  timer: number;
  isGameOver: boolean;
}

class KoodevHock {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene!: Scene;
  private ball!: any;
  private goalie!: any;
  private goalTrigger!: any;
  private ballAggregate!: PhysicsAggregate;
  private goalieAggregate!: PhysicsAggregate;
  private dragStartPoint: Vector3 | null = null;
  private isDragging: boolean = false;
  private power: number = 0;
  private timerInterval: any;
  private state: GameState = {
    round: 1,
    playerTurn: true,
    scores: { home: 0, away: 0 },
    shotTaken: false,
    timer: TIMEOUT_SECONDS,
    isGameOver: false
  };

  constructor() {
    this.canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
    this.engine = new Engine(this.canvas, true);
    this.init().then(() => {
      this.engine.runRenderLoop(() => {
        if (this.scene) {
          this.scene.render();
          this.gameLoop();
        }
      });
    });
    window.addEventListener('resize', () => this.engine.resize());
  }

  async init() {
    const havok = await HavokPhysics();
    this.scene = new Scene(this.engine);
    const plugin = new HavokPlugin(true, havok);
    this.scene.enablePhysics(new Vector3(0, -9.81, 0), plugin);
    new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);
    this.createEnvironment();
    this.createGoal();
    this.createGoalie();
    this.resetBall();
    this.setupInputs();
    this.setupCamera();
    document.getElementById('start-btn')?.addEventListener('click', () => {
      document.getElementById('overlay-screen')?.classList.add('hidden');
      this.startRound();
    });
    this.updateUI();
  }

  setupCamera() {
    const cam = new ArcRotateCamera('cam', -Math.PI/2, Math.PI/3, 15, new Vector3(0, 1, 20), this.scene);
    cam.lowerRadiusLimit = 10;
    cam.upperRadiusLimit = 30;
    cam.attachControl(this.canvas, true);
  }

  createEnvironment() {
    const ground = MeshBuilder.CreateGround('ground', { width: FIELD_WIDTH, height: FIELD_LENGTH }, this.scene);
    const groundMat = new StandardMaterial('groundMat', this.scene);
    groundMat.diffuseColor = new Color3(0.1, 0.4, 0.7);
    ground.material = groundMat;
    new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, friction: 0.8 }, this.scene);
  }

  createGoal() {
    const postMat = new StandardMaterial('postMat', this.scene);
    postMat.diffuseColor = Color3.White();
    const leftPost = MeshBuilder.CreateBox('leftPost', { width: 0.1, height: GOAL_HEIGHT, depth: 0.1 }, this.scene);
    leftPost.position = new Vector3(-GOAL_WIDTH/2, GOAL_HEIGHT/2, 25);
    leftPost.material = postMat;
    const rightPost = MeshBuilder.CreateBox('rightPost', { width: 0.1, height: GOAL_HEIGHT, depth: 0.1 }, this.scene);
    rightPost.position = new Vector3(GOAL_WIDTH/2, GOAL_HEIGHT/2, 25);
    rightPost.material = postMat;
    const topBar = MeshBuilder.CreateBox('topBar', { width: GOAL_WIDTH, height: 0.1, depth: 0.1 }, this.scene);
    topBar.position = new Vector3(0, GOAL_HEIGHT, 25);
    topBar.material = postMat;
    [leftPost, rightPost, topBar].forEach(m => new PhysicsAggregate(m, PhysicsShapeType.BOX, { mass: 0, restitution: 0.5 }, this.scene));
    this.goalTrigger = MeshBuilder.CreateBox('goalTrigger', { width: GOAL_WIDTH-0.2, height: GOAL_HEIGHT-0.1, depth: 0.5 }, this.scene);
    this.goalTrigger.position = new Vector3(0, GOAL_HEIGHT/2, 25.5);
    this.goalTrigger.isVisible = false;
    this.goalTrigger.actionManager = new ActionManager(this.scene);
  }

  createGoalie() {
    this.goalie = MeshBuilder.CreateBox('goalie', { width: 1, height: 1.8, depth: 0.4 }, this.scene);
    this.goalie.position = new Vector3(0, 0.9, 24);
    const mat = new StandardMaterial('goalieMat', this.scene);
    mat.diffuseColor = Color3.Red();
    this.goalie.material = mat;
    this.goalieAggregate = new PhysicsAggregate(this.goalie, PhysicsShapeType.BOX, { mass: 0 }, this.scene);
  }

  resetBall() {
    if (this.ball) this.ball.dispose();
    if (this.ballAggregate) this.ballAggregate.dispose();
    this.ball = MeshBuilder.CreateSphere('ball', { diameter: BALL_RADIUS*2 }, this.scene);
    this.ball.position = new Vector3(0, BALL_RADIUS, 10);
    const mat = new StandardMaterial('ballMat', this.scene);
    mat.diffuseColor = Color3.White();
    this.ball.material = mat;
    this.ballAggregate = new PhysicsAggregate(this.ball, PhysicsShapeType.SPHERE, { mass: 0.16, friction: 0.4, restitution: 0.5 }, this.scene);
    this.goalTrigger.actionManager.registerAction(
      new ExecuteCodeAction(
        { trigger: ActionManager.OnIntersectionEnterTrigger, parameter: this.ball },
        () => this.onGoalScored()
      )
    );
  }

  setupInputs() {
    this.scene.onPointerObservable.add((pointerInfo) => {
      const pickInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
      switch (pointerInfo.type) {
        case PointerEventTypes.POINTERDOWN:
          if (pickInfo?.hit && !this.state.shotTaken) {
            this.dragStartPoint = pickInfo.pickedPoint;
            this.isDragging = true;
            document.getElementById('power-container')!.style.display = 'block';
          }
          break;
        case PointerEventTypes.POINTERMOVE:
          if (this.isDragging && this.dragStartPoint && pickInfo?.pickedPoint) {
            const dist = Vector3.Distance(this.dragStartPoint, pickInfo.pickedPoint);
            this.power = Math.min(dist / 5, 1);
            document.getElementById('power-bar')!.style.width = `${this.power * 100}%`;
          }
          break;
        case PointerEventTypes.POINTERUP:
          if (this.isDragging && this.dragStartPoint && pickInfo?.pickedPoint) {
            this.shoot(this.dragStartPoint, pickInfo.pickedPoint);
          }
          this.isDragging = false;
          this.dragStartPoint = null;
          document.getElementById('power-container')!.style.display = 'none';
          break;
      }
    });
  }

  shoot(start: Vector3, end: Vector3) {
    if (this.state.shotTaken) return;
    this.state.shotTaken = true;
    
    // Hide instructions after shooting
    const shootHint = document.getElementById('shoot-hint');
    const gameInstructions = document.getElementById('game-instructions');
    if (shootHint) shootHint.style.display = 'none';
    if (gameInstructions) gameInstructions.style.display = 'none';
    
    const direction = start.subtract(end).normalize();
    if (direction.z < 0) direction.z *= -1;
    const lift = this.power * 0.5;
    const force = 5 + (this.power * 15);
    const impulse = new Vector3(direction.x, lift, direction.z).scale(force);
    this.ballAggregate.body.applyImpulse(impulse, this.ball.getAbsolutePosition());
  }

  startRound() {
    this.resetBall();
    this.state.shotTaken = false;
    this.state.timer = TIMEOUT_SECONDS;
    this.goalie.position.x = 0;
    
    // Show instructions at start of round
    const shootHint = document.getElementById('shoot-hint');
    const gameInstructions = document.getElementById('game-instructions');
    if (shootHint) shootHint.style.display = 'block';
    if (gameInstructions) gameInstructions.style.display = 'block';
    
    // Hide any previous message
    const messageBox = document.getElementById('message-box');
    if (messageBox) messageBox.style.display = 'none';
    
    this.updateUI();
    this.timerInterval = setInterval(() => {
      this.state.timer--;
      document.getElementById('timer')!.innerText = this.state.timer.toString();
      if (this.state.timer <= 0) {
        this.endRound('MISS');
      }
    }, 1000);
  }

  onGoalScored() {
    clearInterval(this.timerInterval);
    if (this.state.isGameOver) return;
    this.state.scores.home++;
    this.updateUI();
    setTimeout(() => {
      this.state.round++;
      if (this.state.round > TOTAL_ROUNDS) {
        this.state.isGameOver = true;
        alert(`Game Over! Score: ${this.state.scores.home} - ${this.state.scores.away}`);
        location.reload();
      } else {
        this.startRound();
      }
    }, 2000);
  }

  endRound(result: 'GOAL' | 'MISS') {
    clearInterval(this.timerInterval);
    if (this.state.isGameOver) return;
    
    // Show result message
    const messageBox = document.getElementById('message-box');
    const messageText = document.getElementById('message-text');
    if (messageBox && messageText) {
      messageText.innerText = result;
      messageBox.style.display = 'block';
      messageBox.className = result === 'GOAL' ? 'goal' : 'miss';
    }
    
    if (result === 'GOAL') this.state.scores.home++;
    this.updateUI();
    setTimeout(() => {
      this.state.round++;
      if (this.state.round > TOTAL_ROUNDS) {
        this.state.isGameOver = true;
        alert(`Game Over! Score: ${this.state.scores.home} - ${this.state.scores.away}`);
        location.reload();
      } else {
        this.startRound();
      }
    }, 2000);
  }

  gameLoop() {
    if (!this.state.shotTaken) return;
    const ballVel = this.ballAggregate.body.getLinearVelocity();
    if (ballVel.length() < 0.1 && this.state.timer < TIMEOUT_SECONDS - 1) {
      this.endRound('MISS');
    }
    const targetX = Scalar.Lerp(this.goalie.position.x, this.ball.position.x * 0.7, 0.02);
    this.goalie.position.x = Scalar.Clamp(targetX, -GOAL_WIDTH/2+0.5, GOAL_WIDTH/2-0.5);
    this.goalieAggregate.body.setTargetTransform(this.goalie.position, this.goalie.rotationQuaternion!);
  }

  updateUI() {
    document.getElementById('score-home')!.innerText = this.state.scores.home.toString();
    document.getElementById('score-away')!.innerText = this.state.scores.away.toString();
    const dots = document.getElementById('round-indicators');
    if (dots) {
      dots.innerHTML = '';
      for (let i = 1; i <= TOTAL_ROUNDS; i++) {
        const dot = document.createElement('div');
        dot.className = `dot ${i === this.state.round ? 'active' : ''}`;
        dots.appendChild(dot);
      }
    }
  }
}

(window as any).startGame = () => {
  document.getElementById('overlay-screen')?.classList.add('hidden');
};

new KoodevHock();
