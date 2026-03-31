const debtVignette = document.getElementById('debtVignette');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const birdImage = new Image(); birdImage.src = 'assets/bird-sprite.png';
const bgImage = new Image(); bgImage.src = 'assets/bg/all_backgrounds.jpg';
const coinIcon = new Image(); coinIcon.src = 'assets/icons/hdcoin.png';
const alcoholIcon = new Image(); alcoholIcon.src = 'assets/icons/hdbeer.png';
const gamblingIcon = new Image(); gamblingIcon.src = 'assets/icons/hdpoker.png';
const toxicIcon = new Image(); toxicIcon.src = 'assets/icons/hdbarrel.png';
const militaryIcon = new Image(); militaryIcon.src = 'assets/icons/rocketlauncher.png';
const kestrlIcon = new Image(); kestrlIcon.src = 'assets/icons/kestrl_card.png';
const sadaqahIcon = new Image(); sadaqahIcon.src = 'assets/icons/Sadaqah.png';
const ribaMonsterFramePaths = [
    'assets/ribamonster/ribamonster_1.png',
    'assets/ribamonster/ribamonster_2.png',
    'assets/ribamonster/ribamonster_3.png',
    'assets/ribamonster/ribamonster_4.png',
    'assets/ribamonster/ribamonster_5.png',
    'assets/ribamonster/ribamonster_6.png'
];
const iconImages = [coinIcon, alcoholIcon, gamblingIcon, toxicIcon, militaryIcon, kestrlIcon, sadaqahIcon];
let iconsReady = false;
Promise.all(iconImages.map(img => {
    if (img.decode) return img.decode().catch(() => {});
    return new Promise(resolve => {
        if (img.complete) return resolve();
        img.onload = () => resolve();
        img.onerror = () => resolve();
    });
})).then(() => {
    iconsReady = true;
});

let birdFrameIndex = 0;
let ribaMonsterFrameIndex = 0;
let monsterY = 300;
const BIRD_FRAME_WIDTH = 200;
const BIRD_TOTAL_FRAMES = 10;
const BIRD_ANIMATION_SPEED = 0.15;
const RIBA_MONSTER_ANIMATION_SPEED = 0.12;
const RIBA_MONSTER_DRAW_WIDTH = 315;
let ribaMonsterSpriteSheet = null;
let ribaMonsterFrameWidth = 0;
let ribaMonsterFrameHeight = 0;
let ribaMonsterTotalFrames = 0;

let gameSpeed = 7;           
const MAX_SPEED = 19;        
const ACCELERATION = 0.005;  
const BG_SCROLL_SPEED = 0.05;
let verticalSpeed = 0.25;   
let liquidity = 100.00;     
let savings = 0.00;         
let burnRate = 6;          
const INFLATION_MULT = 0.0008; 
const COIN_VALUE = 2;       
const CHAOS_CHANCE = 0.12;
const KESTRL_DURATION = 360;
const POWERUP_CHANCE = 0.07;
const SADAQAH_DURATION = 360;
const SADAQAH_COST = 30;
const SADAQAH_ROI = 100;
const CHARGE_TIME = 120;

