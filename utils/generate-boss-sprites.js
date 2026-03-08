#!/usr/bin/env node

/**
 * Generate Cultist Boss sprites using sharp (since Pollinations may be rate limited)
 * Boss 1: The Silence - Lovecraftian entity that silences spells
 * Boss 2: Void Herald - Lovecraftian entity with void powers
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUTPUT_DIR = path.join(__dirname, '..', 'images', 'enemy', 'cultist');

// Ensure directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function createSilenceBoss() {
    // Create "The Silence" - a shadowy figure with no mouth, radiating silence
    const size = 128; // 2x2 boss size
    const buffer = Buffer.alloc(size * size * 4);
    
    // Dark purple/black background
    for (let i = 0; i < buffer.length; i += 4) {
        buffer[i] = 20;     // R - dark
        buffer[i + 1] = 10; // G - very dark
        buffer[i + 2] = 30; // B - dark purple
        buffer[i + 3] = 0;  // A - transparent initially
    }
    
    // Draw shadowy figure
    const centerX = size / 2;
    const centerY = size / 2;
    
    // Body - tall shadow
    for (let y = 30; y < 110; y++) {
        for (let x = 35; x < 93; x++) {
            const dx = x - centerX;
            const dy = y - centerY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 45 && Math.random() > 0.3) {
                const idx = (y * size + x) * 4;
                buffer[idx] = 40;     // R
                buffer[idx + 1] = 20; // G
                buffer[idx + 2] = 60; // B - purple shadow
                buffer[idx + 3] = 230; // A - mostly opaque
            }
        }
    }
    
    // No face - just smooth darkness where mouth should be (The Silence)
    // Head area - completely blank/smooth
    for (let y = 15; y < 50; y++) {
        for (let x = 45; x < 83; x++) {
            const idx = (y * size + x) * 4;
            buffer[idx] = 30;     // R - darker
            buffer[idx + 1] = 15; // G
            buffer[idx + 2] = 45; // B
            buffer[idx + 3] = 240; // A
        }
    }
    
    // Silence aura - faint waves around the boss
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const waveRadius = 55;
        for (let r = waveRadius; r < waveRadius + 8; r++) {
            const wx = Math.floor(centerX + Math.cos(angle) * r);
            const wy = Math.floor(centerY + Math.sin(angle) * r);
            if (wx >= 0 && wx < size && wy >= 0 && wy < size) {
                const idx = (wy * size + wx) * 4;
                buffer[idx] = 80;     // R - lighter purple
                buffer[idx + 1] = 40; // G
                buffer[idx + 2] = 100;// B
                buffer[idx + 3] = 100;// A - semi-transparent
            }
        }
    }
    
    await sharp(buffer, {
        raw: { width: size, height: size, channels: 4 }
    })
    .png()
    .toFile(path.join(OUTPUT_DIR, 'the_silence.png'));
    
    console.log('✅ Generated: the_silence.png');
}

async function createVoidHeraldBoss() {
    // Create "Void Herald" - a creature emanating void energy
    const size = 128;
    const buffer = Buffer.alloc(size * size * 4);
    
    // Void black background
    for (let i = 0; i < buffer.length; i += 4) {
        buffer[i] = 5;      // R - near black
        buffer[i + 1] = 5;  // G
        buffer[i + 2] = 15; // B - slight blue tint
        buffer[i + 3] = 0;  // A - transparent
    }
    
    const centerX = size / 2;
    const centerY = size / 2;
    
    // Void energy aura - emanating from center
    for (let r = 0; r < 60; r++) {
        const intensity = 1 - (r / 60);
        for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
            const x = Math.floor(centerX + Math.cos(angle) * r);
            const y = Math.floor(centerY + Math.sin(angle) * r);
            if (x >= 0 && x < size && y >= 0 && y < size) {
                const idx = (y * size + x) * 4;
                const voidColor = Math.floor(20 + intensity * 80);
                buffer[idx] = voidColor / 3;     // R
                buffer[idx + 1] = voidColor / 2; // G - greenish void
                buffer[idx + 2] = voidColor;     // B - blue void
                buffer[idx + 3] = Math.floor(intensity * 200); // A
            }
        }
    }
    
    // Central figure - humanoid shape
    for (let y = 25; y < 105; y++) {
        for (let x = 40; x < 88; x++) {
            const dx = x - centerX;
            const dy = y - centerY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // Tapered shape (wider at top)
            const widthAtY = 25 + (y / size) * 10;
            if (Math.abs(dx) < widthAtY && Math.random() > 0.2) {
                const idx = (y * size + x) * 4;
                buffer[idx] = 10;     // R - dark
                buffer[idx + 1] = 25; // G - void green
                buffer[idx + 2] = 40; // B - void blue
                buffer[idx + 3] = 250;// A
            }
        }
    }
    
    // Void eyes - glowing cyan
    const eyeY = 40;
    const leftEyeX = 52;
    const rightEyeX = 76;
    
    for (let ey = eyeY - 4; ey < eyeY + 4; ey++) {
        for (let ex = leftEyeX - 3; ex < leftEyeX + 3; ex++) {
            const idx = (ey * size + ex) * 4;
            buffer[idx] = 0;      // R
            buffer[idx + 1] = 200;// G - cyan
            buffer[idx + 2] = 255;// B
            buffer[idx + 3] = 255;// A
        }
        for (let ex = rightEyeX - 3; ex < rightEyeX + 3; ex++) {
            const idx = (ey * size + ex) * 4;
            buffer[idx] = 0;
            buffer[idx + 1] = 200;
            buffer[idx + 2] = 255;
            buffer[idx + 3] = 255;
        }
    }
    
    // Void ball effect in hand (bottom right)
    const ballX = 85;
    const ballY = 85;
    for (let by = ballY - 12; by < ballY + 12; by++) {
        for (let bx = ballX - 12; bx < ballX + 12; bx++) {
            const dist = Math.sqrt((bx - ballX)**2 + (by - ballY)**2);
            if (dist < 12 && bx >= 0 && bx < size && by >= 0 && by < size) {
                const idx = (by * size + bx) * 4;
                const intensity = 1 - (dist / 12);
                buffer[idx] = 100 * intensity;     // R - purple
                buffer[idx + 1] = 0;               // G
                buffer[idx + 2] = 150 * intensity; // B
                buffer[idx + 3] = 255;
            }
        }
    }
    
    await sharp(buffer, {
        raw: { width: size, height: size, channels: 4 }
    })
    .png()
    .toFile(path.join(OUTPUT_DIR, 'void_herald.png'));
    
    console.log('✅ Generated: void_herald.png');
}

async function main() {
    console.log('🎨 Generating Cultist Boss sprites...\n');
    
    try {
        await createSilenceBoss();
        await createVoidHeraldBoss();
        console.log('\n✅ Boss sprites saved to images/enemy/cultist/');
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

main();
