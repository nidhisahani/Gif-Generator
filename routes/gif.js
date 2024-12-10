const express = require('express');
const GifEncoder = require('gifencoder');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Route for generating GIF
router.get('/generate-gif', async (req, res) => {
    try {
        const encoder = new GifEncoder(800, 600); // Set GIF dimensions
        const canvas = createCanvas(800, 600);
        const ctx = canvas.getContext('2d');

        const uploadsPath = path.join(__dirname, '../public/uploads');
        const outputPath = path.join(uploadsPath, 'output.gif');

        // Check if the uploads folder exists
        if (!fs.existsSync(uploadsPath)) {
            return res.status(400).send('Uploads folder does not exist!');
        }

        // Get all image files (jpg and png)
        const files = fs.readdirSync(uploadsPath).filter(file => file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.jpeg'));

        if (files.length === 0) {
            return res.status(400).send('No images available to create GIF!');
        }

        // Sort files by filename or any other criteria (e.g., timestamp)
        files.sort();

        const stream = fs.createWriteStream(outputPath);
        encoder.createReadStream().pipe(stream);
        encoder.start();
        encoder.setRepeat(0); // Infinite loop
        encoder.setDelay(500); // Frame delay in ms
        encoder.setQuality(10); // Image quality

        // Loop through the files and add each image to the GIF
        for (const file of files) {
            const imagePath = path.join(uploadsPath, file);
            const image = await loadImage(imagePath);

            // Resize image if necessary
            const width = 800;
            const height = 600;
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
            ctx.drawImage(image, 0, 0, width, height); // Resize to fit GIF dimensions
            encoder.addFrame(ctx);
        }

        encoder.finish();

        stream.on('close', () => {
            res.json({
                message: 'GIF generated successfully!',
                downloadPath: '/uploads/output.gif',
            });
        });

        stream.on('error', (err) => {
            console.error('Error generating GIF:', err);
            res.status(500).send('Failed to generate GIF');
        });

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('Error during GIF generation');
    }
});

module.exports = router;
