var zetta = require('zetta');
var Bean = require('../');

zetta()
  .use(Bean, 'Bean1')
  .listen(1337);
