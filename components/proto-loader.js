const path = require('path');
const protobuf = require('protobufjs');

const protoRoot = new protobuf.Root();
protoRoot.resolvePath = (origin, target) => {
  // we need to resolve each import to the lib directory instead of this one
  return protobuf.util.path.resolve(origin, path.resolve(__dirname, '../lib', target));
};

module.exports = protoRoot;
