var util = require('util');
var Device = require('zetta-device');
var beanAPI = require('ble-bean');
var Color = require('color');

var Bean = module.exports = function(data) {
  Device.call(this);
  this.uuid = data.uuid;
  this.color = [0, 0, 0];
  this.accelerationX = NaN;
  this.accelerationY = NaN;
  this.accelerationZ = NaN;
  this.temperature = NaN;

  this._data = data;
  this._bean = null;
};
util.inherits(Bean, Device);

Bean.prototype.init = function(config) {
  config
    .type('ble-bean')
    .name(this._data.advertisement.localName)
    .when('disconnected', { allow: ['connect'] })
    .when('connected', { allow: ['disconnect', 'set-color'] })
    .map('connect', this.connect)
    .map('disconnect', this.disconnect)
    .map('set-color', this.setColor, [{type: 'color', name: 'color'}])
    .state('disconnected')
    .monitor('accelerationX')
    .monitor('accelerationY')
    .monitor('accelerationZ')
    .monitor('temperature');

  process.on('SIGINT', this.onExit.bind(this, {}));
  process.on('uncaughtException', this.onExit.bind(this, {onError: true}));
};


Bean.prototype.stopMonitors = function() {
  clearInterval(this._timer);

  if (this._accellCb) {
    self._bean.removeListener(this._accellCb);
  }

  if (this._tempCb) {
    self._bean.removeListener(this._tempCb);
  }
};

Bean.prototype.startMonitors = function() {
  var self = this;
  this.stopMonitors();

  this._timer = setInterval(function(){
    self._bean.requestAccell(function(){});
    self._bean.requestTemp(function(){});
  }, 50);

  this._accellCb = function(x, y, z, valid) {
    self.accelerationX = x;
    self.accelerationY = y;
    self.accelerationZ = z;
  };

  this._tempCb = function(temp, valid) {
    self.temperature = temp;
  };

  self._bean.on("accell", this._accellCb);
  self._bean.on("temp", this._tempCb);
};

Bean.prototype.onExit = function(options, err) {
  var self = this;
  if (options.onError) {
    console.error(err.stack)
    process.exit();
  }
  self.call('set-color', '#ff0000', function(){
    self.call('disconnect', function(){
      process.exit();
    });
  });
};

Bean.prototype.setColor = function(color, cb) {
  var self = this;
  color = Color(color);
  this._bean.setColor(new Buffer(color.rgbArray()), function(err) {
    if (err) {
      return cb(err);
    }

    self.color = color.rgbArray();
    cb();
  });
};

Bean.prototype.disconnect = function(cb) {
  var self = this;
  this._data.disconnect(function(err) {
    self.state = 'disconnected';
    cb(err);
  });
};

Bean.prototype.connect = function(cb) {
  var self = this;
  this.state = 'connecting';
  this._data.connect(function(err) {
    if (err) {
      self.state = 'disconnected';
      return cb(err);
    }

    self._data.discoverServices([beanAPI.UUID], function(err, services){
      if (err) {
        self.state = 'disconnected';
        self._data.disconnect(function() {});
        return cb(err);
      }
      self._bean = new beanAPI.Bean(services[0]);

      self._bean.once('ready', function(){
        self.state = 'connected';
        self.startMonitors();
        self.call('set-color', '#00ff00', function(){})
        cb();
      });

    });
  });
};

