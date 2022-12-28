#!/usr/bin/env node

var AWS = require('aws-sdk'),
  commander = require('commander'),
  prompt = require('prompt'),
  optimist = require('optimist'),
  colors = require('colors'),
  spawn = require('child_process').spawn,
  async = require('async'),
  fs = require('fs'),
  ini = require('ini'),
  url = require('url'),
  path = require("path"),
  _ = require('lodash');

function outputConfig(config) {
  return _.keys(config).map(function(item) {
    return item + '="' + config[item]+'"';
  }).join('\n')
}

function transformConfig(object) {
  var result = {};
  _.keys(object).map(function(key) {
    if(key.indexOf('config-file') === -1){
      result[String(key).toUpperCase().replace(/\-/g, '_')] = object[key];
    }
  });
  return result;
}

var appName = path.basename(process.argv[1]).replace('.js', '');
var defaults = {
  'config-file': appName,
  'download-dir': '.',
  'delete-downloads': '1',
  'upload-acl': 'public-read',
  'upload-dir': 'videos',
  'upload-region': 'us-east-1',
  'upload-storage-class': 'REDUCED_REDUNDANCY',
  'input-key': 'videos',
  'info-concurrency': 10,
  'download-concurrency': 2
};
var config = {
  default: {}
};
if(fs.existsSync(path.resolve('./.aws/credentials'))) {
  config = ini.parse(fs.readFileSync('./.aws/credentials', 'utf-8'));
} else if(fs.existsSync(path.resolve(process.env.HOME+'/.aws/credentials'))) {
  config = ini.parse(fs.readFileSync(process.env.HOME+'/.aws/credentials', 'utf-8'));
}
defaults['aws-access-key-id'] = config.default.aws_access_key_id || '';
defaults['aws-secret-access-key'] = config.default.aws_secret_access_key || '';

