# Character Asset Guide

This project uses original retro Korean variety-show sports archetypes. Do not copy broadcast screenshots, official logos, real names, or exact likenesses.

## Required Size

- Frame size: `64 x 64 px`
- Character visual center: around `x=32`, `y=32`
- Feet or ground contact: around `y=56`
- Transparent background: required
- Recommended format: PNG

The current prototype uses generated cute retro placeholder sprites. Final art can replace these with sprite sheets later.

## Current Character Slots

Defined in `src/game/characters.ts`:

- `mc-grasshopper`: MC 메뚜기, 국민 MC형, `타이밍 히트`
- `angry-uncle`: 버럭 아저씨, 버럭 개그형, `분노 스매시`
- `one-ton-tank`: 1톤탱크, 먹방 탱커형, `벽 리시브`
- `chubby-doni`: 뚱뚱한도니, 전략 예능형, `페이크 샷`
- `crazy-yellow-hair`: 미친 노랑머리, 광기 변칙형, `랜덤 바운스`
- `short-uncle`: 키작은 아저씨, 장난꾸러기형, `더블 점프`

## Stats

Each character has five 1-5 star stats:

- `speed`: horizontal movement speed
- `power`: hit strength
- `jump`: jump height
- `defense`: collision and blocking reach
- `trick`: skill style and trajectory disruption

Use `★` for filled stars and `☆` for empty stars in UI copy.

## MVP Controls

The mobile MVP uses a portrait square playfield and four touch buttons:

- `왼쪽`
- `오른쪽`
- `점프`
- one character skill button

Normal hits happen through body or jump collision with the ball. Skills should stay small and deterministic so future P2P can sync by input plus RNG seed.
