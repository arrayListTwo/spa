/**
 * app.js - Express server static files
 */
/*jslint         browser : true, continue : true,
        devel  : true, indent  : 2,    maxerr   : 50,
        newcap : true, nomen   : true, plusplus : true,
        regexp : true, sloppy  : true, vars     : true,
        white  : true
      */
/*global */
// -----Begin module scope variables -----
'use strict';

var
  http = require('http'),
  express = require('express'),
  routes = require('./lib/routes'),
  app = express(),
  server = app.listen(80, '0.0.0.0', function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('running at http://' + host + ':' + port)
  });
// -----End module scrope variables -----
// -----Begin server configuration -----
// 在每个环境中添加中间件
app.configure(function () {
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  // app.use(express.basicAuth('user', 'spa'));
  app.use(express.static(__dirname + '/public'));
  app.use(app.routes);
});
// 在开发环境中，添加logger方法，配置errorHandler
app.configure('development', function () {
  app.use(express.logger());
  app.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
});
// 在生产环境中，使用默认选项的errorHandler中间件
app.configure('production', function () {
  app.use(express.errorHandler());
});
// ----- End server configuration -----

// 设置路由
routes.configRoutes(app, server);

// Begin start server -----
// server.listen(3000);
// console.log('Express server Listening on port %d in %s mode',
//   server.address().port, app.settings.env);
// End start server