commander
  .version(require('./../package.json').version)
  // .command('init', 'Start a new project, creates a config file', {isDefault: true})
  .arguments('<command> [params]')
  .action(function (command, params, args) {
    if (command === 'init') {
      prompt.override = optimist.argv;
      prompt.message = colors.america('['+appName+']');

      prompt.start();

      var schema = {
        properties: {
          'config-file': {
            description: 'CONFIG FILE',
            pattern: /^[a-zA-Z0-9\-]+$/,
            message: 'CONFIG_FILE must be only letters, numbers, or dashes.',
            type: 'string',
            required: true,
            default: defaults['config-file']
          },
          'aws-access-key-id': {
            description: 'AWS_ACCESS_KEY_ID',
            pattern: /^[A-Z0-9]+$/,
            message: 'AWS_ACCESS_KEY_ID must be only uppercase letters and numbers.',
            type: 'string',
            required: true,
            default: defaults['aws-access-key-id']
          },
          'aws-secret-access-key': {
            description: 'AWS_SECRET_ACCESS_KEY',
            type: 'string',
            required: true,
            default: defaults['aws-secret-access-key']
          },
          'download-dir': {
            description: 'DOWNLOAD_DIR',
            type: 'string',
            required: true,
            default: defaults['download-dir']
          },
          'delete-downloads': {
            description: 'DELETE_DOWNLOADS',
            type: 'number',
            required: false,
            default: defaults['delete-downloads']
          },
          'upload-acl': {
            pattern: /^(private|public-read|public-read-write|authenticated-read|aws-exec-read|bucket-owner-read|bucket-owner-full-control)$/i,
            message: 'UPLOAD_ACL must be one of private, public-read, public-read-write, authenticated-read, aws-exec-read, bucket-owner-read or bucket-owner-full-control.',
            description: 'UPLOAD_ACL',
            type: 'string',
            required: true,
            default: defaults['upload-acl']
          },
          'upload-bucket': {
            pattern: /^[a-z0-9\-]+$/,
            message: 'UPLOAD_BUCKET must be only lowercase letters, numbers, or dashes.',
            description: 'UPLOAD_BUCKET',
            type: 'string',
            required: true
          },
          'upload-dir': {
            pattern: /^[a-zA-Z0-9\-\_]+$/,
            message: 'UPLOAD_DIR must be only letters, numbers, dashes or underscores.',
            description: 'UPLOAD_DIR',
            type: 'string',
            required: true,
            default: defaults['upload-dir']
          },
          'upload-region': {
            pattern: /^(us-east-1)$/,
            message: 'UPLOAD_REGION must be us-east-1.',
            description: 'UPLOAD_REGION',
            type: 'string',
            required: true,
            default: defaults['upload-region'],
            ask: function() {
              // don't even bother asking for upload-region since it can only be a single value
              return false;
            }
          },
          'upload-storage-class': {
            pattern: /^(STANDARD|REDUCED_REDUNDANCY|STANDARD_IA)$/i,
            message: 'UPLOAD_STORAGE_CLASS must be one of STANDARD, REDUCED_REDUNDANCY or STANDARD_IA.',
            description: 'UPLOAD_STORAGE_CLASS',
            type: 'string',
            required: true,
            default: defaults['upload-storage-class']
          },
          'input-key': {
            description: 'INPUT_KEY',
            type: 'string',
            required: true,
            default: defaults['input-key']
          },
          'info-concurrency': {
            description: 'INFO_CONCURRENCY',
            type: 'number',
            required: false,
            default: defaults['info-concurrency']
          },
          'download-concurrency': {
            description: 'DOWNLOAD_CONCURRENCY',
            type: 'number',
            required: false,
            default: defaults['download-concurrency']
          }
        }
      };
      prompt.get(schema, function (err, options) {
        if(err) {
          console.log(err);
        } else {
          var config_path = path.join(cwd, '.'+options['config-file']),
              overwrite = false;

          process.argv.map(function(arg){
            if (typeof arg === 'string' &&
              (arg.toLowerCase().indexOf('-f') === 0 || arg.toLowerCase().indexOf('--force') === 0)
            ) {
              overwrite = true;
            }
          });
          function writeFile(file, opts){
            fs.writeFileSync(file, outputConfig(transformConfig(opts)));
            console.log(colors.america('['+appName+']')+' '+colors.bold('Config file created')+': '+file);
          }
          if(fs.existsSync(config_path)){
            if(overwrite) {
              writeFile(config_path, options);
            } else {
              console.log(colors.america('['+appName+']'), colors.bold('Config file exist!'), 'Please run "'+appName+' init --force" to overwrite it.')
            }
          } else {
            writeFile(config_path, options);
          }
        }
      })
    } else {
      console.log(process.argv)
      // if (input.length === 0) {
      //   console.log(colors.america('['+appName+']')+' '+colors.bold('No input specified'));
      //   process.exit();
      // }
      try {
        s3.listBuckets(function (err, data) {
          if (err) {
            console.error(colors.america('['+appName+']'), 'AWS '+err.code+':', 'Check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY!');
          } else {
            if(typeof data['Buckets'] == 'object') {
              var bucketExists = _.find(data['Buckets'], ['Name', upload_bucket]);
              if(bucketExists){
                n(null, true)
              } else {
                console.error(colors.america('['+appName+']'), 'AWS NoSuchBucket: The specified bucket does not exist. '+upload_bucket);
                commander.help();
              }
            }
          }
        });
      } catch (e) {
        // console.log('error:',e.message)
      }
    }
  })
  .option('-c, --config-file <file>', 'Config file to use env.CONFIG_FILE')
  .option('-d, --download-dir <directory>', 'Video download directory env.DOWNLOAD_DIR', '.')
  .option('-x, --delete-downloads', 'Delete downloads after upload to S3 env.DELETE_DOWNLOADS', parseInt)
  .option('-a, --upload-acl <acl>', 'S3 ACL env.UPLOAD_ACL', /^(private|public-read|public-read-write|authenticated-read|aws-exec-read|bucket-owner-read|bucket-owner-full-control)$/i, 'public-read')
  .option('-b, --upload-bucket <bucket-name>', 'S3 Bucket env.UPLOAD_BUCKET')
  .option('-D, --upload-dir <dirname>', 'S3 Directory env.UPLOAD_DIR')
  .option('-r, --upload-region <region>', 'S3 Region env.UPLOAD_REGION', /^(us-east-1)$/i, 'us-east-1')
  .option('-s, --upload-storage-class <class>', 'S3 Storage Class env.UPLOAD_STORAGE_CLASS', /^(STANDARD|REDUCED_REDUNDANCY|STANDARD_IA)$/i, 'REDUCED_REDUNDANCY')
  .option('-k, --input-key <key>', 'Input JSON key to get videos eg. object.video_urls env.INPUT_KEY', 'videos')
  .option('-I, --info-concurrency <number>', 'How many files to download info for at the same time env.INFO_CONCURRENCY', parseInt)
  .option('-X, --download-concurrency <number>', 'How many files to download at the same time env.DOWNLOAD_CONCURRENCY', parseInt)
  .on('--help', function(){
    console.log('  Examples:');
    console.log('');
    console.log('    $ '+appName+' --help');
    console.log('    $ '+appName+' -h');
    console.log('');
    console.log('    $ '+appName+' ');
    console.log('    $ '+appName+' 2017.json 2016.json');
    console.log('');
    if(typeof parsedEnv === 'undefined') {
      console.log('  Example config:');
      console.log('');
      var suggestedEnv = {
        "AWS_ACCESS_KEY_ID": "YOUR AWS ACCESS KEY ID HERE",
        "AWS_SECRET_ACCESS_KEY": "YOUR AWS SECRET ACCESS KEY HERE",
        "UPLOAD_BUCKET": "fnlv",
        "UPLOAD_DIR": "videos",
        "UPLOAD_ACL": "public-read",
        "DOWNLOAD_DIR": ".",
        "INPUT_KEY": "videos",
        "DELETE_DOWNLOADS": "1",
        "INFO_CONCURRENCY": "10",
        "DOWNLOAD_CONCURRENCY": "2",
      };
      console.log(outputConfig(suggestedEnv));
    }
  })
  .parse(process.argv);

