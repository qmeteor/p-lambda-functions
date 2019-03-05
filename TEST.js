// /**
//  * Created by Bien on 2018-03-16.
//  */
// .size({bufferStream: true}, function (err, size) {
//     this.resize(MAX_WIDTH, MAX_HEIGHT);
//     this.write(replaceExt(tempLocalFilename, '.jpg'), function (err) {
//         if (err) {
//             console.log('error while writing: ' + err);
//         } else {
//             console.log('written');
//             if (replaceExt(tempLocalFilename, '.jpg')) {
//                 const readStream2 = fs.createReadStream(replaceExt(tempLocalFilename, '.jpg'));
//                 readStream2.on('open', function () {
//                     s3.putObject({
//                         Bucket: dstBucket,
//                         Key: dstKey,
//                         Body: readStream2
//                     }, function (err, response) {
//                         if (err) {
//                             console.error(
//                                 'Unable to resize ' + srcBucket + '/' + srcKey +
//                                 ' and upload to ' + dstBucket + '/' + dstKey +
//                                 ' due to an error: ' + err
//                             );
//                         } else {
//                             console.log(
//                                 'Successfully converted to ' + dstBucket + '/' + dstKey +
//                                 ' and uploaded to ' + dstBucket + '/' + dstKey
//                             );
//                             context.done();
//                             callback(null, 'message');
//                         }
//                     });
//                 });
//             }
//         }
//     });
// });