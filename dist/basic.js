'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BasicThrottle = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _redis = require('redis');

var Redis = _interopRequireWildcard(_redis);

var _bluebird = require('bluebird');

var Bluebird = _interopRequireWildcard(_bluebird);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var RedisService = Bluebird.promisifyAll(Redis);

var $redis = Symbol('$redis');

var BasicThrottle = exports.BasicThrottle = function () {
  function BasicThrottle() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, BasicThrottle);

    if (options.redisInstance === undefined) {
      var redisOptions = Object.assign({}, {
        port: 6379,
        host: 'localhost',
        db: 0,
        retry_strategy: function retry_strategy(o) {
          if (o.error.code === 'ECONNREFUSED') {
            // End reconnecting on a specific error and flush all commands with a individual error
            return new Error('The server refused the connection');
          }
          if (o.total_retry_time > 1000 * 60 * 60) {
            // End reconnecting after a specific timeout and flush all commands with a individual error
            return new Error('Retry time exhausted');
          }
          if (o.times_connected > 10) {
            // End reconnecting with built in error
            return undefined;
          }
          // reconnect after
          return Math.max(o.attempt * 100, 3000);
        }
      }, options.redis);
      this[$redis] = RedisService.createClient(redisOptions);
    } else {
      this[$redis] = options.redisInstance;
    }
    this.keyGenerator = options.keyGenerator;
    this.options = Object.assign({}, options);
    delete this.options.redis;
    delete this.options.keyGenerator;
  }

  // on initial set, expire after initialWindow seconds.
  // if extendWindow, extend the expiry that many seconds per access

  _createClass(BasicThrottle, [{
    key: 'backoff',
    value: function backoff(state) {
      var _this = this;

      return this[$redis].incrAsync(this.keyGenerator(state)).then(function (val) {
        if (val === 1) {
          return _this[$redis].expireAsync(_this.keyGenerator(state), _this.options.initialWindow).then(function () {
            return val;
          });
        } else if (_this.options.extendWindow) {
          return _this[$redis].ttlAsync(_this.keyGenerator(state)).then(function (ttl) {
            return _this[$redis].expireAsync(_this.keyGenerator(state), ttl + _this.options.extendWindow);
          }).then(function () {
            return val;
          });
        } else {
          return val;
        }
      }).then(function (val) {
        if (val > _this.options.max) {
          if (_this.options.permaBan) {
            return _this[$redis].expireAsync(_this.keyGenerator(state), _this.options.permaBan).then(function () {
              return false;
            });
          }
          return false;
        } else {
          return true;
        }
      });
    }
  }, {
    key: 'close',
    value: function close() {
      var _this2 = this;

      this.backoff = function () {
        throw new Error('Cannot access closed throttle');
      };
      return this[$redis].quitAsync().then(function () {
        delete _this2[$redis];
      });
    }
  }]);

  return BasicThrottle;
}();