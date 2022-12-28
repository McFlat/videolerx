#!/usr/bin/env node

const path = require('path'),
    appName = path.basename(__dirname);

process.argv[1] = __dirname;
require('./lib/' + appName );