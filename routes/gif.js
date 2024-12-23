const express = require('express');
const GifEncoder = require('gifencoder');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const router = express.Router();

// Preload and optimize images using Sharp
const preloadAndOptimizeImages = async (files, uploadsPath, width, height) => {
    return await Promise.all(
        files.map(async (file) => {
            const imagePath = path.join(uploadsPath, file);
            const buffer = await sharp(imagePath)
                .resize(width, height)
                .toBuffer();
            const optimizedImage = await loadImage(buffer);
            return { file, optimizedImage };
        })
    );
};

// Function to delete all files from a directory
const deleteAllFiles = (directoryPath) => {
    try {
        const files = fs.readdirSync(directoryPath);
        for (const file of files) {
            fs.unlinkSync(path.join(directoryPath, file));
        }
        console.log('All files deleted successfully.');
    } catch (error) {
        console.error('Error deleting files:', error.message);
    }
};

// Route for generating GIF
router.get('/generate-gif', async (req, res) => {
    try {
        const width = 800; // Target width for GIF
        const height = 600; // Target height for GIF
        const encoder = new GifEncoder(width, height);
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        const uploadsPath = path.join(__dirname, '../public/uploads');
        const outputPath = path.join(uploadsPath, 'output.gif');

        // Validate uploads directory existence
        if (!fs.existsSync(uploadsPath)) {
            return res.status(400).send('Uploads folder does not exist!');
        }

        // Fetch image files (supported formats: jpg, png, jpeg)
        const files = fs.readdirSync(uploadsPath).filter(
            (file) =>
                file.endsWith('.jpg') ||
                file.endsWith('.png') ||
                file.endsWith('.jpeg')
        );

        if (files.length === 0) {
            return res.status(400).send('No images available to create GIF!');
        }

        // Sort files by desired criteria
        files.sort();

        // Preload and optimize images
        const preloadedImages = await preloadAndOptimizeImages(
            files,
            uploadsPath,
            width,
            height
        );

        // Initialize GIF stream
        const stream = fs.createWriteStream(outputPath);
        encoder.createReadStream().pipe(stream);
        encoder.start();
        encoder.setRepeat(0); // Infinite loop
        encoder.setDelay(500); // Frame delay in ms
        encoder.setQuality(10); // Image quality

        // Render preloaded images onto GIF
        for (const { optimizedImage } of preloadedImages) {
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
            ctx.drawImage(optimizedImage, 0, 0, width, height); // Draw optimized image
            encoder.addFrame(ctx); // Add to GIF
        }

        encoder.finish();

        // Handle GIF generation completion
        stream.on('close', () => {
            res.json({
                message: 'GIF generated successfully!',
                // downloadPath: '/uploads/output.gif',
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

// Route for downloading GIF and cleaning up files
router.get('/download-gif', (req, res) => {
    const uploadsPath = path.join(__dirname, '../public/uploads');
    const outputPath = path.join(uploadsPath, 'output.gif');

    // Check if the GIF exists
    if (!fs.existsSync(outputPath)) {
        return res.status(404).send('GIF not found!');
    }

    // Send the GIF to the client
    res.download(outputPath, 'output.gif', (err) => {
        if (err) {
            console.error('Error during download:', err.message);
            return;
        }

        // After download completes, delete all files
        deleteAllFiles(uploadsPath);
    });
});

module.exports = router;
