#!/usr/bin/env node

/**
 * Steel and Sigils - Sprite Generator
 * 
 * Generates missing unit sprites using Pollinations.ai API
 * Uses zimage model for consistent pixel art style
 * 
 * Usage: node generate-sprites.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const UNITS_JS_PATH = path.join(__dirname, 'units.js');
const IMAGES_BASE_PATH = path.join(__dirname, '..', 'images');
const API_KEY = 'pk_ZYeFJPLbJvYAewAl';
const API_BASE_URL = 'https://gen.pollinations.ai';
const MODEL = 'zimage';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

// Unit prompt mappings - all facing left to right (side view)
const UNIT_PROMPTS = {
    // Player Units
    'knight.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, medieval knight in plate armor with sword and shield, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    'archer.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, medieval archer with longbow and leather armor, hooded, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    'wizard.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, wizard with long beard and blue robes holding staff with crystal, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    'paladin.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, holy paladin in ornate gold and silver armor with hammer, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    'ranger.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, ranger with crossbow and green cloak, woodland archer, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    'berserker.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, raging barbarian berserker with twin axes and fur clothing, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    'cleric.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, holy cleric priest with mace and holy symbol, white and gold robes, healer, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    'rogue.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, stealthy rogue assassin with daggers and dark leather armor, masked thief, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    'sorcerer.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, dark sorcerer with arcane energy and purple robes, spellcasting, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    
    // Greenskin Horde
    'orc_warrior.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, green orc warrior with axe and leather armor, tribal tattoos, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    'orc_brute.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, massive orc brute with giant club, heavily armored tank, muscular green monster, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    'orc_rogue.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, sneaky orc rogue with dual daggers and dark leather, fast assassin, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    'goblin_stone_thrower.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, small green goblin throwing rocks, ragged clothing, ranged nuisance, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    'ogre_chieftain.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, huge ogre chieftain with massive club and crown, giant boss monster, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    'orc_shaman_king.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, orc shaman king with bone staff and tribal mask, spellcasting orc leader, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    'loot_goblin.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, goblin carrying bag of gold and treasures, greedy thief with loot, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    
    // Dungeon Dwellers
    'summoner_lich.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, undead lich necromancer with tattered robes and glowing eyes, holding staff with skull, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    'animated_armor.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, empty suit of possessed plate armor with glowing eye slits in helmet, heavy metal knight, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    'skeleton_archer.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, undead skeleton archer with bow and arrow, bare bones, dark eye sockets, decayed leather armor, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    'skeleton_soldier.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, undead skeleton warrior with sword and shield, bare bones fighting stance, rusted helmet, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    'lost_spirit.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, ghostly spirit wraith with ethereal blue glow, spectral form floating, translucent undead creature, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    
    // Old God Worshippers
    'octoth_hroarath.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, eldritch horror abomination with tentacles and many eyes, lovecraftian monster, dark void creature, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    'acolyte.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, hooded cultist acolyte in dark robes, face hidden in shadow, holding dagger, occult worshipper, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    'neophyte.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, young cultist neophyte with bow, dark hooded cloak, sinister apprentice, ranged attacker, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    'gibbering_horror.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, twisted mutant horror with multiple mouths and tentacles, gibbering mouth monster, lovecraftian aberration, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64',
    'flesh_warped_stalker.png': 'pixel art game sprite, chunky large pixels, low resolution pixel art, mutated humanoid creature with elongated limbs and claws, flesh warped beast, fast predator monster, facing left to right, side view, simple flat colors, grim dark fantasy game asset, 64x64'
};

/**
 * Parse units.js and extract image paths
 */
function extractImagePaths() {
    console.log('📖 Reading unit definitions from units.js...');
    
    const content = fs.readFileSync(UNITS_JS_PATH, 'utf8');
    const imagePaths = [];
    
    const imageRegex = /image:\s*['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = imageRegex.exec(content)) !== null) {
        imagePaths.push(match[1]);
    }
    
    const uniquePaths = [...new Set(imagePaths)];
    console.log(`   Found ${uniquePaths.length} unique image paths\n`);
    
    return uniquePaths;
}

/**
 * Check if an image file exists and has content (>0 bytes)
 */
