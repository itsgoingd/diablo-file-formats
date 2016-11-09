'use strict';

var fs = require('fs'),
    pathLib = require('path'),
    Cel = require('./cel'),
    cel_decode = require('./cel_decode');

var cl2Config = JSON.parse(fs.readFileSync(__dirname + '/config/cl2.json'));

function Cl2File(celFiles, path) {
    this.celFiles = celFiles;
    this.path = path;

    // plrgfx/warrior/wls/wlsst.cl2 -> wlsst
    this.name = pathLib.basename(this.path, '.cl2');
}

var ARCHIVE_IMAGE_COUNT = 8;

function getFrameDimensions(cl2Name) {
    var entry = cl2Config[cl2Name];
    if (typeof entry == 'undefined') {
        return [96, 96];
    }

    return [entry.width, entry.height];
}

Cl2File.prototype.decodeFrames = function(palFile) {
    var frameDimensions = getFrameDimensions(this.name);
    var frameWidth = frameDimensions[0];
    var frameHeight = frameDimensions[1];

    // Decode all frames within each image with the appropriate decoder.
    var decodedImages = new Array(this.celFiles.length);
    for (var i = 0; i < decodedImages.length; i++) {
        var frames = this.celFiles[i].frames;
        var decodedFrames = new Array(frames.length);
        for (var j = 0; j < decodedFrames.length; j++) {
            var frameData = frames[j];
            var frameDecoder = cel_decode.getCl2FrameDecoder();
            decodedFrames[j] = frameDecoder(frameData, frameWidth, frameHeight, palFile);
        }

        decodedImages[i] = decodedFrames;
    }

    return decodedImages;
};

function _load(buffer, cl2Path) {
    // TODO: archives only
    if (buffer.readUInt32LE(0) !== 32) {
        console.log('not an archive file!!');
        return null;
    }

    var i;
    var offset = 0;

    // Header offsets.
    var headerOffsets = new Array(ARCHIVE_IMAGE_COUNT);
    for (i = 0; i < headerOffsets.length; i++) {
        headerOffsets[i] = buffer.readUInt32LE(offset);
        offset += 4;
    }

    // Process the images. Each image content is a CEL file.
    var celFiles = new Array(headerOffsets.length);
    for (i = 0; i < celFiles.length; i++) {
        var imageBuffer = buffer.slice(headerOffsets[i]);
        celFiles[i] = Cel.load(imageBuffer, cl2Path);
    }

    return new Cl2File(celFiles, cl2Path);
}

module.exports = {
    load: _load
};