const FORMATIONS = [
    { rows: [[1, 0, 1, 0, 1], [0, 1, 0, 1, 0], [1, 0, 1, 0, 1]] },
    { rows: [[1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [0, 0, 0, 0, 0]] },
    { rows: [[0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1]] },
    { rows: [[0,0,1,1,0,0,0,0,0,0], [0,1,0,0,1,0,0,1,0,0], [1,0,0,0,0,1,1,0,1,1]] },
    { rows: [[1, 1, 1, 1, 1, 1, 1, 1], [0, 0, 0, 0, 0, 0, 0, 0], [1, 1, 1, 1, 1, 1, 1, 1]] },
    { rows: [[1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1]] },
    { rows: [[1, 0, 0, 1, 0, 0, 1, 0], [0, 1, 1, 0, 1, 1, 0, 1], [1, 0, 0, 1, 0, 0, 1, 0]] },
    { rows: [[0,0,0,0,1,1,0,0,0,0], [0,0,1,1,0,0,1,1,0,0], [1,1,0,0,0,0,0,0,1,1]] },
    { rows: [[0, 0, 0, 1, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0, 1]] }
];

let isPlaying = false;
let isGameOver = false;
let frameCount = 0;
let bgOffset = 0;
let drunkFrames = 0; 
let gamblingFrames = 0;
let toxicFrames = 0;
let shakeFrames = 0;
let kestrlFrames = 0;
let magnetActive = false;
let magnetCharging = 0;
let magnetCap = 0;
let maxDrunkDuration = 0; 
let flyingCoins = [];
let coins = []; 
let currentPattern = null;
let patternColIndex = 0;
let spawnTimer = 0;
let ribaMode = false;
let ribaRound = 0;
let inputQueue = [];
let pixelsTraveled = 0;
const SPAWN_GAP = 110;
const LANES = [150, 300, 450]; 
const RIBA_SPEED_CAP = 16;
const MONSTER_X = 50;

const bird = {
    x: 75, y: LANES[1], targetY: LANES[1], size: 200, neutralX: 100,
    
    update: function() {
        this.y += (this.targetY - this.y) * verticalSpeed;
        let distY = Math.abs(this.targetY - this.y);
        let targetX = this.neutralX;
        if (distY > 5) targetX = this.neutralX - 20; 
        this.x += (targetX - this.x) * 0.1;
    },

    draw: function() {
        birdFrameIndex += BIRD_ANIMATION_SPEED;
        if (birdFrameIndex >= BIRD_TOTAL_FRAMES) {
            birdFrameIndex = 0;
        }
        const currentFrame = Math.floor(birdFrameIndex);
        const spriteX = currentFrame * BIRD_FRAME_WIDTH;
        
        if (kestrlFrames > 0) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#FFD700";
            ctx.fillStyle = "rgba(255, 215, 0, 0.3)";
            ctx.beginPath();
            ctx.arc(this.x + 100, this.y, this.size/1.5, 0, Math.PI*2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        if (kestrlFrames > 0) {
            let pct = kestrlFrames / KESTRL_DURATION;
            ctx.fillStyle = "black";
            ctx.fillRect(this.x - 40, this.y + 50, 80, 10);
            ctx.fillStyle = "#4ade80";
            ctx.fillRect(this.x - 38, this.y + 52, 76 * pct, 6);
        }
        if (magnetCharging > 0) {
            let pct = 1 - (magnetCharging / CHARGE_TIME);
            ctx.fillStyle = "black"; ctx.fillRect(this.x - 30, this.y + 60, 60, 8);
            ctx.fillStyle = "#3b82f6";
            ctx.fillRect(this.x - 29, this.y + 61, 58 * pct, 6);
        } 
        else if (magnetActive) {
            let pct = magnetCap / SADAQAH_ROI;
            ctx.fillStyle = "black"; ctx.fillRect(this.x - 30, this.y + 60, 60, 8);
            ctx.fillStyle = "#3b82f6";
            ctx.fillRect(this.x - 29, this.y + 61, 58 * pct, 6);
        }

        ctx.drawImage(birdImage, spriteX, 0, BIRD_FRAME_WIDTH, BIRD_FRAME_WIDTH, this.x, this.y - this.size/2, this.size, this.size);
    }
};

const COIN_ICON_SIZE = 60;

function drawIcon(img, x, y, width, height) {
    if (!iconsReady || !img.complete || img.naturalWidth === 0) {
        ctx.fillStyle = "#4b5563";
        ctx.fillRect(x - width / 2, y - height / 2, width, height);
        return;
    }
    ctx.drawImage(img, x - width / 2, y - height / 2, width, height);
}

class Coin {
    constructor(row, type) {
        this.y = LANES[row];
        this.x = canvas.width + 50;
        this.size = 30;
        this.type = type; 
        this.collected = false;
    }
    update() { this.x -= gameSpeed; }
    draw() {
        if (this.collected) return;

        let isGhost = (kestrlFrames > 0 && this.type >= 2 && this.type <= 5);
        
        if (isGhost) {
            ctx.save();
            ctx.globalAlpha = 0.2;
        }

        if (this.type === 1) {
            if (kestrlFrames > 0) {
                drawIcon(coinIcon, this.x - 30, this.y, COIN_ICON_SIZE * 1.2, COIN_ICON_SIZE);
            }
            drawIcon(coinIcon, this.x, this.y, COIN_ICON_SIZE * 1.2, COIN_ICON_SIZE);
        } 
        else if (this.type >= 2 && this.type <= 5) {
            ctx.save();
            ctx.translate(this.x, this.y);

            if (this.type === 2) {
                let scale = 1 + Math.sin(Date.now() / 400) * 0.1;
                ctx.scale(scale, scale);
                drawIcon(alcoholIcon, 0, 0, COIN_ICON_SIZE, COIN_ICON_SIZE);
            }
            else if (this.type === 3) {
                let angle = Math.sin(Date.now() / 150) * 0.3;
                ctx.rotate(angle);
                drawIcon(gamblingIcon, 0, 0, COIN_ICON_SIZE, COIN_ICON_SIZE);
            }
            else if (this.type === 4) {
                let floatY = Math.sin(Date.now() / 300) * 5;
                drawIcon(toxicIcon, 0, floatY, COIN_ICON_SIZE, COIN_ICON_SIZE);
            }
            else if (this.type === 5) {
                let shakeX = (Math.random() - 0.5) * 6;
                let shakeY = (Math.random() - 0.5) * 6;
                drawIcon(militaryIcon, shakeX, shakeY, COIN_ICON_SIZE, COIN_ICON_SIZE * 1.5);
            }

            ctx.restore();
        }
        else if (this.type === 6) {
            ctx.save();
            ctx.shadowBlur = 30;
            ctx.shadowColor = "#4ade80";
            drawIcon(kestrlIcon, this.x, this.y, COIN_ICON_SIZE * 2, COIN_ICON_SIZE*1.5);
            ctx.restore();
        }
        else if (this.type === 7) {
            ctx.save();
            ctx.shadowBlur = 25; 
            ctx.shadowColor = "#FFD700";
            drawIcon(sadaqahIcon, this.x, this.y, COIN_ICON_SIZE * 1.5, COIN_ICON_SIZE * 1.2);
            ctx.restore();
        }
        if (isGhost) {
            ctx.restore();
        }
    }
}

class TransferCoin {
    constructor() {
        this.startX = 180;
        this.startY = 65;
        this.endX = 600;
        this.endY = 65;
        this.progress = 0;
        this.finished = false;
    }

    update() {
        this.progress += 0.05;
        if (this.progress >= 1) {
            this.progress = 1;
            this.finished = true;
        }
        this.x = this.startX + (this.endX - this.startX) * this.progress;
        let arcDrop = Math.sin(this.progress * Math.PI) * 150; 
        this.y = this.startY + arcDrop; 
    }

    draw() {
        ctx.shadowBlur = 10; ctx.shadowColor = "gold";
        ctx.fillStyle = "#FFD700";
        ctx.beginPath(); ctx.arc(this.x, this.y, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#B8860B"; 
        ctx.font = "bold 14px Arial"; 
        ctx.fillText("£", this.x - 4, this.y + 5);
        ctx.shadowBlur = 0;
    }
}

function loadRibaMonsterSpriteSheet() {
    const framePromises = ribaMonsterFramePaths.map(path => new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = path;
    }));

    Promise.all(framePromises).then(frames => {
        const validFrames = frames.filter(Boolean);
        if (!validFrames.length) return;

        const sourceFrameWidth = validFrames[0].naturalWidth;
        const sourceFrameHeight = validFrames[0].naturalHeight;
        const scaledFrameWidth = RIBA_MONSTER_DRAW_WIDTH;
        const scaledFrameHeight = Math.round((sourceFrameHeight / sourceFrameWidth) * scaledFrameWidth);
        const spriteSheet = document.createElement('canvas');
        spriteSheet.width = scaledFrameWidth * validFrames.length;
        spriteSheet.height = scaledFrameHeight;

        const sheetCtx = spriteSheet.getContext('2d');
        validFrames.forEach((frame, index) => {
            sheetCtx.drawImage(
                frame,
                index * scaledFrameWidth,
                0,
                scaledFrameWidth,
                scaledFrameHeight
            );
        });

        ribaMonsterSpriteSheet = spriteSheet;
        ribaMonsterFrameWidth = scaledFrameWidth;
        ribaMonsterFrameHeight = scaledFrameHeight;
        ribaMonsterTotalFrames = validFrames.length;
    });
}

function handleSpawning() {
    pixelsTraveled += gameSpeed;
    if (pixelsTraveled < SPAWN_GAP) return;
    pixelsTraveled -= SPAWN_GAP;

    if (spawnTimer > 0) { spawnTimer--; return; }

    if (!currentPattern) {
        let r = Math.floor(Math.random() * FORMATIONS.length);
        currentPattern = FORMATIONS[r];
        patternColIndex = 0;
    }
    
    for (let row = 0; row < 3; row++) {
        let shouldSpawn = currentPattern.rows[row][patternColIndex] === 1;
        if (shouldSpawn) {
            let currentChaos = (ribaMode) ? 0.05 : CHAOS_CHANCE; 
            let isEvil = Math.random() < currentChaos;
            let type = 1; 
            
            if (isEvil) {
                let roll = Math.random(); 
                if (roll < 0.25) type = 2;
                else if (roll < 0.50) type = 3;
                else if (roll < 0.75) type = 4;
                else type = 5;
            } else {
                if (kestrlFrames <= 0) {
                    let chance = POWERUP_CHANCE * (6 / gameSpeed);
                    if (Math.random() < chance) {
                        let splitRoll = Math.random();
                        let threshold = (ribaMode) ? 0.80 : 0.50;
                        if (splitRoll < threshold) { 
                            type = 7;
                        } else {
                            type = 6;
                        }
                    }
                }
            }
            coins.push(new Coin(row, type)); 
        }
    }
    
    patternColIndex++;
    if (patternColIndex >= currentPattern.rows[0].length) {
        currentPattern = null;
        spawnTimer = 0; 
    }
}

function loop() {
    if (!isPlaying || isGameOver) return;
    let speedLimit = (ribaMode) ? RIBA_SPEED_CAP : MAX_SPEED;
    if (gameSpeed < speedLimit) { 
        let currentAccel = ACCELERATION;
        if (gameSpeed > 0 && gameSpeed < 9) {
            currentAccel = ACCELERATION * 1.3; 
        }
        if (gameSpeed > 9 && gameSpeed < 11) {
            currentAccel = ACCELERATION * 1.4; 
        }
        if (gameSpeed > 13 && gameSpeed < 15) {
            currentAccel = ACCELERATION * 0.1;
        }
        if (gameSpeed > 16 && gameSpeed < 18) {
            currentAccel = ACCELERATION * 0.2;
        }
        gameSpeed += currentAccel; 
    }
    else if (gameSpeed > speedLimit) {
        gameSpeed -= 0.1; 
    }
    
    processInputQueue();

    if (magnetCharging > 0) {
        magnetCharging--;
        if (magnetCharging === 0) {
            magnetActive = true;
            magnetCap = SADAQAH_ROI;
        }
    }
    if (magnetActive && magnetCap <= 0) {
        magnetActive = false;
    }
    
    burnRate += INFLATION_MULT;
    liquidity -= (burnRate / 60);
    if (liquidity <= -1) triggerGameOver();

    if (gamblingFrames > 0) {
        gamblingFrames--;
        if (gamblingFrames % 5 === 0) {
            let r = Math.floor(Math.random() * 3);
            bird.targetY = LANES[r];
        }
    }
    
    bird.update();
    handleSpawning();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save(); 
    
    if (shakeFrames > 0) {
        shakeFrames--;
        let dx = (Math.random() - 0.5) * 30;
        let dy = (Math.random() - 0.5) * 40;
        ctx.translate(dx, dy);
    }

    if (drunkFrames > 0) {
        drunkFrames--;
        let intensity = drunkFrames / maxDrunkDuration; 
        let rotation = Math.sin(frameCount * 0.1) * 0.1 * 1.25 * intensity;
        let scale = 1 + (Math.sin(frameCount * 0.2) * 0.1 * intensity);
        
        ctx.translate(canvas.width/2, canvas.height/2);
        ctx.rotate(rotation);
        ctx.scale(scale, scale);
        ctx.translate(-canvas.width/2, -canvas.height/2);
        
        if(intensity > 0.5) ctx.filter = 'blur(2px)';
    }

    if (kestrlFrames > 0) {
        kestrlFrames--;
        ctx.strokeStyle = "rgba(74, 222, 128, 0.5)"; 
        ctx.lineWidth = 10;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }

    drawBackground();
    drawRibaMonster();
    for (let i = coins.length - 1; i >= 0; i--) {
        let c = coins[i];
        if (magnetActive && c.type === 1) {
            c.x += (bird.x - c.x) * 0.1; 
            c.y += (bird.y - c.y) * 0.1; 
        }
        if (magnetActive && c.type >= 2 && c.type <= 5) {
            if (Math.abs(bird.x - c.x) < 200) {
                if (c.y > bird.y) c.y += 4; 
                else c.y -= 4;              
            }
        }
        c.update();
        c.draw();
        if (c.x < -50) { coins.splice(i, 1); continue; }
        let hitRange = (kestrlFrames > 0) ? 90 : 50;
        if (!c.collected && (c.type === 1 || c.type === 6)) {
            let dist = Math.hypot(bird.x - c.x, bird.y - c.y);
            if (dist < 90) {
                c.x += (bird.x - c.x) * 0.10; 
                c.y += (bird.y - c.y) * 0.10;
            }
        }

        hitRange = (c.type === 1 || c.type === 6 || c.type === 7) ? 55 : 30;
        if (kestrlFrames > 0) hitRange = 60;

        if (!c.collected && Math.abs(bird.x - c.x) < hitRange && Math.abs(bird.y - c.y) < hitRange) {
            if (kestrlFrames > 0 && c.type >= 2 && c.type <= 5) {
                continue; 
            }
            c.collected = true;
            applyCoinEffect(c); 
            if (magnetActive && c.type === 1) {
                magnetCap -= COIN_VALUE; 
            }
            coins.splice(i, 1);
        }
    }

    bird.draw();
    ctx.restore(); 

    if (toxicFrames > 0) {
        toxicFrames--;
        ctx.fillStyle = "rgba(0, 255, 0, 0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    for (let i = flyingCoins.length - 1; i >= 0; i--) {
        let fc = flyingCoins[i];
        fc.update();
        fc.draw();
        if (fc.finished) {
            flyingCoins.splice(i, 1);
        }
    }
    const hasDebt = syncDebtState();
    if (runTimerRunning && !hasDebt) {
        const now = performance.now();
        runElapsedMs += (now - runTimerLastMs);
        runTimerLastMs = now;
        runTimerEl.textContent = formatRunTime(runElapsedMs);
    } else if (runTimerRunning) {
        runTimerLastMs = performance.now();
    }
    if (hasDebt || liquidity < 0) {
        debtVignette.classList.add('active');
        timerLockEl.classList.remove('hidden');
        timerInstructionEl.classList.remove('hidden');
    } else {
        debtVignette.classList.remove('active');
        timerLockEl.classList.add('hidden');
        timerInstructionEl.classList.add('hidden');
    }
    drawUI();
    
    frameCount++;
    requestAnimationFrame(loop);
}

function applyCoinEffect(c) {
    if (kestrlFrames > 0) {
        if (c.type >= 2 && c.type <= 5) return;
        if (c.type === 1) {
            liquidity += (COIN_VALUE * 2);
            return;
        }
    }

    if (c.type === 1) { 
        liquidity += COIN_VALUE;
    } 
    else if (c.type === 2) { 
        liquidity -= 15;
        drunkFrames = 180; 
        maxDrunkDuration = 180;
    } 
    else if (c.type === 3) { 
        liquidity -= 15;
        gamblingFrames = 40; 
    }
    else if (c.type === 4) { 
        liquidity -= 15; 
        toxicFrames = 60; 
    }
    else if (c.type === 5) { 
        liquidity -= 15; 
        shakeFrames = 40; 
    }
    else if (c.type === 6) { 
        kestrlFrames = KESTRL_DURATION;
    }
    else if (c.type === 7) {
        liquidity -= SADAQAH_COST;
        magnetCharging = CHARGE_TIME;
        magnetActive = false;
        magnetCap = SADAQAH_ROI;
    }
}

function drawBackground() {
    bgOffset -= gameSpeed * BG_SCROLL_SPEED;
    
    if (bgImage.complete && bgImage.naturalWidth > 0) {
        const bgWidth = bgImage.width;
        const bgHeight = bgImage.height;
        const scale = canvas.height / bgHeight;
        const scaledWidth = bgWidth * scale;
        const xPos = bgOffset % scaledWidth;
        ctx.drawImage(bgImage, xPos, 0, scaledWidth, canvas.height);
        ctx.drawImage(bgImage, xPos + scaledWidth, 0, scaledWidth, canvas.height);
    }
    
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2; ctx.setLineDash([20, 20]);
    LANES.forEach(y => {
        ctx.lineDashOffset = -bgOffset; 
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    });
}

function drawRibaMonster() {
    if (!ribaMode) return;

    monsterY += (bird.y - monsterY) * 0.04;

    let surge = Math.sin(frameCount * 0.05) * 20; 
    let baseCreep = Math.min(ribaRound * 5, 40);
    let myX = 40 + baseCreep + surge;

    ctx.save();
    
    if (ribaMonsterSpriteSheet && ribaMonsterTotalFrames > 0) {
        ribaMonsterFrameIndex += RIBA_MONSTER_ANIMATION_SPEED;
        if (ribaMonsterFrameIndex >= ribaMonsterTotalFrames) {
            ribaMonsterFrameIndex = 0;
        }

        const currentFrame = Math.floor(ribaMonsterFrameIndex);
        const spriteX = currentFrame * ribaMonsterFrameWidth;

        ctx.drawImage(
            ribaMonsterSpriteSheet,
            spriteX,
            0,
            ribaMonsterFrameWidth,
            ribaMonsterFrameHeight,
            myX - ribaMonsterFrameWidth / 2,
            monsterY - ribaMonsterFrameHeight / 2,
            ribaMonsterFrameWidth,
            ribaMonsterFrameHeight
        );
    } else {
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(myX, monsterY, 55, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function drawUI() {
    ctx.fillStyle = "#000"; ctx.fillRect(20, 20, 320, 90);
    ctx.fillStyle = liquidity > 30 ? "#4ade80" : "#ff4d4d"; 
    ctx.font = "bold 24px Courier New";
    ctx.fillText(`LIQUIDITY: £${liquidity.toFixed(2)}`, 30, 50);
    ctx.fillStyle = "#fff"; 
    ctx.font = "16px Courier New";
    ctx.fillText(`SPEED: ${gameSpeed.toFixed(1)}`, 30, 80);
    ctx.fillStyle = "#000"; ctx.fillRect(640, 20, 180, 60);
    ctx.fillStyle = "#FFD700"; 
    ctx.font = "bold 24px Courier New";
    ctx.fillText(`SAVED: £${savings.toFixed(0)}`, 650, 55);
}

window.addEventListener('keydown', e => {
    if (!isPlaying) return;

    let delay = 0;

    if (ribaMode && kestrlFrames <= 0) {
        let minLag = 150 + (ribaRound * 50); 
        let maxLag = 200 + (ribaRound * 100); 
        delay = Math.floor(Math.random() * (maxLag - minLag + 1)) + minLag;
    }

    inputQueue.push({
        key: e.key,
        executeTime: Date.now() + delay
    });
});

function processInputQueue() {
    let now = Date.now();
    for (let i = inputQueue.length - 1; i >= 0; i--) {
        let input = inputQueue[i];
        if (now >= input.executeTime) {
            let idx = LANES.indexOf(bird.targetY);
            if (input.key === 'ArrowUp' && idx > 0) bird.targetY = LANES[idx - 1];
            if (input.key === 'ArrowDown' && idx < 2) bird.targetY = LANES[idx + 1];
            if (input.key === 's' || input.key === 'S') {
                if (liquidity > 10) { 
                    liquidity -= 10; 
                    savings += 10; 
                    syncDebtState();
                    flyingCoins.push(new TransferCoin());
                }
            }
            inputQueue.splice(i, 1);
        }
    }
}

function syncDebtState() {
    const hasDebt = savings < 0;
    ribaMode = hasDebt;
    if (!hasDebt) {
        ribaRound = 0;
    }
    return hasDebt;
}

function resetGameState() {
    gameSpeed = 7;
    verticalSpeed = 0.25;
    liquidity = 100.00;
    savings = 0.00;
    burnRate = 6;
    frameCount = 0;
    bgOffset = 0;
    drunkFrames = 0;
    gamblingFrames = 0;
    toxicFrames = 0;
    shakeFrames = 0;
    kestrlFrames = 0;
    magnetActive = false;
    magnetCharging = 0;
    magnetCap = 0;
    maxDrunkDuration = 0;
    flyingCoins = [];
    coins = [];
    currentPattern = null;
    patternColIndex = 0;
    spawnTimer = 0;
    ribaMode = false;
    ribaRound = 0;
    inputQueue = [];
    pixelsTraveled = 0;
    bird.x = 75;
    bird.y = LANES[1];
    bird.targetY = LANES[1];
    isPlaying = false;
    isGameOver = false;
    scoreSubmittedForRun = false;
    latestSubmitResult = null;
    setSubmitStatus('');
    survivalContinueBtn.style.display = 'none';
}

loadRibaMonsterSpriteSheet();