var config_file = commander.configFile || process.env['CONFIG_FILE'] || '.'+appName,  // '.videolerx'
    env = require('dotenv').load({path: config_file});

var aws_access_key_id = commander.awsAccessKeyId || process.env['AWS_ACCESS_KEY_ID'] || '',
    aws_secret_access_key = commander.awsSecretAccessKey || process.env['AWS_SECRET_ACCESS_KEY'] || '',
    upload_bucket = commander.uploadBucket || process.env['UPLOAD_BUCKET'],
    upload_dir = (commander.uploadDir || process.env['UPLOAD_DIR']) || '',
    upload_acl = (commander.uploadAcl || process.env['UPLOAD_ACL']) || '',
    upload_region = commander.uploadRegion || process.env['UPLOAD_REGION'] || 'us-east-1',
    upload_storage_class = (commander.uploadStorageClass || process.env['UPLOAD_STORAGE_CLASS']) || '',
    download_dir = commander.downloadDir || process.env['DOWNLOAD_DIR'],
    input_key = commander.inputKey || process.env['INPUT_KEY'],
    delete_downloads = commander.deleteDownloads || parseInt(process.env['DELETE_DOWNLOADS'], 10),
    info_concurrency = commander.infoConcurrency || parseInt(process.env['INFO_CONCURRENCY'], 10) || 10,
    download_concurrency = commander.downloadConcurrency || parseInt(process.env['DOWNLOAD_CONCURRENCY'], 10) || 2,
    input = commander.args.filter(function(item) { return typeof item === 'string' && item !== ''}),
    parsedEnv = env.parsed,
    video_urls = [],
    video_paths = {};

if(info_concurrency < 1){
  info_concurrency = 1
} else if(info_concurrency > 100) {
  info_concurrency = 100
}

if(download_concurrency < 1){
  download_concurrency = 1
} else if(download_concurrency > 10) {
  download_concurrency = 10
}

AWS.config.update({
  region: upload_region
});

var aswAccessKey = {
    accessKeyId: aws_access_key_id,
    secretAccessKey: aws_secret_access_key
  },
  s3 = new AWS.S3(Object.assign(aswAccessKey, {
    apiVersion: '2006-03-01'
  })),
  directoryPath = path.resolve(path.normalize(download_dir)),
  cwd = process.cwd();

