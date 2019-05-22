"use strict";

var mqtt = require('mqtt')
var {parse} = require('flatted/cjs');

function Broker(config){
  var broker = this
  broker.subscription = {} //  subscriber, topic, callback
  broker.topics = {}
  broker.endpoint = config.brokerEndpoint

  this.connect()
}

Broker.prototype.connect = function() {
  var broker = this

  if (broker.client && broker.client.connected){
    broker.client.end()
  }

  broker.client = mqtt.connect(broker.endpoint.replace('https://', 'wss://').replace('http://','ws://'))
  // broker.client.on('connect', function (c) {
  //   console.log('broker connected')
  // })
  broker.client.on('message', function (topic, message) {
    message = message.toString()
    for (let k in broker.subscription){
      if (broker.subscription[k].topic === topic){
        try {
          const dnrMsg = parse(message)
          broker.subscription[k].cb(dnrMsg)
        } catch (e) {console.log(e)}
      }
    }
  })
}

Broker.prototype.updateEndpoint = function(newBroker) {
  if (this.endpoint === newBroker){
    return
  }

  this.endpoint = newBroker
  this.connect()
}

Broker.prototype.subscribe = function(subscriber, topic, cb) {
  let that = this
  if (!this.client.connected){
    setTimeout(function(){
      that.subscribe(subscriber, topic, cb)
    }, 2000)
    return
  }
	if (this.subscription[subscriber]) {
    // updating old topic
    let oldTopic = this.subscription[subscriber].topic
    if (oldTopic === topic){
      return
    }

    if (this.topics[oldTopic]){
      this.topics[oldTopic]--
    }
    if (this.topics[oldTopic] <= 0){
      this.client.unsubscribe(oldTopic)
    }
  }

  if (!this.topics[topic]){
    this.topics[topic] = 1
    this.client.subscribe(topic)
  } else {
    this.topics[topic]++
  }

  // either updating or create new
  this.subscription[subscriber] = {topic: topic, cb:cb}
}

Broker.prototype.unsubscribe = function(subscriber) {
  for (let k in this.subscription){
    if (k === subscriber){
      var topic = this.subscription[k].topic

      if (this.topics[topic]){
        this.topics[topic]--
        if (this.topics[topic] <= 0){
          this.client.unsubscribe(topic)
        }
      }
      delete this.subscription[k]
    }
  }
}

Broker.prototype.publish = function(publisher, topic, msg) {
  this.client.publish(topic, msg)
}

module.exports = Broker