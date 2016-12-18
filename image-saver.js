var fs = require('fs'),
    request = require('request'),
    jsonfile = require('jsonfile');
var wget = require('wget-improved');
var url = require("url");
var path = require("path");

var options = {
  baseFolder: "img"
};

function _onTimeout(req, file, cb) {
  req.abort();
  fs.unlink(file);
  console.log("timed out: ", file);
  cb();
}

function _checkDirectory(directory, callback) {
  fs.stat(directory, function(err, stats) {
    //Check if error defined and the error code is "not exists"
    if (err && err.code === "ENOENT") {
      //Create the directory, call the callback.
      fs.mkdir(directory, callback);
    } else {
      //just in case there was a different error:
      callback(err);
    }
  });
}

function downloadImage(uri, filename, callback){
  var cb = callback;
  fs.stat(filename, function(err, stat) {
    if (err === null) {
      console.log("skipping: " + filename);
      cb();
    } else {
      console.log("starting: ", filename);
      var req = request(uri);
      var timeout = setTimeout(function() {
        _onTimeout(req,filename,cb);
      }, 10000);
      req.on('error', function(err) {
        console.log(err, filename);
        clearTimeout(timeout);
        cb();
      });
      req.on('data', function() {
        // keep alive if receiving data
        clearTimeout(timeout);
        timeout = setTimeout(function() {
          _onTimeout(req,filename,cb);
        }, 10000);
      });
      req.on('end', function() {
        clearTimeout(timeout);
        console.log("finished: ", filename);
        cb();
      });
      req.pipe(fs.createWriteStream(filename));
    }
  });
}

function saveImage(key, arr, i, cb) {
  if(typeof i === "undefined" || i === null) { i = 0; }
  if (i < arr.length) {
    var parsed = url.parse(arr[i].url);
    var filename = arr[i].width + "x" + arr[i].height + "_" + arr[i].size + "_" +
      path.basename(parsed.pathname);
    downloadImage(
      arr[i].url, "./" + options.baseFolder + "/" + key + "/" + filename,
      function() {
        saveImage(key, arr, (i+1), cb);
      }
    );
  } else {
    cb();
  }
}

function saveImages(obj, i, cb) {
  if(typeof i === "undefined" || i === null) { i = 0; }
  var keys = Object.keys(obj);
  if (i < keys.length) {
    _checkDirectory("./" + keys[i], function(err) {
      if(err) {
        console.log("error:", err.errno);
      } else {
        saveImage(keys[i], obj[keys[i]], 0, function() {
          console.log("finished retrieving images for: ", keys[i]);
          saveImages(obj, (i+1), cb);
        });
      }
    });
  } else {
    cb();
  }
}

module.exports = saveImages;
