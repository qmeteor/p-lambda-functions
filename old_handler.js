'use strict';

const async = require('async');
const AWS = require('aws-sdk');
const gm = require('gm')
    .subClass({ imageMagick: true });
const util = require('util');
const uuidv1 = require('uuid/v1');
const readChunk = require('read-chunk');
const fileType = require('file-type');

// reference libraries
const docClient = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();


module.exports.upload = (event, context, callback) => {
    // log event to cloudwatch
    console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));

    const srcBucket = 'retouch-assets';
    const srcKey = event.originalName;

    const userId = event.userId;
    const projectId = event.projectId;

    const params = {
        TableName: 'image-table',
        Item: {
            userId: userId,
            projectId,
            imageId: userId + '/' + projectId + '/' + srcKey,
            srcBucket: srcBucket,
            originalName: srcKey,
            fileName: userId + '/' + projectId + '/' + srcKey,
            dateUploaded: Date.UTC,
            notes: 'none',
            url: 'no location',
            processedUrl: 'no location',
            imageTags: 'none'
        }
    };

    docClient.put(params, function(err, data) {
        if(err) {
            console.log(err);
            callback(err);
        } else {
            console.log(data);
            const response = {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Upload function successful',
                    data,
                }),
            };
            callback(null, response);
        }
    });

// Use this code if you don't use the http event with the LAMBDA-PROXY integration
// callback(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });
};


module.exports.convert = (event, context, callback) => {
    // log event to cloudwatch
    console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));

    const srcBucket = 'retouch-assets';
    const srcKey = event.userId + '/' + event.projectId + '/' + event.originalName;

    const dstBucket = srcBucket + '-resized';
    const dstKey = 'resized-' + srcKey;
    // Validate source and destination are different buckets.
    if(srcBucket == dstBucket) {
        callback('Source and destination buckets are the same');
        return;
    }

    // Validate image type
    // Allowed image types
    const allowed = ['jpg', 'png', 'CR2', 'tif'];

    // Infer the image type.
    const extensionExists = srcKey.match(/\.([^.]*)$/);
    if (!extensionExists) {
        callback("Could not determine the image type.");
        return;
    }
    const extension = extensionExists[1];
    if (!allowed.includes(extension)) {
        console.log(`Unsupported image type: ${extension}`);
        callback(`Unsupported image type: ${extension}`);
        return;
    }

    // Download the image from s3, transform, and upload to a different s3 bucket.
    async.waterfall([
        function download(next) {
            // Download the image from s3 into a buffer.
            console.log('Downloading from s3');
            s3.getObject({
                    Bucket: srcBucket,
                    Key: srcKey
                },
                next)
        },
        function transform(response, next) {
            console.log('Transforming image');
            gm(response.Body)
                .resize(240, 240)
                .noProfile()
                .toBuffer('jpeg', function(err, buffer) {
                    if(err) {
                        console.log('Error inside toBuffer');
                        next(err);
                    } else {
                        next(null, response.ContentType, buffer);
                    }
                });
            // .size(function(err, size) {
            //     if(err) {
            //         console.log('Error: ', err);
            //     }
            //     const width = 240;
            //     const height = 240;
            //     console.log(`width: ${width} height: ${height}`);
            //     this.resize(width, height)
            //         .toBuffer('png', function(err, buffer) {
            //             if(err) {
            //                 console.log('Error inside toBuffer');
            //                 next(err);
            //             } else {
            //                 next(null, response.ContentType, buffer);
            //             }
            //         });
            // });
        },
        function upload(contentType, data, next) {
            // stream the transformed image to the new s3 bucket.
            console.log('streaming to retouch-assets-resized');
            s3.putObject({
                Bucket: dstBucket,
                Key: dstKey,
                Body: data,
                ContentType: contentType
            }, next)
        }
    ], function(err) {
        if(err) {
            console.error(
                'Unable to resize ' + srcBucket + '/' + srcKey +
                ' and upload to ' + dstBucket + '/' + dstKey +
                ' due to an error: ' + err
            );
        } else {
            console.log(
                'Successfully resized ' + srcBucket + '/' + srcKey +
                ' and uploaded to ' + dstBucket + '/' + dstKey
            );
        }

        callback(null, 'message');
    });
};
