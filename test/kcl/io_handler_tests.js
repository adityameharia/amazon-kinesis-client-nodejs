/***
Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
***/

'use strict';


var chai = require('chai');
var expect = chai.expect;
var should = chai.should();
var sinon = require('sinon');
var util = require('util');

var IOHandler = require('../../lib/kcl/io_handler');

// Local stub to capture stdout/stderr.
function captureStream(stream) {
  var origWrite = stream.write;
  var buffer = '';

  stream.write = function(chunk, encoding, callback) {
    buffer += chunk.toString();
    origWrite.apply(stream, arguments);
    return true;
  };

  return {
    unhook: function unhook() {
      stream.write = origWrite;
    },
    captured: function() {
      return buffer;
    },
    readLast: function() {
      var lines = buffer.split('\n');
      return lines[lines.length - 2];
    }
  };
}

describe('io_handler_tests', function() {
  var stdoutHook = null;
  var stderrHook = null;
  var ioHandler = new IOHandler(process.stdin, process.stdout, process.stderr);

  beforeEach(function() {
    stdoutHook = captureStream(process.stdout);
    stderrHook = captureStream(process.stderr);
  });

  afterEach(function() {
    stdoutHook.unhook();
    stderrHook.unhook();
  });

  after(function() {
    ioHandler.destroy();
  });

  it('should read line', function(done) {
    ioHandler.on('line', function(line) {
      expect(line).to.equal('line1');
      ioHandler.removeAllListeners('line');
      done();
    });
    process.stdin.emit('data', 'line1\n');
  });

  it('should write to stdout', function(done) {
    ioHandler.writeLine('{"action":"status","responseFor":"initialize"}', function(err) {
      expect(stdoutHook.readLast()).to.equal('{"action":"status","responseFor":"initialize"}');
      done();
    });
  });

  it('should write error messages to stderr', function(done) {
    ioHandler.writeError('an error message');
    expect(stderrHook.captured()).to.equal('an error message\n');
    done();
  });

  it('should not read line after IO handler is destroyed', function(done) {
    var callback = sinon.spy();
    ioHandler.on('line', callback);
    process.stdin.emit('data', 'line1\n');
    expect(callback.calledOnce).to.be.equal(true);
    ioHandler.destroy();
    process.stdin.emit('data', 'line2\n');
    expect(callback.calledTwice).to.be.equal(false);
    ioHandler.removeListener('line', callback);
    done();
  });
});