if ( ! fs.existsSync(directoryPath) || ! fs.statSync(directoryPath).isDirectory()) {
  require('mkdirp').sync(directoryPath);
}
process.chdir(directoryPath);

// if (typeof upload_bucket === 'undefined'){
//   commander.help()
// }

async.auto({
  start: function(n) {
    if(input.join('').indexOf('init') !== -1) {
      return;
    }
    if(!fs.existsSync(path.resolve(path.normalize(config_file)))){
      console.log(colors.america('['+appName+']')+' '+colors.bold('Config file not found!'), 'Please run "'+appName+' init"');
      process.exit(1);
    }
    var output = '';
    output += colors.america('['+appName+']')+' '+colors.bold('running with config')+' '+ config_file;
    output += '\n- UPLOAD_ACL '+colors.inverse(upload_acl);
    output += '\n- UPLOAD_BUCKET '+colors.inverse(upload_bucket);
    output += '\n- UPLOAD_DIR '+colors.inverse(upload_dir);
    output += '\n- UPLOAD_REGION '+colors.inverse(upload_region);
    output += '\n- UPLOAD_STORAGE_CLASS '+colors.inverse(upload_storage_class);
    output += '\n- DOWNLOAD_DIR '+colors.inverse(download_dir);
    output += '\n- DELETE_DOWNLOADS '+colors.inverse(delete_downloads);
    output += '\n- INFO_CONCURRENCY '+colors.inverse(info_concurrency);
    output += '\n- DOWNLOAD_CONCURRENCY '+colors.inverse(download_concurrency);
    output += '\n- INPUT_KEY '+colors.inverse(input_key);
    output += '\n- INPUT\n'+input.join('\n');
    console.log(output);
    n(null, 'done');
  },
  videos: ['start', function(results, n) {
    console.log(colors.america('['+appName+']'), colors.bold('finding videos!'));
    input.map(function(filename) {
      sync_video_urls(filename);
    });

    console.log(colors.america('['+appName+']'),colors.bold('processing'), input.length, colors.green('input/s having'), video_urls.length, colors.green('video/s'));
    n(null, video_urls);
  }],
  info: ['videos', function(results, n) {
    async.eachLimit(results.videos, info_concurrency, get_video_info, function (err, result) {
      if(_.keys(video_paths).length > 0){
        console.log(colors.america('['+appName+']'), colors.bold('got videos info!'));
        var videos = _.keys(video_paths),
            mia = _.difference(results.videos, videos);
        if (mia.length > 0) {
          console.log(colors.america('['+appName+']'), colors.magenta("unable to download these videos"));
          console.log(mia.join('\n'))
        }
      }
      n(err, video_paths);
    });
  }],
  process: ['info', function(results, n) {
    var videos = _.keys(results.info);
    async.eachLimit(videos, download_concurrency, download_video_and(upload_to_s3_and(remove)), function (err, result) {
      if(videos.length > 0) {
        console.log(colors.america('['+appName+']'), 'Downloaded videos and uploaded them to S3!');
      }

      n(err, videos);
    });
  }],
  complete: ['process', function(results, n) {
    n(null, 'done');
  }]
}, function(err, results) {
  // console.log('err:', err);
  // console.log('results:', results);
});

function sync_video_urls(filename) {
  if (fs.existsSync(filename)) {
    var lines = fs.readFileSync(filename).toString(),
        objects = lines.split('\n');
    objects.map(function(line){
      var obj = null;
      try {
        obj = JSON.parse(line);
      } catch(e) {}
      return obj;
    }).map(function(obj){
      return obj && obj.videos;
    }).filter(function(array){
      return array && array.length > 0;  // remove []
    }).map(function(list){
      video_urls = _.concat(video_urls, list);
    });
  } else {
    // json input
    if(filename.indexOf('[') != -1 || filename.indexOf(']') != -1 || filename.indexOf('{') != -1 || filename.indexOf('}') != -1) {
      try{
        var data = JSON.parse(filename);
        if(_.size(data) > 0 ) {
          if(Array.isArray(data)) {
            data.map(function(item) {
              if(typeof item === 'string')  // array of strings
                video_urls = _.concat(video_urls, [item]);
              if(typeof item === 'object') // array of objects
                video_urls = _.concat(video_urls, [_.get(item, input_key)]);
            })
          }
          if(typeof data === 'object') { // an object
            video_urls = _.concat(video_urls, [_.get(data, input_key)]);
          }
        }
      } catch(e) {
        // do nothing, is not json
      }
    } else {
      // video url or youtube video id input
      video_urls = _.concat(video_urls, [filename]);
    }
  }
}

