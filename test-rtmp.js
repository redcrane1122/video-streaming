const NodeMediaServer = require('node-media-server');

console.log('🧪 Detailed RTMP Test Server');
console.log('============================');

// Simple RTMP server for testing
const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000,
    allow_origin: '*'
  }
};

const nms = new NodeMediaServer(config);

nms.on('preConnect', (id, args) => {
  console.log('🔗 [CONNECT ATTEMPT]');
  console.log('   ID:', id);
  console.log('   Args:', JSON.stringify(args, null, 2));
  console.log('   Time:', new Date().toISOString());
  return true;
});

nms.on('postConnect', (id, args) => {
  console.log('✅ [CONNECTED SUCCESSFULLY]');
  console.log('   ID:', id);
  console.log('   Args:', JSON.stringify(args, null, 2));
  console.log('   Time:', new Date().toISOString());
});

nms.on('doneConnect', (id, args) => {
  console.log('❌ [DISCONNECTED]');
  console.log('   ID:', id);
  console.log('   Args:', JSON.stringify(args, null, 2));
  console.log('   Time:', new Date().toISOString());
});

nms.on('prePublish', (id, StreamPath, args) => {
  console.log('📡 [PUBLISH ATTEMPT]');
  console.log('   ID:', id);
  console.log('   Stream Path:', StreamPath);
  console.log('   Args:', JSON.stringify(args, null, 2));
  console.log('   Time:', new Date().toISOString());
  return true;
});

nms.on('postPublish', (id, StreamPath, args) => {
  console.log('✅ [STREAM PUBLISHED]');
  console.log('   ID:', id);
  console.log('   Stream Path:', StreamPath);
  console.log('   Args:', JSON.stringify(args, null, 2));
  console.log('   Time:', new Date().toISOString());
});

nms.on('donePublish', (id, StreamPath, args) => {
  console.log('⏹️ [STREAM STOPPED]');
  console.log('   ID:', id);
  console.log('   Stream Path:', StreamPath);
  console.log('   Args:', JSON.stringify(args, null, 2));
  console.log('   Time:', new Date().toISOString());
});

nms.run();

console.log('✅ Test RTMP Server running on port 1935');
console.log('📡 Ready for OBS connection');
console.log('\n🔧 OBS Studio Settings to try:');
console.log('   Option 1: Server: rtmp://localhost:1935/live, Key: test');
console.log('   Option 2: Server: rtmp://127.0.0.1:1935/live, Key: test');
console.log('   Option 3: Server: rtmp://localhost:1935, Key: live/test');
console.log('\n⏳ Waiting for OBS connection...');
console.log('   (Click "Start Streaming" in OBS now)');
console.log('\nPress Ctrl+C to stop');

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down test server...');
  nms.stop();
  process.exit(0);
});
