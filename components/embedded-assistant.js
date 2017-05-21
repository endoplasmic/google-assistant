'use strict';

const grpc = require('grpc');
const embeddedAssistant = require('../lib/google/assistant/embedded/v1alpha1/embedded_assistant_pb');

const requestSerialize = (value) => {
  if (!(value instanceof embeddedAssistant.ConverseRequest)) {
    throw new Error('Expected argument of type google.assistant.embedded.v1alpha1.ConverseRequest');
  }
  return new Buffer(value.serializeBinary());
}

const requestDeserialize = (buffer) => {
  return embeddedAssistant.ConverseRequest.deserializeBinary(new Uint8Array(buffer));
}

const responseSerialize = (value) => {
  if (!(value instanceof embeddedAssistant.ConverseResponse)) {
    throw new Error('Expected argument of type google.assistant.embedded.v1alpha1.ConverseResponse');
  }
  return new Buffer(value.serializeBinary());
}

const responseDeserialize = (buffer) => {
  return embeddedAssistant.ConverseResponse.deserializeBinary(new Uint8Array(buffer));
}

// build the service
const EmbeddedAssistantService = exports.EmbeddedAssistantService = {
  converse: {
    path: '/google.assistant.embedded.v1alpha1.EmbeddedAssistant/Converse',
    requestStream: true,
    responseStream: true,
    requestType: embeddedAssistant.ConverseRequest,
    responseType: embeddedAssistant.ConverseResponse,
    requestSerialize,
    requestDeserialize,
    responseSerialize,
    responseDeserialize,
  },
};

// create the client
exports.EmbeddedAssistantClient = grpc.makeGenericClientConstructor(EmbeddedAssistantService);
