/*
 * spa.data.js
 * Avatar feature module
 */
/*jslint         browser : true, continue : true,
        devel  : true, indent  : 2,    maxerr   : 50,
        newcap : true, nomen   : true, plusplus : true,
        regexp : true, sloppy  : true, vars     : true,
        white  : true
      */

/* global $, io, spa */
spa.data = function () {
  'use strict';
  var
    stateMap = {sio: null},
    makeSio, getSio, initModule;
  makeSio = function () {
    // 使用/chat名字空间，创建socket连接
    var socket = io.connect('/chat');
    return {
      // 确保emit方法向服务器发送与给定事件名相关的数据
      emit: function (event_name, data) {
        socket.emit(event_name, data);
      },
      // 确保on方法注册了给定事件名的回调函数。
      // 从服务器接收到的任何事件数据会传回给回调函数
      on: function (event_name, callback) {
        socket.on(event_name, function () {
          callback(arguments);
        })
      }
    }
  };
  getSio = function () {
    if (!stateMap.sio) {
      stateMap.sio = makeSio();
    }
    return stateMap.sio;
  };
  initModule = function () {
  };
  return {
    getSio: getSio,
    initModule: initModule
  };
}();