var util = require('util');
var Scout = require('zetta-scout');
var noble = require('noble');
var Bean = require('./bean');

var BEAN_SERVICE_ID = [ 'a495ff10c5b14b44b5121370f02d74de' ];

var BeanScout = module.exports = function(beanNames) {
  Scout.call(this);

};
util.inherits(BeanScout, Scout);

BeanScout.prototype.init = function(cb) {
  noble.on('discover', this._beanDiscovered.bind(this));
  noble.on('stateChange', function(state) {
    if (state === 'poweredOn') {
      noble.startScanning(BEAN_SERVICE_ID);
    }
  });
  cb();
};

BeanScout.prototype._beanDiscovered = function(data) {
  var self = this;
  var query = this.server.where({ type: 'ble-bean', uuid: data.uuid });
  
  var connect = function(bean) {
    bean.call('connect', function(err) {});
  };
  
  this.server.find(query, function(err, results) {
    if (results.length) {
      var bean = self.provision(results[0], Bean, data);
      if (bean) {
        connect(bean);
      }
    } else {
      var bean = self.discover(Bean, data);
      connect(bean);
    }
  });
};




