# Minuteman

**Week 2 · Theme: Red, White & Boom · Summer Into AI 2026**

A Doom-style FPS running entirely in a single HTML file — no engine, no library, no server required. You play a Continental soldier on July 4th, 1776, defending the colonies against Redcoats and Hessians in torch-lit brick corridors. Your musket takes six manual steps to reload. Yankee Doodle plays on square-wave synth. When the last coat falls, fireworks.

![Gameplay](assets/mm-gameplay.png)
![Corridor](assets/mm-corridor.png)
![Win screen](assets/mm-win.png)

## How it was built

Claude built the entire game through conversation — no runtime AI calls are made. Key systems:

| System | What Claude built |
|--------|-------------------|
| DDA raycaster | Doom-style 3D renderer using `ImageData` + `Uint32Array` pixel buffers |
| Torch lighting | Per-frame 20×20 lightmap with warm orange flicker, sampled per wall column and floor pixel |
| Procedural textures | 64×64 brick, stone, and cobblestone canvases; 1024×256 scrolling sky panorama |
| Musket reload | Six-phase animation (bite → charge → seat → ram → prime → ready) with canvas pivot animations and Web Audio synthesis |
| Enemy AI | Patrol / chase / fire state machine, 32-step line-of-sight ray march, ramrod reload animation, crumple death sequence |
| Yankee Doodle | Full song as `[note, duration]` pairs — square-wave melody, harmony, sine bass, and marching drums via Web Audio API |

## Controls

| Key / Input | Action |
|-------------|--------|
| WASD | Move |
| Mouse | Look (click canvas to capture pointer) |
| Left click | Fire |
| R | Reload |
| Right click | Bayonet charge |
| 1 / 2 | Switch between musket and pistol |
| E | Pick up weapons from fallen enemies |
| ESC | Release mouse |

## Difficulty

Select on the start screen:

| Mode | Waves | Enemy speed | Damage | Player HP |
|------|-------|-------------|--------|-----------|
| Easy | 1 | 60% | 55% | 150 |
| Normal | 2 | 80% | 78% | 100 |
| Hard | 3 + boss | 100% | 100% | 100 |

## Deploy to Vercel

1. Import `GlimmerForge/summer-into-ai` in Vercel
2. Set **Root Directory** to `projects/week-02-red-white-boom/demo-05-minuteman`
3. Set **Framework** to `Other`
4. Deploy — no environment variables needed

## Files

| File | Purpose |
|------|---------|
| `index.html` | The entire game — self-contained, no dependencies |
| `assets/` | Screenshots for README and Substack post |
