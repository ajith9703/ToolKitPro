/**
 * ToolKit Pro – Backend API Server
 * Handles YouTube and Instagram downloads via yt-dlp
 *
 * Start with: node server.js
 * Requires: npm install  (auto-downloads yt-dlp binary)
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const youtubeDlExec = require('youtube-dl-exec');

const app = express();
const PORT = 3001;

// ─── Resolve yt-dlp binary ────────────────────────────────────────────────────
// youtube-dl-exec stores the binary in its own bin/ folder
function getYtDlpPath() {
    const candidates = [
        // youtube-dl-exec v3 typical locations
        path.join(require.resolve('youtube-dl-exec'), '..', '..', 'bin', 'yt-dlp.exe'),  // Windows
        path.join(require.resolve('youtube-dl-exec'), '..', '..', 'bin', 'yt-dlp'),      // Linux/Mac
        // Direct from package
        path.join(__dirname, 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp.exe'),
        path.join(__dirname, 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp'),
    ];
    for (const c of candidates) {
        if (fs.existsSync(c)) return c;
    }
    return 'yt-dlp'; // Fall back to system yt-dlp if installed globally
}

const YT_DLP = getYtDlpPath();
console.log('[yt-dlp binary]', YT_DLP);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'ToolKit Pro API is running', ytdlp: YT_DLP });
});

// ─── YouTube: Get Video Info ───────────────────────────────────────────────────
app.get('/api/yt/info', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
        const info = await youtubeDlExec(url, {
            dumpSingleJson: true,
            noWarnings: true,
            noCallHome: true,
            preferFreeFormats: true,
        });

        const formats = (info.formats || []);
        const videoQualities = ['1080', '720', '480', '360'];
        const availableVideo = videoQualities.filter(q =>
            formats.some(f => f.height && String(f.height).startsWith(q))
        );

        res.json({
            id: info.id,
            title: info.title,
            thumbnail: info.thumbnail,
            duration: info.duration,
            uploader: info.uploader,
            view_count: info.view_count,
            availableVideo: availableVideo.length > 0 ? availableVideo : ['720', '480', '360'],
        });
    } catch (err) {
        console.error('[YT Info Error]', err.message);
        res.status(500).json({ error: 'Could not fetch video info: ' + err.message });
    }
});

// ─── YouTube: Download – streams via spawn(yt-dlp) ───────────────────────────
app.get('/api/yt/download', (req, res) => {
    const { url, format = 'mp4', quality = '720', title = 'video' } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const safeTitle = title.replace(/[^\w\s-]/g, '').trim().slice(0, 60) || 'video';
    const ext = format === 'mp3' ? 'mp3' : 'mp4';
    const filename = `${safeTitle}.${ext}`;

    // Build yt-dlp arguments
    let args;
    if (format === 'mp3') {
        // Audio: extract best audio, convert to mp3 – output raw stream to stdout
        args = [
            url,
            '--no-warnings',
            '--no-call-home',
            '-x',                              // extract audio
            '--audio-format', 'mp3',
            '--audio-quality', '0',
            '-o', '-',                         // pipe to stdout
        ];
    } else {
        // Video: use a pre-merged format (no ffmpeg needed for merge)
        // Prefer mp4 progressive downloads (already muxed), fall back to best
        const fmtStr = `best[height<=${quality}][ext=mp4]/best[height<=${quality}]/best[ext=mp4]/best`;
        args = [
            url,
            '--no-warnings',
            '--no-call-home',
            '--format', fmtStr,
            '-o', '-',                         // pipe to stdout
        ];
    }

    // Set response headers BEFORE spawning so browser starts download immediately
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
    res.setHeader('Transfer-Encoding', 'chunked');

    console.log(`[YT Download] ${format} ${ext} → ${filename}`);
    console.log(`[yt-dlp args]`, args.join(' '));

    const proc = spawn(YT_DLP, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    proc.stdout.pipe(res);

    proc.stderr.on('data', chunk => {
        process.stderr.write('[yt-dlp] ' + chunk.toString());
    });

    proc.on('error', err => {
        console.error('[yt-dlp spawn error]', err.message);
        if (!res.headersSent) {
            res.status(500).json({ error: 'yt-dlp not found. Run: npm install' });
        }
    });

    proc.on('close', code => {
        console.log(`[yt-dlp] exited with code ${code}`);
        if (!res.writableEnded) res.end();
    });

    // Kill process if client disconnects
    req.on('close', () => {
        if (!proc.killed) proc.kill('SIGTERM');
    });
});

// ─── Instagram: Fetch Media URL ───────────────────────────────────────────────
app.post('/api/ig/download', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
        const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
        if (!match) return res.status(400).json({ error: 'Invalid Instagram URL' });

        const info = await youtubeDlExec(url, {
            dumpSingleJson: true,
            noWarnings: true,
            noCallHome: true,
        });

        if (info && info.url) {
            return res.json({ success: true, mediaUrl: info.url, thumbnail: info.thumbnail || null, title: info.title || 'Instagram Media', is_video: true });
        }
        if (info && info.formats && info.formats.length > 0) {
            const best = info.formats.find(f => f.ext === 'mp4') || info.formats[info.formats.length - 1];
            return res.json({ success: true, mediaUrl: best.url, thumbnail: info.thumbnail || null, title: info.title || 'Instagram Media', is_video: best.vcodec !== 'none' });
        }
        throw new Error('No media found in response');
    } catch (err) {
        console.error('[Instagram Error]', err.message);
        res.status(500).json({ error: 'Could not fetch Instagram media. Make sure the post is public.' });
    }
});

// ─── Instagram: Proxy Stream ──────────────────────────────────────────────────
app.get('/api/ig/proxy', async (req, res) => {
    const { mediaUrl, filename = 'instagram_media.mp4' } = req.query;
    if (!mediaUrl) return res.status(400).json({ error: 'mediaUrl is required' });

    try {
        const response = await axios.get(decodeURIComponent(mediaUrl), {
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.instagram.com/',
            },
        });
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');
        if (response.headers['content-length']) res.setHeader('Content-Length', response.headers['content-length']);
        response.data.pipe(res);
    } catch (err) {
        console.error('[IG Proxy Error]', err.message);
        if (!res.headersSent) res.status(500).json({ error: 'Proxy failed: ' + err.message });
    }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🚀 ToolKit Pro API Server → http://localhost:${PORT}`);
    console.log(`   Health:    GET  /api/health`);
    console.log(`   YT Info:   GET  /api/yt/info?url=...`);
    console.log(`   YT DL:     GET  /api/yt/download?url=&format=mp4&quality=720&title=...`);
    console.log(`   Instagram: POST /api/ig/download`);
    console.log(`\n   yt-dlp: ${YT_DLP}\n`);
});
