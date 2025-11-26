# Koodev-Hock

A realistic 3D field hockey penalty shootout game built with Babylon.js, featuring authentic FIH rules, physics-based gameplay, and AI goalkeeper.

## Play Now

Visit: https://bazzingaby.github.io/Koodev-Hock/

## Features

- **Authentic FIH Rules**: 8-second time limit, proper shooting circle dimensions, realistic goal size (3.66m x 2.14m)
- **Realistic Physics**: Havok physics engine with accurate ball mass (160g), turf friction, and shot speeds up to 31 m/s
- **AI Goalkeeper**: Human-like reaction times (200-300ms delay) with multiple save animations
- **Multiple Shot Types**: Drag flick, push shot, and scoop (3D skill)
- **PBR Graphics**: Water-based turf with realistic reflections and stadium lighting
- **Best-of-Five Format**: With sudden death if tied

## Controls

| Action | Key/Mouse |
|--------|----------|
| Move Player | WASD / Arrow Keys |
| Aim Shot | Mouse Movement |
| Charge Shot | Hold Left Mouse Button |
| Release Shot | Release Left Mouse Button |
| Scoop (Lift) | Hold Spacebar while shooting |

## Technical Stack

- **Engine**: Babylon.js 7.x with WebGPU/WebGL2
- **Physics**: Havok Physics (WASM)
- **Build Tool**: Vite
- **Language**: TypeScript
- **Hosting**: GitHub Pages

## Physics Parameters

| Parameter | Value |
|-----------|-------|
| Ball Mass | 0.160 kg |
| Ball Radius | 0.037 m |
| Ball Restitution | 0.6 |
| Turf Friction | 0.25 |
| Max Shot Speed | 31 m/s |

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

## Project Structure

```
Koodev-Hock/
├── src/
│   ├── main.ts           # Entry point
│   ├── game/
│   │   ├── Game.ts       # Main game class
│   │   ├── Ball.ts       # Ball physics
│   │   ├── Player.ts     # Player controller
│   │   ├── Goalkeeper.ts # AI goalkeeper
│   │   └── Stadium.ts    # Environment
│   ├── ui/
│   │   └── UI.ts         # Game UI
│   └── utils/
│       └── Physics.ts    # Physics helpers
├── public/
│   └── assets/           # 3D models, textures
├── index.html
├── vite.config.ts
└── package.json
```

## License

MIT License

## Credits

- Research powered by Google Gemini Deep Research
- Built with Babylon.js and Havok Physics
- FIH Rules reference for authentic gameplay
