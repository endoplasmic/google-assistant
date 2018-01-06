'use strict';

const grpc = require('grpc');
const embeddedAssistant = require('../lib/google/assistant/embedded/v1alpha2/embedded_assistant_pb');

const requestSerialize = (value) => {
  if (!(value instanceof embeddedAssistant.AssistRequest)) {
    throw new Error('Expected argument of type google.assistant.embedded.v1alpha2.AssistRequest');
  }
  return new Buffer(value.serializeBinary());
}

const requestDeserialize = (buffer) => {
  return embeddedAssistant.AssistRequest.deserializeBinary(new Uint8Array(buffer));
}

const responseSerialize = (value) => {
  if (!(value instanceof embeddedAssistant.AssistResponse)) {
    throw new Error('Expected argument of type google.assistant.embedded.v1alpha2.AssistResponse');
  }
  return new Buffer(value.serializeBinary());
}

const responseDeserialize = (buffer) => {
  return embeddedAssistant.AssistResponse.deserializeBinary(new Uint8Array(buffer));
}

// build the service
const EmbeddedAssistantService = exports.EmbeddedAssistantService = {
  converse: {
    path: '/google.assistant.embedded.v1alpha2.EmbeddedAssistant/Assist',
    requestStream: true,
    responseStream: true,
    requestType: embeddedAssistant.AssistRequest,
    responseType: embeddedAssistant.AssistResponse,
    requestSerialize,
    requestDeserialize,
    responseSerialize,
    responseDeserialize,
  },
};

// create the client
exports.EmbeddedAssistantClient = grpc.makeGenericClientConstructor(EmbeddedAssistantService);
