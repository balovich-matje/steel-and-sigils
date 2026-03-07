#!/usr/bin/env node

/**
 * Generate background tiles and obstacle sprites using zimage
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'pk_ZYeFJPLbJvYAewAl';
const API_BASE_URL = 'https://gen.pollinations.ai';
const OUTPUT_DIR = path.join(__dirname, 'images', 'tiles');
const OBSTACLE_DIR = path.join(__dirname, 'images', 'obstacles');

// Ensure directories exist
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(OBSTACLE_DIR)) fs.mkdirSync(OBSTACLE_DIR, { recursive: true });

const MODEL = 'zimage';

// Background tiles - muted, greyed out, tileable
const BACKGROUNDS = [
    {
        name: 'grass',
        prompt: 'pixel art game tile, muted greyed out green grass texture, simple flat colors, low contrast, grim dark fantasy, 64x64, seamless tileable, top down view'
    },
    {
        name: 'dirt', 
        prompt: 'pixel art game tile, muted greyed out brown dirt ground texture, simple flat colors, low contrast, grim dark fantasy, 64x64, seamless tileable, top down view'
    },
    {
        name: 'road',
        prompt: 'pixel art game tile, muted grey stone path texture, simple flat colors, low contrast, grim dark fantasy, 64x64, seamless tileable, top down view'
    }
];

// Obstacles - slightly bigger than cell (72x72) to overflow
const OBSTACLES = [
    {
        name: 'wall_large',
        prompt: 'pixel art game sprite, stone brick wall segment, ancient crumbling masonry, grey stone, grim dark fantasy game asset, 72x72, slightly larger than tile'
    },
    {
        name: 'rock_large',
        prompt: 'pixel art game sprite, grey mountain rock boulder, rough stone obstacle, terrain blocking debris, grim dark fantasy game asset, 72x72, slightly larger than tile'
    }
];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadImage(prompt, outputPath, width, height) {
    return new Promise((resolve, reject) => {
        const encodedPrompt = encodeURIComponent(prompt);
        const url = `${API_BASE_URL}/image/${encodedPrompt}?model=${MODEL}&width=${width}&height=${height}&seed=42&nologo=true&key=${API_KEY}`;
        
        const chunks = [];
        
        https.get(url, (response) => {
            response.on('data', (chunk) => chunks.push(chunk));
            
            response.on('end', () => {
                const buffer = Buffer.concat(chunks);
                
                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}`));
                    return;
                }
                
                fs.writeFileSync(outputPath, buffer);
                resolve();
            });
        }).on('error', (err) => reject(err));
    });
}

async function main() {
    console.log('🎨 Generating background tiles and obstacles with zimage\n');
    
    // Generate background tiles (64x64)
    for (const bg of BACKGROUNDS) {
        const outputPath = path.join(OUTPUT_DIR, `${bg.name}.png`);
        console.log(`⏳ Generating ${bg.name}.png (64x64)...`);
        
        try {
            await downloadImage(bg.prompt, outputPath, 64, 64);
            const stats = fs.statSync(outputPath);
            console.log(`   ✅ ${bg.name}.png (${(stats.size / 1024).toFixed(1)} KB)`);
        } catch (err) {
            console.log(`   ❌ ${bg.name}: ${err.message}`);
        }
        
        await sleep(2000);
    }
    
    // Generate obstacle sprites (72x72 - slightly bigger)
    for (const obs of OBSTACLES) {
        const outputPath = path.join(OBSTACLE_DIR, `${obs.name}.png`);
        console.log(`⏳ Generating ${obs.name}.png (72x72)...`);
        
        try {
            await downloadImage(obs.prompt, outputPath, 72, 72);
            const stats = fs.statSync(outputPath);
            console.log(`   ✅ ${obs.name}.png (${(stats.size / 1024).toFixed(1)} KB)`);
        } catch (err) {
            console.log(`   ❌ ${obs.name}: ${err.message}`);
        }
        
        await sleep(2000);
    }
    
    console.log('\nDone!');
}

main().catch(console.error);
