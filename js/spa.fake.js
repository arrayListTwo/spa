/*
 * spa.fake.js
 * Avatar feature module
 */
/*jslint         browser : true, continue : true,
        devel  : true, indent  : 2,    maxerr   : 50,
        newcap : true, nomen   : true, plusplus : true,
        regexp : true, sloppy  : true, vars     : true,
        white  : true
      */

/* global &,spa */
spa.fake = function () {
  'use strict';
  var getPeopleList, fakeIdSerial, makeFakeId, mockSio;
  // 模拟的服务器端ID序号计数器
  fakeIdSerial = 5;
  /**
   * 创建生成模拟的服务端ID字符串的方法
   * @returns {string}
   */
  makeFakeId = function () {
    return 'id_' + String(fakeIdSerial++);
  };
  getPeopleList = function () {
    return [
      {
        name: 'Betty',
        _id: 'id_01',
        css_map: {
          top: 20,
          lft: 20,
          'beackground-color': 'rgb(128,128,128)'
        }
      },
      {
        name: 'Mike',
        _id: 'id_02',
        css_map: {
          top: 60,
          left: 20,
          'background-color': 'rgb(128,255,128)'
        }
      },
      {
        name: 'Pebbles',
        _id: 'id_03',
        css_map: {
          top: 100,
          left: 20,
          'background-color': 'rgb(128,192,192)'
        }
      },
      {
        name: 'Wilma',
        _id: 'id_04',
        css_map: {
          top: 140,
          left: 20,
          'background-color': 'rgb(192,128,128)'
        }
      }
    ];
  };
  /**
   * 定义闭包。
   * 有两个公开方法on和emit
   */
  mockSio = (function () {
    var on_sio, emit_sio, callback_map = {};
    on_sio = function (msg_type, callback) {
      callback_map[msg_type] = callback;
    };
    emit_sio = function (msg_type, data) {
      // respond to 'adduser' event with 'userupdata'
      // callback after a 3s delay
      setTimeout(function () {
        callback_map.userupdate(
          [{
            _id: makeFakeId(), name: data.name, css_map: data.css_map
          }]
        );
      }, 3000);
    };
    return {emit: emit_sio, on: on_sio};
  }());
  return {
    getPeopleList: getPeopleList,
    mockSio: mockSio
  };
}();