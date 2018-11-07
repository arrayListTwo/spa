/*
 * spa.fake.js
 * Avatar feature module
 */
/*jslint         browser : true, continue : true,
        devel  : true, indent  : 2,    maxerr   : 50,
        newcap : true, nomen   : true, plusplus : true,
        regexp : true, sloppy  : true, vars     : false,
        white  : true
      */

/* global &,spa */
spa.fake = function () {
  'use strict';
  var getPeopleList, peopleList, fakeIdSerial, makeFakeId, mockSio;
  // 模拟的服务器端ID序号计数器
  fakeIdSerial = 5;
  /**
   * 创建生成模拟的服务端ID字符串的方法
   * @returns {string}
   */
  makeFakeId = function () {
    return 'id_' + String(fakeIdSerial++);
  };

  // 保存模拟的人员列表，映射数组
  peopleList = [
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

  /* getPeopleList = function () {
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
  }; */
  /**
   * 定义闭包。
   * 有两个公开方法on和emit
   */
  mockSio = (function () {
    var on_sio, emit_sio, emit_mock_msg,
      send_listchange, listchange_idto
      , callback_map = {};
    on_sio = function (msg_type, callback) {
      callback_map[msg_type] = callback;
    };
    emit_sio = function (msg_type, data) {
      // respond to 'adduser' event with 'userupdata'
      // callback after a 3s delay
      var person_map, i;
      if (msg_type === 'adduser' && callback_map.userupdate) {
        setTimeout(function () {
          person_map = {
            _id: makeFakeId(),
            name: data.name,
            css_map: data.css_map
          };
          // 添加到模拟人员列表
          peopleList.push(person_map);
          callback_map.userupdate([person_map]);
        }, 3000);
      }
      // 延时2秒钟使用模拟的响应对发送的消息进行响应
      if (msg_type === 'updatechat' && callback_map.updatechat) {
        setTimeout(function () {
          var user = spa.model.people.get_user();
          callback_map.updatechat([{
            dest_id: user.id,
            dest_name: user.name,
            sender_id: data.dest_id,
            msg_text: 'Thanks for the note, ' + user.name
          }])
        }, 2000);
      }
      // 用户登出
      if (msg_type === 'leavechat') {
        // reset login status
        delete callback_map.listchange;
        delete callback_map.updatechat;
        if (listchange_idto) {
          clearTimeout(listchange_idto);
          listchange_idto = undefined;
        }
        send_listchange();
      }
      // updateavatar消息的处理程序
      if (msg_type === 'updateavatar' && callback_map.listchange) {
        // simulate receipt of 'listchange' message
        for (i = 0; i < peopleList.length; i++) {
          // 查找person对象，更改css_map属性
          if (peopleList[i]._id === data.person_id) {
            peopleList[i].css_map = data.css_map;
            break;
          }
        }
        // 执行注册了listchange消息的回调函数
        callback_map.listchange([peopleList]);
      }
    };
    // 发送模拟消息，当用户登入并设置了updatechat函数时，消息才可以发送成功
    // 听者是登录成功的人；发送者默认为‘id_04’
    // 成功后，消息就不会再次发出
    emit_mock_msg = function () {
      setTimeout(function () {
        var user = spa.model.people.get_user();
        if (callback_map.updatechat) {
          callback_map.updatechat([{
            dest_id: user.id,
            dest_name: user.name,
            sender_id: 'id_04',
            msg_text: 'Hi there ' + user.name + '! Wilma here'
          }])
        } else {
          emit_mock_msg();
        }
      }, 8000);
    };
    // Try once per second to use listchange callback
    // Stop trying after first success
    send_listchange = function () {
      listchange_idto = setTimeout(
        function () {
          if (callback_map.listchange) {
            callback_map.listchange([peopleList]);
            // 在用户登入后，开始发送模拟消息
            emit_mock_msg();
            listchange_idto = undefined;
          } else {
            send_listchange();
          }
        }, 1000);
    };
    // We have to start the process...
    send_listchange();
    return {emit: emit_sio, on: on_sio};
  }());
  return {
    // getPeopleList: getPeopleList,
    mockSio: mockSio
  };
}();