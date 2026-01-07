# RibaRun - AI Coding Instructions

## Project Overview
**RibaRun** is an educational HTML5 canvas game that teaches Islamic financial principles through gameplay. Players navigate a character through an inflation-survival runner while avoiding Riba (interest-based debt) and learning about ethical finance concepts like Sadaqah, Zakat, and Kestrl cards.

## Architecture

### Two-File Structure
- **[index.html](../index.html)** - Original prototype with simple gameplay loop
- **[sharminribarun.html](../sharminribarun.html)** - Enhanced version with cutscene system, world map, and advanced mechanics

The codebase is **self-contained HTML files** - all CSS, JavaScript, and game logic embedded inline. No build tools, frameworks, or external dependencies beyond image/audio assets.

## Core Game Mechanics

### The "GOD PANEL" Pattern
Both files use a centralized constants section at the top of `<script>` called "THE GOD PANEL" (in index.html) or discrete constants sections (in sharminribarun.html). **All game balance tuning happens here**:

```javascript
// index.html pattern
let gameSpeed = 7;           
const MAX_SPEED = 19;        
const ACCELERATION = 0.005;  
let liquidity = 100.00;      
let burnRate = 6;            
const INFLATION_MULT = 0.0008;
```

```javascript
// sharminribarun.html pattern
const START_LIQUIDITY = 50;
const KESTRL_DURATION = 10.0;
const SADAQAH_COST = 40;
const MONSTER_GAIN_PER_SEC = 0.9;
```

**Rule**: Never hardcode magic numbers in game logic - always reference constants from the top.

### Dual Economy System
1. **Liquidity** - Active cash that drains over time (inflation mechanic)
2. **Savings** - Protected reserve accessed by pressing 'S' key

Players must balance risk (collecting coins) vs. security (depositing to savings).

### Input Lag System
**Critical mechanic**: Loans introduce input delay to simulate economic burden.

```javascript
// index.html: Queue-based delay
inputQueue.push({
    key: e.key,
    executeTime: Date.now() + delay
});

// sharminribarun.html: Timer-based delay
this.pendingLane = targetLane;
this.laneApplyTimerSec = lag;
```

**When modifying controls**: Test with `ribaMode = true` to verify lag behavior doesn't break.

### Power-up State Management
Three main power-ups follow a lifecycle pattern:

1. **Kestrl Card** (Shield) - Simple countdown timer
   ```javascript
   kestrlFrames > 0  // Active state check
   kestrlFrames--;   // Decrement each frame
   ```

2. **Sadaqah Box** (Magnet) - Three-phase state machine:
   - `magnetCharging` - 2-second delay
   - `magnetActive` + `magnetCap` - Active with ROI cap
   - Off state when cap reaches zero

3. **Riba Monster** (Pressure) - Distance-based threat that advances when in debt

**Pattern**: Visual effects (glow, bars) tied directly to timer values, not separate flags.

## Visual Effects Architecture

### Camera Transform Stack
Effects apply in order via `ctx.save()` / `ctx.restore()`:

```javascript
ctx.save();           // 1. Save clean state
// Apply shake
// Apply drunk wobble  
// Apply blur
drawBackground();     // 2. Draw world (affected)
drawCoins();
ctx.restore();        // 3. Reset to clean state
drawUI();             // 4. Draw UI (unaffected)
```

**Critical**: Always pair `ctx.save()` with `ctx.restore()` or transforms accumulate.

### Obstacle "Ghost" Effect
When Kestrl shield is active, obstacles render at 20% opacity:

```javascript
if (kestrlFrames > 0 && this.type >= 2) {
    ctx.save();
    ctx.globalAlpha = 0.2;
}
// ... draw obstacle ...
ctx.restore();
```

**Pattern**: Use `ctx.globalAlpha` for power-up feedback, not hidden collision flags.

## Spawning Systems

### Formation-Based Spawning (index.html)
Obstacles spawn in pre-designed patterns called "FORMATIONS":

```javascript
const FORMATIONS = [
    { rows: [[1, 0, 1], [0, 1, 0]] },  // Shotgun
    { rows: [[1, 1, 1], [0, 0, 0]] },  // Guillotine
];
```

Each `1` spawns a coin/obstacle at that position. Patterns cycle with `patternColIndex`.

### Accumulator-Based Spawning (sharminribarun.html)
Continuous spawn rate adjusted by inflation phase:

```javascript
this.coinSpawnAcc += dt * COINS_PER_SEC_BASE * ph.speedMult;
if (this.coinSpawnAcc >= 1.0) {
    spawnCoin();
    this.coinSpawnAcc -= 1.0;
}
```

**When balancing**: Adjust `COINS_PER_SEC_BASE` for density, `CHAOS_CHANCE` for obstacle ratio.

## Inflation Progression

**sharminribarun.html** uses phase-based difficulty scaling:

```javascript
function inflationPhase(elapsedSec) {
    if (elapsedSec < 30) return { speedMult: 1.0, burnPerSec: 5 };
    if (elapsedSec < 60) return { speedMult: 1.2, burnPerSec: 7 };
    // ... escalates to speedMult: 1.8, burnPerSec: 22
}
```

This affects: game speed, coin spawn rate, and burn rate simultaneously. **Don't adjust one without considering others**.

## Multi-Screen Flow (sharminribarun.html)

Three screens managed by toggling `.active` class:
1. **Cutscene Screen** - Video intro with skip option
2. **Map Screen** - City selector (7 routes, some locked)
3. **Game Screen** - Actual gameplay canvas

```javascript
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}
```

**Pattern**: Use `screen.classList.contains('active')` to gate input handlers.

## Asset Management

### External Assets Referenced
- Images: `normal kestrl.png`, `background.png`, `kestrlmanframes.png`, `ribamonster.png`, coin/obstacle sprites
- Audio: `inflation ribba entropy.m4a`, `voiceover.m4a` (in [trailer/](../trailer/) folder)
- Video: `cutscene.mp4` (referenced but may be local)

**Fallback Pattern**: All image loads check `.complete` before drawing:

```javascript
if (heroImg.complete && heroImg.naturalWidth) {
    ctx.drawImage(heroImg, ...);
} else {
    // Draw colored rectangle placeholder
}
```

**Never assume images loaded** - always provide fallback.

## Testing Checklist

When modifying mechanics:
1. Test with `ribaMode = true` - Verify input lag doesn't break controls
2. Test all three power-ups simultaneously - Ensure visual bars don't overlap
3. Test game-over → loan → resume flow - Burn rate should increase
4. Test at 90+ seconds gameplay - Inflation phase transitions correctly
5. Test with missing images - Fallback rectangles should be visible

## Common Pitfalls

1. **Modifying speed without adjusting spawn rate** - Creates dead zones or spam
2. **Adding effects without `ctx.save()/restore()`** - Corrupts subsequent rendering
3. **Hardcoding timers instead of FPS-independent deltas** - Breaks on slow devices
4. **Forgetting `ribaRound` escalation** - Input lag caps make later loans too easy
5. **Breaking the savings transfer visual** - Check `TransferCoin` class intact

## Code Style

- **No semicolons on closing braces** of functions/classes
- **Inline comments** explain "why", not "what" (especially in GOD PANEL)
- **Function names are verbs** (`triggerGameOver()`, `resumeGame()`)
- **Constants use SCREAMING_SNAKE_CASE**
- **Game state is mutable global variables** - No module system
