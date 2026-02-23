/**
 * Скрипт генерации PNG иконок для PWA из SVG логотипа.
 * Запуск: node scripts/generate-icons.js
 * Требует: sharp (npm install sharp --save-dev)
 */

const fs = require('fs');
const path = require('path');

const SVG_SOURCE = path.join(__dirname, '../public/logo-chef.svg');
const OUTPUT_DIR = path.join(__dirname, '../public');

async function generateIcons() {
    let sharp;
    try {
        sharp = require('sharp');
    } catch (e) {
        console.log('⚠️  sharp не установлен. Запустите: npm install sharp --save-dev');
        console.log('📌 Либо конвертируйте logo-chef.svg вручную в icon-192.png и icon-512.png');
        process.exit(0);
    }

    const svgBuffer = fs.readFileSync(SVG_SOURCE);

    const sizes = [
        { name: 'icon-192.png', size: 192 },
        { name: 'icon-512.png', size: 512 },
        { name: 'apple-touch-icon.png', size: 180 },
    ];

    for (const { name, size } of sizes) {
        const outputPath = path.join(OUTPUT_DIR, name);
        await sharp(svgBuffer)
            .resize(size, size)
            .png()
            .toFile(outputPath);
        console.log(`✅ Создан: ${name} (${size}x${size})`);
    }

    console.log('\n🎉 Иконки PWA готовы!');
}

generateIcons().catch(console.error);