function imageExists(imagePath) {
    const fullPath = path.join(__dirname, '..', imagePath);
    if (!fs.existsSync(fullPath)) {
        return false;
    }
    const stats = fs.statSync(fullPath);
    return stats.size > 0;
}

/**
 * Ensure directory exists
 */
function ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`   📁 Created: ${path.relative(path.join(__dirname, '..'), dirPath)}`);
    }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Download image from Pollinations API with retry logic
 */
async function downloadImage(prompt, outputPath, attempt = 1) {
    return new Promise((resolve, reject) => {
        const encodedPrompt = encodeURIComponent(prompt);
        const url = `${API_BASE_URL}/image/${encodedPrompt}?model=${MODEL}&width=64&height=64&seed=42&nologo=true&key=${API_KEY}`;
        
        const chunks = [];
        
        https.get(url, (response) => {
            response.on('data', (chunk) => chunks.push(chunk));
            
            response.on('end', async () => {
                const buffer = Buffer.concat(chunks);
                
                if (response.statusCode === 429) {
                    if (attempt < MAX_RETRIES) {
                        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
                        console.log(`      ⚠️  Rate limited, retrying in ${delay/1000}s... (${attempt}/${MAX_RETRIES})`);
                        await sleep(delay);
                        try {
                            await downloadImage(prompt, outputPath, attempt + 1);
                            resolve();
                        } catch (err) {
                            reject(err);
                        }
                    } else {
                        reject(new Error('HTTP 429 - Max retries exceeded'));
                    }
                    return;
                }
                
                if (response.statusCode !== 200) {
                    let errorMsg = `HTTP ${response.statusCode}`;
                    try {
                        const errorData = JSON.parse(buffer.toString());
                        if (errorData.error && errorData.error.message) {
                            errorMsg = `${response.statusCode}: ${errorData.error.message}`;
                        }
                    } catch (e) {
                        const text = buffer.toString().substring(0, 200);
                        if (text) errorMsg = `${response.statusCode}: ${text}`;
                    }
                    reject(new Error(errorMsg));
                    return;
                }
                
                try {
                    fs.writeFileSync(outputPath, buffer);
                    resolve();
                } catch (err) {
                    reject(new Error(`Failed to write: ${err.message}`));
                }
            });
        }).on('error', (err) => reject(new Error(`Network: ${err.message}`)));
    });
}

/**
 * Main function
 */
async function main() {
    console.log('⚔️  Steel and Sigils - Sprite Generator (zimage model)\n');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const imagePaths = extractImagePaths();
    
    console.log('🔍 Checking for missing images...\n');
    
    const missing = [];
    const existing = [];
    
    for (const imagePath of imagePaths) {
        if (imageExists(imagePath)) {
            existing.push(imagePath);
        } else {
            missing.push(imagePath);
        }
    }
    
    console.log(`✅ Existing: ${existing.length}`);
    existing.forEach(p => console.log(`   • ${p}`));
    
    console.log(`\n❌ Missing: ${missing.length}`);
    if (missing.length === 0) {
        console.log('   All images present!\n');
        return;
    }
    missing.forEach(p => console.log(`   • ${p}`));
    
    console.log(`\n🎨 Generating ${missing.length} sprites with ${MODEL} model...\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const imagePath of missing) {
        const filename = path.basename(imagePath);
        const dirPath = path.join(__dirname, '..', path.dirname(imagePath));
        const fullOutputPath = path.join(__dirname, '..', imagePath);
        
        const prompt = UNIT_PROMPTS[filename];
        if (!prompt) {
            console.log(`   ⚠️  No prompt for ${filename}, skipping...`);
            failCount++;
            continue;
        }
        
        ensureDirectory(dirPath);
        
        console.log(`   📝 ${filename}`);
        
        try {
            await downloadImage(prompt, fullOutputPath);
            const stats = fs.statSync(fullOutputPath);
            console.log(`   ✅ Saved (${(stats.size / 1024).toFixed(1)} KB)\n`);
            successCount++;
            await sleep(2000);
        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}\n`);
            failCount++;
        }
    }
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 Complete!');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    if (failCount > 0) process.exit(1);
}

main().catch(console.error);
