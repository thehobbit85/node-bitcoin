var commands = require('./commands'),
    rpc = require('./jsonrpc');

//===----------------------------------------------------------------------===//
// Client
//===----------------------------------------------------------------------===//
function Client(opts) {
  this.rpc = new rpc.Client(opts);
}


//===----------------------------------------------------------------------===//
// cmd
//===----------------------------------------------------------------------===//
Client.prototype.cmdDeprecated = function() {
  var args = [].slice.call(arguments);
  var cmd = args.shift();

  callRpc(cmd, args, this.rpc);
}

Client.prototype.cmd = function (method, params, callback) {
  var bitcoin_err = 0
  var counter = 0
  var new_callback
  if (Array.isArray(method)) {
    counter = method.length
    if (!counter) return callback()
    new_callback = function (err, data) {
      if (err && !(bitcoin_err++)) return callback(err)

      var cb = function (err) {
        if ((err && !(bitcoin_err++)) || !(--counter)) return callback(err)
      }
      return params(data, cb)
    }
    this.cmdDeprecated(method, new_callback)
  } else {
    new_callback = function (err, data) {
      if (err) return callback(err)
      return callback(null, data)
    }
    var args = params ? [].slice.call(params) : []
    args.unshift(method)
    args.push(new_callback)
    this.cmdDeprecated.apply(this, args)
  }
}


//===----------------------------------------------------------------------===//
// callRpc
//===----------------------------------------------------------------------===//
function callRpc(cmd, args, rpc) {
  var fn = args[args.length-1];

  // If the last argument is a callback, pop it from the args list
  if (typeof fn === 'function') {
    args.pop();
  } else {
    fn = function() {};
  }

  rpc.call(cmd, args, function(){
    var args = [].slice.call(arguments);
    args.unshift(null);
    fn.apply(this, args);
  }, function(err){
    fn(err);
  });
}

//===----------------------------------------------------------------------===//
// Initialize wrappers
//===----------------------------------------------------------------------===//
(function() {

  for (var protoFn in commands) {
    (function(protoFn) {
      Client.prototype[protoFn] = function() {
        var args = [].slice.call(arguments);
        callRpc(commands[protoFn], args, this.rpc);
      };
    })(protoFn);
  }

})();

// Export!
module.exports.Client = Client;
