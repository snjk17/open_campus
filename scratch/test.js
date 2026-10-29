const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws'); // ws might not be globally installed, let's check native or simple http

