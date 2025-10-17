const NodeMediaServer = require("node-media-server");
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const cors = require("cors");

class VideoStreamingServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    this.activeStreams = new Map();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupRTMPServer();
    this.setupSocketIO();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static("public"));
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get("/health", (req, res) => {
      res.json({
        status: "OK",
        activeStreams: this.activeStreams.size,
        timestamp: new Date().toISOString(),
      });
    });

    // Get list of active streams
    this.app.get("/api/streams", (req, res) => {
      const streams = Array.from(this.activeStreams.values()).map((stream) => ({
        id: stream.id,
        name: stream.name,
        viewers: stream.viewers,
        status: stream.status,
        startTime: stream.startTime,
      }));
      res.json(streams);
    });

    // Stream info endpoint
    this.app.get("/api/stream/:id", (req, res) => {
      const stream = this.activeStreams.get(req.params.id);
      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }
      res.json({
        id: stream.id,
        name: stream.name,
        viewers: stream.viewers,
        status: stream.status,
        startTime: stream.startTime,
        hlsUrl: `/hls/${stream.id}/index.m3u8`,
      });
    });

    // HLS endpoint
    this.app.get("/hls/:streamId/:filename", (req, res) => {
      const { streamId, filename } = req.params;
      const stream = this.activeStreams.get(streamId);

      if (!stream) {
        return res.status(404).json({ error: "Stream not found" });
      }

      const filePath = path.join(__dirname, "hls", streamId, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }

      res.setHeader(
        "Content-Type",
        filename.endsWith(".m3u8")
          ? "application/vnd.apple.mpegurl"
          : "video/mp2t"
      );
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(filePath);
    });
  }

  setupRTMPServer() {
    const rtmpConfig = {
      rtmp: {
        port: 1935,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60,
      },
      http: {
        port: 8000,
        allow_origin: "*",
      },
      relay: {
        ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg',
        tasks: []
      }
    };

    this.nms = new NodeMediaServer(rtmpConfig);

    this.nms.on("preConnect", (id, args) => {
      console.log(
        "[NodeEvent on preConnect]",
        `id=${id} args=${JSON.stringify(args)}`
      );
      // Accept all connections for now
      return true;
    });

    this.nms.on("postConnect", (id, args) => {
      console.log(
        "[NodeEvent on postConnect]",
        `id=${id} args=${JSON.stringify(args)}`
      );
    });

    this.nms.on("doneConnect", (id, args) => {
      console.log(
        "[NodeEvent on doneConnect]",
        `id=${id} args=${JSON.stringify(args)}`
      );
    });

    this.nms.on("prePublish", (id, StreamPath, args) => {
      console.log(
        "[NodeEvent on prePublish]",
        `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
      );

      // Extract stream name from path (e.g., /live/stream1 -> stream1)
      const streamName = StreamPath.split("/").pop();
      if (streamName) {
        this.createStream(streamName, id);
      }
      
      // Accept all publish requests
      return true;
    });

    this.nms.on("postPublish", (id, StreamPath, args) => {
      console.log(
        "[NodeEvent on postPublish]",
        `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
      );
    });

    this.nms.on("donePublish", (id, StreamPath, args) => {
      console.log(
        "[NodeEvent on donePublish]",
        `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
      );

      const streamName = StreamPath.split("/").pop();
      if (streamName) {
        this.removeStream(streamName);
      }
    });

    this.nms.on("prePlay", (id, StreamPath, args) => {
      console.log(
        "[NodeEvent on prePlay]",
        `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
      );
    });

    this.nms.on("postPlay", (id, StreamPath, args) => {
      console.log(
        "[NodeEvent on postPlay]",
        `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
      );
    });

    this.nms.on("donePlay", (id, StreamPath, args) => {
      console.log(
        "[NodeEvent on donePlay]",
        `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
      );
    });
  }

  setupSocketIO() {
    this.io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      socket.on("join-stream", (streamId) => {
        socket.join(streamId);
        const stream = this.activeStreams.get(streamId);
        if (stream) {
          stream.viewers++;
          socket.emit("stream-info", {
            id: stream.id,
            name: stream.name,
            status: stream.status,
            hlsUrl: `/hls/${stream.id}/index.m3u8`,
          });
          this.io.to(streamId).emit("viewer-count", stream.viewers);
        }
      });

      socket.on("leave-stream", (streamId) => {
        socket.leave(streamId);
        const stream = this.activeStreams.get(streamId);
        if (stream && stream.viewers > 0) {
          stream.viewers--;
          this.io.to(streamId).emit("viewer-count", stream.viewers);
        }
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });
  }

  createStream(streamName, connectionId) {
    const streamId = streamName;
    const hlsDir = path.join(__dirname, "hls", streamId);

    // Create HLS directory if it doesn't exist
    if (!fs.existsSync(hlsDir)) {
      fs.mkdirSync(hlsDir, { recursive: true });
    }

    const stream = {
      id: streamId,
      name: streamName,
      viewers: 0,
      status: "starting",
      startTime: new Date(),
      connectionId: connectionId,
    };

    this.activeStreams.set(streamId, stream);

    // Start FFmpeg process to convert RTMP to HLS
    const rtmpUrl = `rtmp://localhost:1935/live/${streamName}`;
    const hlsPath = path.join(hlsDir, "index.m3u8");

    const ffmpegProcess = ffmpeg(rtmpUrl)
      .addOptions([
        "-c:v libx264",
        "-c:a aac",
        "-ac 2",
        "-strict -2",
        "-crf 18",
        "-profile:v baseline",
        "-maxrate 400k",
        "-bufsize 1835k",
        "-pix_fmt yuv420p",
        "-hls_time 10",
        "-hls_list_size 6",
        "-hls_wrap 10",
        "-start_number 1",
      ])
      .output(hlsPath)
      .on("start", (commandLine) => {
        console.log("FFmpeg process started:", commandLine);
        stream.status = "streaming";
        this.io.emit("stream-started", {
          id: stream.id,
          name: stream.name,
          hlsUrl: `/hls/${stream.id}/index.m3u8`,
        });
      })
      .on("error", (err) => {
        console.error("FFmpeg error:", err);
        stream.status = "error";
        this.io.emit("stream-error", {
          id: stream.id,
          name: stream.name,
          error: err.message,
        });
      })
      .on("end", () => {
        console.log("FFmpeg process ended for stream:", streamName);
        stream.status = "ended";
        this.io.emit("stream-ended", {
          id: stream.id,
          name: stream.name,
        });
      });

    ffmpegProcess.run();
    stream.ffmpegProcess = ffmpegProcess;

    console.log(`Stream created: ${streamName} (${streamId})`);
  }

  removeStream(streamName) {
    const stream = this.activeStreams.get(streamName);
    if (stream) {
      if (stream.ffmpegProcess) {
        stream.ffmpegProcess.kill("SIGTERM");
      }

      // Clean up HLS files after a delay
      setTimeout(() => {
        const hlsDir = path.join(__dirname, "hls", streamName);
        if (fs.existsSync(hlsDir)) {
          fs.rmSync(hlsDir, { recursive: true, force: true });
        }
      }, 30000); // 30 seconds delay

      this.activeStreams.delete(streamName);
      this.io.emit("stream-removed", { id: streamName });
      console.log(`Stream removed: ${streamName}`);
    }
  }

  start(port = 3000) {
    this.nms.run();
    this.server.listen(port, () => {
      console.log(`🚀 Video Streaming Server running on port ${port}`);
      console.log(`📺 RTMP Server running on port 1935`);
      console.log(`🌐 Web interface: http://localhost:${port}`);
      console.log(
        `📡 OBS Studio RTMP URL: rtmp://localhost:1935/live/YOUR_STREAM_NAME`
      );
    });
  }
}

// Start the server
const streamingServer = new VideoStreamingServer();
streamingServer.start(3000);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down server...");
  streamingServer.nms.stop();
  process.exit(0);
});

module.exports = VideoStreamingServer;
