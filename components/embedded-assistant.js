'use strict';

const grpc = require('@grpc/grpc-js');
const protoLoader = require('./proto-loader');

const embeddedAssistant = protoLoader.loadSync('google/assistant/embedded/v1alpha2/embedded_assistant.proto');
const AssistRequest = embeddedAssistant.lookupType('google.assistant.embedded.v1alpha2.AssistRequest');
const AssistResponse = embeddedAssistant.lookupType('google.assistant.embedded.v1alpha2.AssistResponse');

const requestSerialize = (value) => {
  if (!(value instanceof AssistRequest.ctor)) {
    throw new Error('Expected argument of type google.assistant.embedded.v1alpha2.AssistRequest');
  }
  return AssistRequest.encode(value).finish();
}
const requestDeserialize = buffer => AssistRequest.decode(buffer);

const responseSerialize = (value) => {
  if (!(value instanceof AssistResponse.ctor)) {
    throw new Error('Expected argument of type google.assistant.embedded.v1alpha2.AssistResponse');
  }
  return AssistResponse.encode(value).finish();
}
const responseDeserialize = buffer => AssistResponse.decode(buffer);

// build the service
const EmbeddedAssistantService = exports.EmbeddedAssistantService = {
  converse: {
    path: '/google.assistant.embedded.v1alpha2.EmbeddedAssistant/Assist',
    requestStream: true,
    responseStream: true,
    requestType: AssistRequest,
    responseType: AssistResponse,
    requestSerialize,
    requestDeserialize,
    responseSerialize,
    responseDeserialize,
  },
};

// create the client
exports.EmbeddedAssistantClient = grpc.makeGenericClientConstructor(EmbeddedAssistantService);
