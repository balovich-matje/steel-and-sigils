const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = 'images/obstacles/rock.png';
const outputDir = 'images/obstacles';

async function generateRockVariations() {
    try {
        // Get original metadata
        const metadata = await sharp(inputPath).metadata();
        console.log(`Original: ${metadata.width}x${metadata.height}`);

        // 1. Tall spire - scale height up, crop sides
        await sharp(inputPath)
            .resize({
                width: Math.floor(metadata.width * 0.7),
                height: Math.floor(metadata.height * 1.4),
                fit: 'fill'
            })
            .toFile(path.join(outputDir, 'rock_tall.png'));
        console.log('✓ Created rock_tall.png');

        // 2. Wide boulder - scale width up, crop top/bottom
        await sharp(inputPath)
            .resize({
                width: Math.floor(metadata.width * 1.4),
                height: Math.floor(metadata.height * 0.7),
                fit: 'fill'
            })
            .toFile(path.join(outputDir, 'rock_wide.png'));
        console.log('✓ Created rock_wide.png');

        // 3. Jagged cliff - rotate slightly and apply distortion
        await sharp(inputPath)
            .rotate(5, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .resize({
                width: metadata.width,
                height: metadata.height,
                fit: 'cover',
                position: 'top'
            })
            .toFile(path.join(outputDir, 'rock_jagged.png'));
        console.log('✓ Created rock_jagged.png');

        console.log('\n✅ All rock variations generated successfully!');
        
        // List output files
        const files = fs.readdirSync(outputDir)
            .filter(f => f.startsWith('rock') && f.endsWith('.png'))
            .map(f => {
                const stats = fs.statSync(path.join(outputDir, f));
                return `  - ${f} (${Math.round(stats.size / 1024)}KB)`;
            });
        console.log('\nRock sprites in images/obstacles/:', files.join('\n'));
        
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

generateRockVariations();
