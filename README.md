# 🎥 Video Streaming Backend

A self-hosted video streaming solution that replaces expensive third-party streaming APIs. This backend receives RTMP streams from OBS Studio and converts them to HLS for web clients.

## 🚀 Features

- **RTMP Server**: Receives streams from OBS Studio and other streaming software
- **HLS Conversion**: Automatically converts RTMP to HLS for web compatibility
- **Real-time Dashboard**: Web interface to monitor and watch streams
- **WebSocket Support**: Real-time updates for stream status and viewer count
- **Multi-client Support**: Multiple viewers can watch the same stream
- **REST API**: Programmatic access to stream information

## 📋 Prerequisites

- **Node.js** (v14 or higher)
- **FFmpeg** (for video processing)
- **OBS Studio** (for streaming)

### Installing FFmpeg

#### Windows:
1. Download FFmpeg from https://ffmpeg.org/download.html
2. Extract to a folder (e.g., `C:\ffmpeg`)
3. Add `C:\ffmpeg\bin` to your system PATH

#### macOS:
```bash
brew install ffmpeg
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install ffmpeg
```

## 🛠️ Installation

1. **Clone or download this project**
2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## 📡 Streaming Setup

### OBS Studio Configuration

1. Open OBS Studio
2. Go to **Settings** → **Stream**
3. Configure the following:
   - **Service**: Custom
   - **Server**: `rtmp://localhost:1935/live`
   - **Stream Key**: Any name you want (e.g., "my-stream")
4. Click **Start Streaming**

### Other Streaming Software

Use the same RTMP URL format:
- **Server**: `rtmp://localhost:1935/live`
- **Stream Key**: Your desired stream name

## 🌐 API Endpoints

### Health Check
```
GET /health
```
Returns server status and active stream count.

### List Streams
```
GET /api/streams
```
Returns array of active streams with metadata.

### Stream Details
```
GET /api/stream/:id
```
Returns detailed information about a specific stream.

### HLS Playlist
```
GET /hls/:streamId/index.m3u8
```
Returns the HLS playlist for a stream.

## 🔧 Configuration

### Port Configuration
- **Web Server**: Port 3000 (configurable in `main.js`)
- **RTMP Server**: Port 1935 (standard RTMP port)
- **HTTP Server**: Port 8000 (for RTMP over HTTP)

### Video Quality Settings
The server uses these FFmpeg settings for HLS conversion:
- **Video Codec**: H.264 (libx264)
- **Audio Codec**: AAC
- **Quality**: CRF 18 (high quality)
- **Bitrate**: 400k max
- **Segment Duration**: 10 seconds
- **Playlist Size**: 6 segments

To modify these settings, edit the `addOptions` array in the `createStream` method.

## 📁 Project Structure

```
video-streaming-backend/
├── main.js              # Main server file
├── package.json         # Dependencies and scripts
├── public/              # Web client files
│   └── index.html       # Dashboard interface
├── hls/                 # Generated HLS files (auto-created)
│   └── [stream-id]/     # Individual stream folders
└── README.md           # This file
```

## 🔄 How It Works

1. **RTMP Input**: OBS Studio sends video stream to RTMP server
2. **Stream Processing**: FFmpeg converts RTMP to HLS format
3. **HLS Storage**: Video segments stored in `hls/[stream-id]/` folder
4. **Web Delivery**: Clients access streams via HTTP/HLS
5. **Real-time Updates**: WebSocket provides live status updates

## 🎯 Usage Examples

### Basic Streaming
1. Start the server: `npm start`
2. Open OBS Studio and configure RTMP settings
3. Start streaming in OBS
4. Open `http://localhost:3000` to watch the stream

### Multiple Streams
- Each stream needs a unique name
- Use different stream keys in OBS (e.g., "stream1", "stream2")
- All streams appear in the dashboard

### Custom Integration
```javascript
// Get active streams
const response = await fetch('http://localhost:3000/api/streams');
const streams = await response.json();

// Get specific stream info
const stream = await fetch('http://localhost:3000/api/stream/my-stream');
const streamData = await stream.json();
```

## 🐛 Troubleshooting

### Common Issues

**FFmpeg not found:**
- Ensure FFmpeg is installed and in your system PATH
- Restart your terminal/command prompt after installation

**Stream not appearing:**
- Check OBS Studio RTMP settings
- Verify server is running on port 1935
- Check console logs for errors

**Video not playing:**
- Ensure HLS.js is loaded in browser
- Check browser console for errors
- Verify stream is actually streaming (not just connected)

**Port conflicts:**
- Change ports in `main.js` if needed
- Ensure ports 1935, 3000, and 8000 are available

### Logs
The server provides detailed logging:
- RTMP connection events
- FFmpeg process status
- WebSocket connections
- Stream lifecycle events

## 🔒 Security Considerations

- This is a development setup - not production-ready
- No authentication or authorization
- No rate limiting
- Consider adding security measures for production use

## 📈 Performance Tips

- Use SSD storage for HLS files
- Monitor disk space (HLS files accumulate)
- Adjust FFmpeg quality settings based on your needs
- Consider using a CDN for HLS delivery in production

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

MIT License - feel free to use this project for your own needs.

---

**Happy Streaming! 🎬**
