
// dependencies
var async = require('async');
var AWS = require('aws-sdk');
var gm = require('gm')
    .subClass({ imageMagick: true }); // Enable ImageMagick integration.
var util = require('util');
var fs = require('fs');

// constants
var MAX_WIDTH  = 800;
var MAX_HEIGHT = 600;

// get reference to S3 client
var s3 = new AWS.S3();

exports.handler = function (event, context) {
    // Read options from the event.
    console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
    var srcBucket = event.Records[0].s3.bucket.name;
    // Object key may have spaces or unicode non-ASCII characters.
    var srcKey =
        decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
    var dstBucket = "thumbs";
    // srcKey like 2/1/image-id.jp2
    // for base we want 2/1/image-id

    var dstKeyBase = srcKey.substring(0, srcKey.lastIndexOf("."));

    var dstKey = dstKeyBase + "/full/" + MAX_WIDTH + "," + MAX_HEIGHT + "/0/default.jpg";

    console.log("srcKey: " + srcKey);
    console.log("dstKey: " + dstKey);

    // Download the image from S3, transform, and upload to a different S3 bucket.
    var file = fs.createWriteStream('/tmp/object.jp2');
    s3.getObject({
        Bucket: srcBucket,
        Key: srcKey
    }, function (err, data) {
        if (err) {
            console.log('error while reading: ' + err);
        }
        else {
            fs.writeFile('/tmp/object.jp2', data.Body, function (err) {
                if (err) {
                    console.log('error while writing: ' + err);
                }
                else {
                    console.log('got object');

                    if (fileExists('/tmp/object.jp2')) {
                        console.log('got to thumbnail');

                        var readStream = fs.createReadStream('/tmp/object.jp2');
                        gm(readStream, '/tmp/object.jp2')
                            .size({bufferStream: true}, function (err, size) {
                                this.resize(MAX_WIDTH, MAX_HEIGHT)
                                this.write('/tmp/object.jpg', function (err) {
                                    if (err) {
                                        console.log('error while writing: ' + err);
                                    }
                                    else {
                                        console.log('written');
                                        if (fileExists('/tmp/object.jpg')) {
                                            var readStream2 = fs.createReadStream('/tmp/object.jpg');
                                            readStream2.on('open', function () {
                                                s3.putObject({
                                                    Bucket: dstBucket,
                                                    Key: dstKey,
                                                    Body: readStream2
                                                }, function (err, response) {
                                                    console.log('got to last callback');
                                                    if (err) {
                                                        console.log(err);
                                                    } else {
                                                        console.log('good');
                                                        context.done();
                                                    }
                                                });
                                            });
                                        }
                                    }
                                });
                            });
                    }
                }
            });
        }
    });
};

function fileExists(filename) {
    try {
        stats = fs.lstatSync(filename);
        if(stats.isFile()) {
            // yes it is
            console.log('found ' + filename);
            return true;
        }
    }
    catch(e) {
        // didn't exist at all
        console.log('could not find ' + filename);
        return false;
    }
    return false;
}