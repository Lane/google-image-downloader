var ImagesClient = require('google-images');
var json = require('json-update');
var argv = require('minimist')(process.argv.slice(2));
var _unionBy = require('lodash.unionby');
var _pick = require('lodash.pick');
var saver = require('./image-saver');

var searchData = {};
var defaultOptions = {
  start: 0,
  type: 'photo',
  max: 9
};
json.config({deep:true});

function updateData(term, newData, cb) {
  json.load("data.json", function(err, obj) {
    if (typeof err !== "undefined" && err !== null) {
      console.log("Error loading json: " + err.message);
      cb(err);
    } else {
      var data = {};
      data[term] = _unionBy(obj[term], newData[term], 'url');
      json.update("data.json", data, function (err) {
        if (typeof err !== "undefined" && err !== null) {
          console.log("Error updating json: " + err.message);
          cb(err);
        } else {
          cb(null, data);
        }
      });
    }
  });

}

function startDownload() {
  json.load("data.json", function(err, obj) {
    if (typeof err !== "undefined" && err !== null) {
      console.log("Error loading json: " + err.message);
    } else {
      saver(obj, 0, function() {
        console.log("finished downloading images.");
      });
    }
  });
}

function search(term, pageNum, maxPages) {
  var client = new ImagesClient(argv.id, argv.key);
  return client.search(term, { page: pageNum*10, type: options.type })
    .then(function (images) {
      var data = {};
      data[term] = images;
      updateData(term, data, function(err, data) {
        if (pageNum < maxPages) {
          return search(term, (pageNum+1), maxPages);
        } else {
          return data;
        }
      });
    })
    .catch(function(err) {
      console.log(err);
      if (pageNum < maxPages) {
        return search(term, (pageNum+1), maxPages);
      } else {
        return "done";
      }
    });
}

if (argv.term) {
  if (!argv.hasOwnProperty("id")) {
    console.log("error: must specify custom search id with --id.");
    return;
  }
  if (!argv.hasOwnProperty("key")) {
    console.log("error: must specify custom search api key with --key.");
    return;
  }
  var options = Object.assign(defaultOptions, _pick(argv, [
    'type',
    'start',
    'max',
    'folder'
  ]));
  search(argv.term, options.start, options.max).then(function(d) {
    console.log("finished fetching image metadata.");
    startDownload();
  });
} else {
  console.log("error: must specify search term with --term.");
}