function get_video_info(videos, next) {
  var infos = '',
      filename = '',
      format = null,
      filesize = 0;
  var child = spawn('youtube-dl', ['--dump-json', '--id', videos]);

  child.stdout.on('data', function (data) {
    infos += data;
  });

  child.stderr.on('data', function (data) {
    console.log(data.toString());
  });

  child.on('close', function (code) {
    if (code == 0) {
      try{
        infos = JSON.parse(infos);
        filename = infos._filename;
        format = _.find(infos.formats, ['format_id', infos.format_id]);
        if(format && format.filesize) {
          filesize = format.filesize;
        }
        video_paths[videos] = {
          filename: filename,
          filesize: filesize
        };
        console.log(colors.america('['+appName+']'), colors.green('get_info'), filename, colors.yellow(videos));
      } catch(e) {
        console.log(colors.america('['+appName+']'), colors.red('get_info'), videos);
      }
    } else {
      console.log(colors.america('['+appName+']'), colors.red('get_info'), videos);
    }
    next(null, filename);
  });
}
function download_video_and(callback) {
  return function(video, next) {
    if(video){
      console.log(colors.america('['+appName+']'), colors.green('downloading'), colors.yellow(video));
      var child = spawn('youtube-dl', ['-q','--id', video]);

      child.stdout.on('data', function (data) {
        console.log(data.toString());
      });

      child.stderr.on('data', function (data) {
        console.log(data.toString());
      });

      child.on('close', function (code) {
        if (code === 0) {
          console.log(colors.america('['+appName+']'), colors.green('downloaded'), colors.yellow(video), 'to', colors.inverse(colors.green(video_paths[video].filename)));
        } else {
          console.log(colors.red('['+appName+']'), 'youtube-dl closed with code', code);
        }
        if(typeof video_paths[video] !== 'undefined') {
          callback(video_paths[video].filename, function(err, result) {
            next(err, video)
          });
        } else {
          callback(null, function(err, result) {
            next(err, video)
          });
        }

      });
    } else {
      next(null, null);
    }
  }
}
function upload_to_s3_and(callback) {
  return function (video, next) {
    if (video) {
      console.log(colors.america('['+appName+']'), colors.green('uploading'), 'to', 'https://s3.amazonaws.com/' + path.join(upload_bucket, upload_dir, colors.inverse(video)));
      var params = {
        Bucket: upload_bucket, /* required */
        Key: path.join(upload_dir, video), /* required */
        ACL: upload_acl,
        Body: fs.readFileSync(video),
        StorageClass: upload_storage_class
      };

      try {
        s3.putObject(params, function (err, data) {
          if (err) {
            console.log(colors.red('['+appName+'] error uploading'), colors.yellow(video));
            console.log('Error:', err, 'data:', data);
            // next(err, null);
          } else {
            console.log(colors.america('['+appName+']'), colors.green('uploaded'), colors.yellow('https://s3.amazonaws.com/' + path.join(upload_bucket, upload_dir, colors.inverse(video))), data);

          }
          callback(video, function(err, result) {
            next(err, video)
          });
        });
      } catch (e) {
        next(null, null)
      }
    } else {
      next(null, null)
    }
  }
}
function remove(video, done) {
  if(delete_downloads) {
    if(fs.existsSync(video)){
      fs.unlinkSync(video);
      console.log(colors.america('['+appName+']'), colors.green('removed'), colors.inverse(colors.red(video)));
    }
  }
  done(null, 'done')
}