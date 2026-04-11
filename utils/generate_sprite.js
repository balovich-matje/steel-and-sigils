#!/usr/bin/env node
// ============================================
// SPRITE GENERATOR — Pollinations API
// ============================================
// Usage:
//   node utils/generate_sprite.js <name> [--model flux] [--count 2] [--out utils/temp]
//
// Examples:
//   node utils/generate_sprite.js "Bone Behemoth"
//   node utils/generate_sprite.js "Shadow Assassin" --model gptimage --count 3
//   node utils/generate_sprite.js "Fire Elemental" --model flux --out images/player

const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Config ──────────────────────────────────────────────
const API_KEY = 'pk_ZYeFJPLbJvYAewAl';
const BASE_URL = 'https://gen.pollinations.ai/image';
const DEFAULT_MODEL = 'flux';
const DEFAULT_COUNT = 2;
const DEFAULT_OUT = path.join(__dirname, 'temp');

// Art style prompt shared across all generations — matches existing sprites
const STYLE_PREFIX = 'Pixel art character sprite, 256x256, dark fantasy RPG style, full body three-quarter view facing left, single character centered, transparent background, black outline, detailed shading, grim dark medieval aesthetic, inspired by Heroes of Might and Magic';
const NEGATIVE_PROMPT = 'worst quality, blurry, text, watermark, logo, multiple characters, background scenery, photo, 3d render, smooth shading, anime';

// ── CLI parsing ─────────────────────────────────────────
const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--help') {
    console.log('Usage: node generate_sprite.js <unit-name> [--model flux|gptimage|zimage] [--count N] [--out dir]');
    process.exit(0);
}

const unitName = args[0];
let model = DEFAULT_MODEL;
let count = DEFAULT_COUNT;
let outDir = DEFAULT_OUT;
let fileSlug = ''; // optional short name for filenames

for (let i = 1; i < args.length; i++) {
    if (args[i] === '--model' && args[i + 1]) { model = args[++i]; }
    else if (args[i] === '--count' && args[i + 1]) { count = parseInt(args[++i], 10); }
    else if (args[i] === '--out' && args[i + 1]) { outDir = args[++i]; }
    else if (args[i] === '--name' && args[i + 1]) { fileSlug = args[++i]; }
}

// Use --name for filename slug, or extract first 3 words from unitName
if (!fileSlug) {
    fileSlug = unitName.split(/[,;]/)[0].trim();
}

// ── Helpers ─────────────────────────────────────────────
function buildPrompt(name) {
    return `${STYLE_PREFIX}. ${name}, a fearsome creature or warrior.`;
}

function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function download(url, headers, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, { headers }, (res) => {
            if (res.statusCode >= 400) {
                let body = '';
                res.on('data', (c) => body += c);
                res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`)));
                return;
            }
            // Follow redirects
            if (res.statusCode >= 300 && res.headers.location) {
                file.close();
                fs.unlinkSync(dest);
                return download(res.headers.location, headers, dest).then(resolve, reject);
            }
            res.pipe(file);
            file.on('finish', () => { file.close(); resolve(dest); });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

// ── Main ────────────────────────────────────────────────
async function generate() {
    fs.mkdirSync(outDir, { recursive: true });

    const prompt = buildPrompt(unitName);
    const slug = slugify(fileSlug);
    const headers = { 'Authorization': `Bearer ${API_KEY}` };

    console.log(`Generating ${count} sprite(s) for "${unitName}" using model: ${model}`);
    console.log(`Prompt: ${prompt}\n`);

    for (let i = 1; i <= count; i++) {
        const seed = Math.floor(Math.random() * 2147483647);
        const params = new URLSearchParams({
            model,
            width: '256',
            height: '256',
            seed: String(seed),
        });

        // Model-specific options
        if (model === 'gptimage' || model === 'gptimage-large') {
            params.set('transparent', 'true');
            params.set('quality', 'high');
        } else if (model === 'flux' || model === 'zimage') {
            params.set('negative_prompt', NEGATIVE_PROMPT);
        }

        const encodedPrompt = encodeURIComponent(prompt);
        const url = `${BASE_URL}/${encodedPrompt}?${params.toString()}`;
        const ext = (model === 'gptimage' || model === 'gptimage-large') ? 'png' : 'jpg';
        const filename = `${slug}_${model}_${i}.${ext}`;
        const dest = path.join(outDir, filename);

        process.stdout.write(`  [${i}/${count}] ${filename} (seed=${seed}) ... `);
        try {
            await download(url, headers, dest);
            console.log('OK');
        } catch (err) {
            console.log(`FAILED: ${err.message}`);
        }
    }

    console.log(`\nDone. Check ${outDir}/`);
}

generate().catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
});
