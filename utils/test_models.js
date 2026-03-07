#!/usr/bin/env node

/**
 * Test script - Generate Cultist Neophyte with different models
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'pk_ZYeFJPLbJvYAewAl';
const API_BASE_URL = 'https://gen.pollinations.ai';
const OUTPUT_DIR = path.join(__dirname, 'test_images');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Models to test (cheapest first)
const MODELS = [
    { name: 'flux', label: 'Flux Schnell' },
    { name: 'flux-2-dev', label: 'FLUX.2 Dev' },
    { name: 'zimage', label: 'Z-Image Turbo' },
    { name: 'imagen-4', label: 'Imagen 4' }
];

// Prompt - cultist neophyte with bow
const PROMPT = 'pixel art game sprite, chunky large pixels, low resolution pixel art, young cultist neophyte with bow and arrow, dark hooded cloak, sinister apprentice, ranged attacker, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadImage(model, prompt, outputPath) {
    return new Promise((resolve, reject) => {
        const encodedPrompt = encodeURIComponent(prompt);
        const url = `${API_BASE_URL}/image/${encodedPrompt}?model=${model}&width=64&height=64&seed=42&nologo=true&key=${API_KEY}`;
        
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
    console.log('🎨 Testing Neophyte generation with different models\n');
    
    for (const model of MODELS) {
        const filename = `neophyte_${model.name}.png`;
        const outputPath = path.join(OUTPUT_DIR, filename);
        
        console.log(`⏳ Generating with ${model.label}...`);
        
        try {
            await downloadImage(model.name, PROMPT, outputPath);
            const stats = fs.statSync(outputPath);
            console.log(`   ✅ ${filename} (${(stats.size / 1024).toFixed(1)} KB)\n`);
        } catch (err) {
            console.log(`   ❌ ${model.name}: ${err.message}\n`);
        }
        
        // Delay between requests
        await sleep(2000);
    }
    
    console.log('Done! Images saved in test_images/');
}

main().catch(console.error);
